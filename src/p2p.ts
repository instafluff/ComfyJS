// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - P2P Coordination via localStorage + WebRTC
// ═══════════════════════════════════════════════════════════════════════════
//
// Solves the multi-instance problem for OBS browser sources:
// - Uses localStorage for WebRTC signaling (shared across OBS sources)
// - Only the leader maintains the EventSub connection
// - Followers connect via WebRTC DataChannel to receive events
// - No external server required!
//
// ═══════════════════════════════════════════════════════════════════════════

import type { EventSubNotification } from './eventsub';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'comfyjs_';
const LEADER_TIMEOUT_MS = 10000; // Consider leader dead after 10s no heartbeat
const HEARTBEAT_INTERVAL_MS = 3000; // Leader heartbeat every 3s
const POLL_INTERVAL_MS = 500; // Poll localStorage every 500ms
const ELECTION_DELAY_MAX_MS = 500; // Random delay to avoid race conditions
const ELECTION_CONFIRM_MS = 150; // Re-read delay to settle a contested claim

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type P2PRole = 'leader' | 'follower' | 'standalone';

export interface P2PCoordinatorOptions {
  debug?: boolean;
  channel: string; // Twitch channel (used to namespace storage)
}

interface LeaderEntry {
  id: string;
  channel: string;
  timestamp: number;
}

interface PeerEntry {
  id: string;
  leaderId: string;
  timestamp: number;
  answer?: string; // JSON stringified RTCSessionDescriptionInit
  followerIce: string[]; // JSON stringified RTCIceCandidateInit[]
}

// The leader's half of the handshake lives in its own key. Leader and follower
// each write only the key they own; when both wrote the same entry the 500ms
// polls raced and silently dropped offers, answers and ICE candidates.
interface OfferEntry {
  leaderId: string;
  timestamp: number;
  offer?: string; // JSON stringified RTCSessionDescriptionInit
  leaderIce: string[]; // JSON stringified RTCIceCandidateInit[]
}

// ─────────────────────────────────────────────────────────────────────────────
// P2P Coordinator Class
// ─────────────────────────────────────────────────────────────────────────────

export class P2PCoordinator {
  private instanceId: string;
  private role: P2PRole = 'standalone';
  private channel: string;
  private options: P2PCoordinatorOptions;
  
  // WebRTC connections
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  
  // Leader tracking
  private currentLeaderId: string | null = null;
  
  // Timers
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  
  // Track which peers we've started connecting to
  private connectingPeers: Set<string> = new Set();

  // True while an election is in flight
  private electing = false;

  // ICE candidates already handed to each peer connection
  private appliedIce: Map<string, Set<string>> = new Map();

  private unloadListener: (() => void) | null = null;
  
  // Event handlers
  public onEvent: ((event: EventSubNotification) => void) | null = null;
  public onRoleChange: ((role: P2PRole) => void) | null = null;
  public onFollowerConnected: ((instanceId: string) => void) | null = null;
  public onFollowerDisconnected: ((instanceId: string) => void) | null = null;
  public onAppMessage: ((payload: unknown, fromId: string) => void) | null = null;

  constructor(options: P2PCoordinatorOptions) {
    this.instanceId = this.generateInstanceId();
    this.options = options;
    this.channel = options.channel.toLowerCase().replace('#', '');
    this.log(`Instance ID: ${this.instanceId}, Channel: ${this.channel}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Storage Key Helpers (channel-namespaced)
  // ─────────────────────────────────────────────────────────────────────────

  private get leaderKey(): string {
    return `${STORAGE_PREFIX}leader_${this.channel}`;
  }

  private get peerPrefix(): string {
    return `${STORAGE_PREFIX}peer_${this.channel}_`;
  }

  private peerKey(peerId: string): string {
    return `${this.peerPrefix}${peerId}`;
  }

  private get offerPrefix(): string {
    return `${STORAGE_PREFIX}offer_${this.channel}_`;
  }

  private offerKey(peerId: string): string {
    return `${this.offerPrefix}${peerId}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────

  async initialize(): Promise<P2PRole> {
    // Check if localStorage is available
    if (!this.isLocalStorageAvailable()) {
      this.log('localStorage not available, running standalone');
      this.role = 'standalone';
      return this.role;
    }

    // Clean up any stale entries first
    this.cleanupStaleEntries();
    this.registerUnloadHandler();

    // Check for existing leader for our channel
    const leader = this.getLeader();
    
    if (leader && leader.channel === this.channel && this.isLeaderAlive(leader)) {
      // Leader exists and is alive, become follower
      this.log(`Found existing leader: ${leader.id}`);
      await this.becomeFollower(leader);
    } else {
      // No leader or leader is dead, try to become leader
      this.log('No active leader found, attempting to become leader');
      await this.tryBecomeLeader();
    }
    
    // Start polling for changes
    this.startPolling();
    
    return this.role;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Leader Election
  // ─────────────────────────────────────────────────────────────────────────

  private async tryBecomeLeader(): Promise<void> {
    // The 500ms poll keeps firing while we wait below, so without this guard a
    // single dead leader triggers several overlapping elections.
    if (this.electing) return;
    this.electing = true;
    try {
      await this.runElection();
    } finally {
      this.electing = false;
    }
  }

  private async runElection(): Promise<void> {
    // Add small random delay to avoid race conditions when multiple instances start simultaneously
    await this.delay(Math.random() * ELECTION_DELAY_MAX_MS);
    
    // Check again - maybe someone else became leader during our delay
    const leader = this.getLeader();
    if (leader && leader.channel === this.channel && this.isLeaderAlive(leader)) {
      this.log(`Another instance became leader during election: ${leader.id}`);
      await this.becomeFollower(leader);
      return;
    }
    
    // Write leader entry to localStorage
    const leaderEntry: LeaderEntry = {
      id: this.instanceId,
      channel: this.channel,
      timestamp: Date.now(),
    };
    
    this.setStorageItem(this.leaderKey, leaderEntry);

    // Two sources can pass the check above at the same time and both write.
    // Last write wins, so read it back and only take the role if it is ours —
    // otherwise both would open an EventSub connection and hit Twitch's
    // per-type subscription limit.
    await this.delay(ELECTION_CONFIRM_MS);
    const confirmed = this.getLeader();
    if (confirmed && confirmed.id !== this.instanceId) {
      this.log(`Lost election to ${confirmed.id}`);
      await this.becomeFollower(confirmed);
      return;
    }

    this.role = 'leader';
    this.currentLeaderId = this.instanceId;
    this.log('Became leader');
    
    // Start heartbeat to keep leader entry fresh
    this.startHeartbeat();
    
    this.onRoleChange?.('leader');
  }

  private async becomeFollower(leader: LeaderEntry): Promise<void> {
    this.role = 'follower';
    this.currentLeaderId = leader.id;
    this.appliedIce.clear();
    this.log(`Becoming follower of ${leader.id}`);
    
    // Create our peer entry
    const peerEntry: PeerEntry = {
      id: this.instanceId,
      leaderId: leader.id,
      timestamp: Date.now(),
      followerIce: [],
    };
    
    this.setStorageItem(this.peerKey(this.instanceId), peerEntry);
    
    this.onRoleChange?.('follower');
    
    // Leader will see our peer entry and initiate the WebRTC connection
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Polling
  // ─────────────────────────────────────────────────────────────────────────

  private startPolling(): void {
    this.stopPolling();
    
    this.pollTimer = setInterval(() => {
      try {
        if (this.role === 'leader') {
          this.leaderPoll();
        } else if (this.role === 'follower') {
          this.followerPoll();
        }
      } catch (e) {
        this.log(`Poll error: ${e}`);
      }
    }, POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private leaderPoll(): void {
    // Look for peer entries that want to connect to us
    const peers = this.getAllPeerEntries();
    
    for (const peer of peers) {
      if (peer.leaderId !== this.instanceId) continue;
      if (this.connectingPeers.has(peer.id)) continue;
      
      // New peer wants to connect, initiate WebRTC
      this.log(`New peer found: ${peer.id}`);
      this.connectingPeers.add(peer.id);
      this.initiateConnectionToPeer(peer.id);
    }
    
    // Process any answers from peers
    for (const peer of peers) {
      if (peer.leaderId !== this.instanceId) continue;
      if (!peer.answer) continue;
      
      const pc = this.peerConnections.get(peer.id);
      if (pc && pc.remoteDescription === null) {
        this.handlePeerAnswer(peer);
      }
    }
    
    // Process ICE candidates from peers
    for (const peer of peers) {
      if (peer.leaderId !== this.instanceId) continue;
      this.processFollowerIceCandidates(peer);
    }
  }

  private followerPoll(): void {
    // Check if leader is still alive
    const leader = this.getLeader();
    
    if (!leader || leader.channel !== this.channel || !this.isLeaderAlive(leader)) {
      this.log('Leader is gone, attempting to become new leader');
      this.promoteToLeader();
      return;
    }
    
    // Check if leader changed
    if (leader.id !== this.currentLeaderId) {
      this.log(`Leader changed from ${this.currentLeaderId} to ${leader.id}`);
      this.closeAllConnections();
      this.becomeFollower(leader);
      return;
    }

    // Keep our entry fresh so the leader does not treat us as stale
    this.touchOwnPeerEntry();

    // Check for offer from leader
    const offerEntry = this.getStorageItem<OfferEntry>(this.offerKey(this.instanceId));
    if (!offerEntry || offerEntry.leaderId !== leader.id) return;

    const myEntry = this.getStorageItem<PeerEntry>(this.peerKey(this.instanceId));
    if (offerEntry.offer && myEntry && !myEntry.answer) {
      this.handleLeaderOffer(offerEntry);
    }
    
    // Process ICE candidates from leader
    this.processLeaderIceCandidates(offerEntry);
  }

  private touchOwnPeerEntry(): void {
    const entry = this.getStorageItem<PeerEntry>(this.peerKey(this.instanceId));
    if (!entry) return;
    entry.timestamp = Date.now();
    this.setStorageItem(this.peerKey(this.instanceId), entry);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WebRTC - Leader Side
  // ─────────────────────────────────────────────────────────────────────────

  private async initiateConnectionToPeer(peerId: string): Promise<void> {
    this.log(`Initiating connection to peer: ${peerId}`);
    
    const pc = this.createPeerConnection(peerId);
    
    // Create data channel
    const dc = pc.createDataChannel('comfyjs-events', { ordered: true });
    this.setupDataChannel(dc, peerId);
    
    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Written to the leader-owned key so the follower's writes cannot clobber it
    this.setStorageItem(this.offerKey(peerId), {
      leaderId: this.instanceId,
      timestamp: Date.now(),
      offer: JSON.stringify(offer),
      leaderIce: [],
    } as OfferEntry);
    this.log(`Wrote offer for ${peerId}`);
  }

  private async handlePeerAnswer(peer: PeerEntry): Promise<void> {
    const pc = this.peerConnections.get(peer.id);
    if (!pc || !peer.answer) return;
    
    try {
      const answer = JSON.parse(peer.answer) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);
      this.log(`Set remote description from ${peer.id}`);
    } catch (e) {
      this.log(`Error handling answer from ${peer.id}: ${e}`);
    }
  }

  private processFollowerIceCandidates(peer: PeerEntry): void {
    const pc = this.peerConnections.get(peer.id);
    if (!pc || pc.remoteDescription === null) return;
    
    for (const candidateJson of peer.followerIce) {
      if (!this.markIceApplied(peer.id, candidateJson)) continue;
      try {
        const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit;
        pc.addIceCandidate(candidate).catch(() => {});
      } catch {
        // Ignore parse errors
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WebRTC - Follower Side
  // ─────────────────────────────────────────────────────────────────────────

  private async handleLeaderOffer(offerEntry: OfferEntry): Promise<void> {
    if (!offerEntry.offer || !this.currentLeaderId) return;
    
    this.log('Received offer from leader');
    
    const pc = this.createPeerConnection(this.currentLeaderId);
    
    try {
      const offer = JSON.parse(offerEntry.offer) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Write the answer into our own entry, never the leader's
      const myEntry = this.getStorageItem<PeerEntry>(this.peerKey(this.instanceId));
      if (myEntry) {
        myEntry.answer = JSON.stringify(answer);
        myEntry.timestamp = Date.now();
        this.setStorageItem(this.peerKey(this.instanceId), myEntry);
        this.log('Wrote answer to localStorage');
      }
    } catch (e) {
      this.log(`Error handling offer: ${e}`);
    }
  }

  private processLeaderIceCandidates(offerEntry: OfferEntry): void {
    if (!this.currentLeaderId) return;
    
    const pc = this.peerConnections.get(this.currentLeaderId);
    if (!pc || pc.remoteDescription === null) return;
    
    for (const candidateJson of offerEntry.leaderIce) {
      if (!this.markIceApplied(this.currentLeaderId, candidateJson)) continue;
      try {
        const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit;
        pc.addIceCandidate(candidate).catch(() => {});
      } catch {
        // Ignore parse errors
      }
    }
  }

  /** Returns true the first time a candidate is seen for a peer. */
  private markIceApplied(peerId: string, candidateJson: string): boolean {
    let applied = this.appliedIce.get(peerId);
    if (!applied) {
      applied = new Set();
      this.appliedIce.set(peerId, applied);
    }
    if (applied.has(candidateJson)) return false;
    applied.add(candidateJson);
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WebRTC Common
  // ─────────────────────────────────────────────────────────────────────────

  private createPeerConnection(peerId: string): RTCPeerConnection {
    // Close existing connection if any
    const existing = this.peerConnections.get(peerId);
    if (existing) {
      existing.close();
    }
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.addIceCandidateToStorage(peerId, event.candidate.toJSON());
      }
    };
    
    pc.ondatachannel = (event) => {
      this.log(`Received data channel from ${peerId}`);
      this.setupDataChannel(event.channel, peerId);
    };
    
    pc.onconnectionstatechange = () => {
      this.log(`Connection to ${peerId}: ${pc.connectionState}`);
      
      if (pc.connectionState === 'connected') {
        this.log(`Successfully connected to ${peerId}`);
        if (this.role === 'leader') {
          this.onFollowerConnected?.(peerId);
        }
      }
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
        this.cleanupPeer(peerId);
        
        // If we're a follower and lost connection to leader, try to become leader
        if (this.role === 'follower' && peerId === this.currentLeaderId) {
          this.log('Lost connection to leader');
          this.promoteToLeader();
        }
      }
    };
    
    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private addIceCandidateToStorage(peerId: string, candidate: RTCIceCandidateInit): void {
    const candidateJson = JSON.stringify(candidate);
    
    if (this.role === 'leader') {
      const offerEntry = this.getStorageItem<OfferEntry>(this.offerKey(peerId));
      if (offerEntry && !offerEntry.leaderIce.includes(candidateJson)) {
        offerEntry.leaderIce.push(candidateJson);
        offerEntry.timestamp = Date.now();
        this.setStorageItem(this.offerKey(peerId), offerEntry);
      }
    } else {
      const myEntry = this.getStorageItem<PeerEntry>(this.peerKey(this.instanceId));
      if (myEntry && !myEntry.followerIce.includes(candidateJson)) {
        myEntry.followerIce.push(candidateJson);
        myEntry.timestamp = Date.now();
        this.setStorageItem(this.peerKey(this.instanceId), myEntry);
      }
    }
  }

  private setupDataChannel(dc: RTCDataChannel, peerId: string): void {
    dc.onopen = () => {
      this.log(`DataChannel to ${peerId} opened`);
      this.dataChannels.set(peerId, dc);
    };
    
    dc.onclose = () => {
      this.log(`DataChannel to ${peerId} closed`);
      this.dataChannels.delete(peerId);
    };
    
    dc.onerror = (e) => {
      this.log(`DataChannel error with ${peerId}: ${e}`);
    };
    
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'event') {
          this.onEvent?.(data.event as EventSubNotification);
        }
        else if (data.type === 'app') {
          const from = (data.from as string) || peerId;
          this.onAppMessage?.(data.payload, from);
          // The leader is the hub, so pass it on to the other followers
          if (this.role === 'leader') {
            this.sendToChannels(JSON.stringify(data), peerId);
          }
        }
      } catch {
        this.log('Failed to parse DataChannel message');
      }
    };
  }

  private cleanupPeer(peerId: string): void {
    const dc = this.dataChannels.get(peerId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(peerId);
    }
    
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    
    this.connectingPeers.delete(peerId);
    this.appliedIce.delete(peerId);
    
    if (this.role === 'leader') {
      this.onFollowerDisconnected?.(peerId);
    }
  }

  private closeAllConnections(): void {
    for (const [id] of this.peerConnections) {
      this.cleanupPeer(id);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Leader Promotion
  // ─────────────────────────────────────────────────────────────────────────

  private async promoteToLeader(): Promise<void> {
    this.log('Promoting to leader');
    
    // Close existing connections
    this.closeAllConnections();
    
    // Clean up our old peer entry and the dead leader's offer to us
    this.removeStorageItem(this.peerKey(this.instanceId));
    this.removeStorageItem(this.offerKey(this.instanceId));
    
    // Reset state
    this.connectingPeers.clear();
    this.appliedIce.clear();
    this.currentLeaderId = null;
    
    // Try to become leader
    await this.tryBecomeLeader();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Heartbeat
  // ─────────────────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.role === 'leader') {
        const leader = this.getLeader();
        if (leader && leader.id === this.instanceId) {
          leader.timestamp = Date.now();
          this.setStorageItem(this.leaderKey, leader);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private isLeaderAlive(leader: LeaderEntry): boolean {
    return Date.now() - leader.timestamp < LEADER_TIMEOUT_MS;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Broadcasting (Leader only)
  // ─────────────────────────────────────────────────────────────────────────

  broadcastEvent(event: EventSubNotification): void {
    if (this.role !== 'leader') return;
    
    const message = JSON.stringify({ type: 'event', event });
    
    for (const [peerId, dc] of this.dataChannels) {
      if (dc.readyState === 'open') {
        try {
          dc.send(message);
        } catch (e) {
          this.log(`Failed to send to ${peerId}: ${e}`);
        }
      }
    }
  }

  /**
   * Send an application-level message to the other browser sources. Followers
   * send to the leader, which relays it on to everyone else.
   */
  sendAppMessage(payload: unknown): void {
    this.sendToChannels(JSON.stringify({ type: 'app', from: this.instanceId, payload }));
  }

  private sendToChannels(message: string, exceptPeerId?: string): void {
    for (const [peerId, dc] of this.dataChannels) {
      if (peerId === exceptPeerId) continue;
      if (dc.readyState !== 'open') continue;
      try {
        dc.send(message);
      } catch (e) {
        this.log(`Failed to send to ${peerId}: ${e}`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // localStorage Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__comfyjs_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getStorageItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private setStorageItem(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      this.log(`Failed to write to localStorage: ${e}`);
    }
  }

  private removeStorageItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }

  private getLeader(): LeaderEntry | null {
    return this.getStorageItem<LeaderEntry>(this.leaderKey);
  }

  private getAllPeerEntries(): PeerEntry[] {
    const peers: PeerEntry[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.peerPrefix)) continue;
      
      const peer = this.getStorageItem<PeerEntry>(key);
      if (peer) {
        peers.push(peer);
      }
    }
    
    return peers;
  }

  private cleanupStaleEntries(): void {
    const now = Date.now();
    
    // Clean up dead leader
    const leader = this.getLeader();
    if (leader && !this.isLeaderAlive(leader)) {
      this.log('Cleaning up dead leader entry');
      this.removeStorageItem(this.leaderKey);
    }
    
    // Clean up stale peer and offer entries
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(this.peerPrefix)) {
        const peer = this.getStorageItem<PeerEntry>(key);
        if (peer && now - peer.timestamp > LEADER_TIMEOUT_MS * 3) {
          this.log(`Cleaning up stale peer: ${peer.id}`);
          this.removeStorageItem(key);
        }
      }
      else if (key.startsWith(this.offerPrefix)) {
        const offer = this.getStorageItem<OfferEntry>(key);
        if (offer && now - offer.timestamp > LEADER_TIMEOUT_MS * 3) {
          this.removeStorageItem(key);
        }
      }
    }
  }

  private registerUnloadHandler(): void {
    if (typeof window === 'undefined') return;
    // OBS tears down browser sources on scene changes. Releasing the lock here
    // lets a sibling take over right away instead of waiting out the timeout.
    this.unloadListener = () => {
      const leader = this.getLeader();
      if (this.role === 'leader' && leader && leader.id === this.instanceId) {
        this.removeStorageItem(this.leaderKey);
      }
      this.removeStorageItem(this.peerKey(this.instanceId));
    };
    window.addEventListener('pagehide', this.unloadListener);
    window.addEventListener('beforeunload', this.unloadListener);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  get currentRole(): P2PRole {
    return this.role;
  }

  get isLeader(): boolean {
    return this.role === 'leader';
  }

  get followerCount(): number {
    return this.dataChannels.size;
  }

  get id(): string {
    return this.instanceId;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────

  destroy(): void {
    this.log('Destroying P2P coordinator');
    
    this.stopHeartbeat();
    this.stopPolling();
    this.closeAllConnections();

    if (this.unloadListener && typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.unloadListener);
      window.removeEventListener('beforeunload', this.unloadListener);
      this.unloadListener = null;
    }
    this.appliedIce.clear();
    
    // Clean up our entries from localStorage
    if (this.role === 'leader') {
      this.removeStorageItem(this.leaderKey);
      for (const peerId of this.connectingPeers) {
        this.removeStorageItem(this.offerKey(peerId));
      }
    }
    this.removeStorageItem(this.peerKey(this.instanceId));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  private generateInstanceId(): string {
    return 'cjs_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now().toString(36);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(msg: string): void {
    if (this.options.debug) {
      console.log(`[P2P ${this.instanceId.slice(-8)}] ${msg}`);
    }
  }
}
