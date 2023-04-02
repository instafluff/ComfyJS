import { parseMessage } from "./parse";
import { createWebSocket } from "./socket";
import { authenticate, joinChannel, leaveChannel, ping, pong, processMessage, replyChat, requestCapabilities, sendChat, TwitchEventType } from "./twitch";

/*
DONE:
- event handlers
- pong
- ping (send ping to the server on a timer to keep alive)
- all ComfyJS Events
	! onConnected( isFirstConnect )
		Responds when connecting to the Twitch chat.
	! onError( error )
		Hook for Errors
	! onRaid( user, viewers, extra )
		Responds to raid event
	X onJoin( user, self, extra ) - DEPRECATED
		Responds to user joining the chat
	X onPart( user, self, extra ) - DEPRECATED
		Responds to user leaving the chat
	X onHosted( user, viewers, autohost, extra ) - DEPRECATED
		Responds to channel being hosted
		Requires being authorized as the broadcaster
	! onMessageDeleted( id, extra )
		Responds to chat message deleted
	! onBan( bannedUsername, extra )
		Responds to a user being banned
	! onTimeout( timedOutUsername, durationInSeconds, extra )
		Responds to a user being timed out
- APIs / channel points things
	- Chat via IRC

TODO:
- all ComfyJS Events
	? onCommand( user, command, message, flags, extra )
		Responds to "!" commands
	? onChat( user, message, flags, self, extra )
		Responds to user chatting
	? onWhisper( user, message, flags, self, extra )
		Responds to user whisper event
	? onChatMode()
		Notifies changes to the chat room mode
	- onReward( user, reward, cost, message, extra )
		REQUIRES EXTRA PERMISSION SCOPES
		Responds to Channel Point Redemptions
	- onCheer( user, message, bits, flags, extra )
		Responds to user cheering
	- onSub( user, message, subTierInfo, extra )
		Responds to user channel subscription
	- onResub( user, message, streamMonths, cumulativeMonths, subTierInfo, extra )
		Responds to user channel subscription anniversary
	- onSubGift( gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra )
		Responds to user gift subscription
	- onSubMysteryGift( gifterUser, numbOfSubs, senderCount, subTierInfo, extra )
		Responds to user sending gift subscriptions
	- onGiftSubContinue( user, sender, extra )
		Responds to user continuing gift subscription
	- onReconnect( reconnectCount )
		Responds when attempting to reconnect to the Twitch chat.
- parsing tags to events (and parsing usernames and other context better)
- reconnect
- connecting to multiple channels
- connecting to many multiple channels
- websub events
- APIs / channel points things
	- Chat/Commands sent should also trigger the events from self
	- Whisper via API
	- Announce via API
	- Delete Message via API
	- Chat list via API
- Backwards compat wrapper for previous ComfyJS
	- onCommand( user, command, message, flags, extra )
		Responds to "!" commands
	- onChat( user, message, flags, self, extra )
		Responds to user chatting
	- onWhisper( user, message, flags, self, extra )
		Responds to user whisper event
	- onMessageDeleted( id, extra )
		Responds to chat message deleted
	- onReward( user, reward, cost, message, extra )
		REQUIRES EXTRA PERMISSION SCOPES
		Responds to Channel Point Redemptions
	- onJoin( user, self, extra )
		Responds to user joining the chat
	- onPart( user, self, extra )
		Responds to user leaving the chat
	- onHosted( user, viewers, autohost, extra )
		Responds to channel being hosted
		Requires being authorized as the broadcaster
	- onBan( bannedUsername, extra )
		Responds to a user being banned
	- onTimeout( timedOutUsername, durationInSeconds, extra )
		Responds to a user being timed out
	- onRaid( user, viewers, extra )
		Responds to raid event
	- onCheer( user, message, bits, flags, extra )
		Responds to user cheering
	- onSub( user, message, subTierInfo, extra )
		Responds to user channel subscription
	- onResub( user, message, streamMonths, cumulativeMonths, subTierInfo, extra )
		Responds to user channel subscription anniversary
	- onSubGift( gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra )
		Responds to user gift subscription
	- onSubMysteryGift( gifterUser, numbOfSubs, senderCount, subTierInfo, extra )
		Responds to user sending gift subscriptions
	- onGiftSubContinue( user, sender, extra )
		Responds to user continuing gift subscription
	- onConnected( address, port, isFirstConnect )
		Responds when connecting to the Twitch chat.
	- onReconnect( reconnectCount )
		Responds when attempting to reconnect to the Twitch chat.
	- onError( error )
		Hook for Errors
*/

export type TwitchChatHandler = ( context? : any ) => void;

export class TwitchChat {
	#ws : WebSocket | undefined;
	#username : string;
	#password : string | undefined;
	#pingTimer : ReturnType<typeof setInterval> | undefined;
	#pingTime : number = 0;
	debug : boolean;
	channels : string[];
	handlers : Partial<{ [ key in TwitchEventType ] : TwitchChatHandler | undefined }> = {
		[ TwitchEventType.None ]: undefined,
		[ TwitchEventType.Ping ]: undefined,
		[ TwitchEventType.Connect ]: undefined,
		[ TwitchEventType.Reconnected ]: undefined,
		[ TwitchEventType.Error ]: undefined,
		[ TwitchEventType.ChatMode ]: undefined,
		[ TwitchEventType.Userstate ]: undefined,
		[ TwitchEventType.Join ]: undefined,
		[ TwitchEventType.Leave ]: undefined,
		[ TwitchEventType.Command ]: undefined,
		[ TwitchEventType.Chat ]: undefined,
		[ TwitchEventType.Whisper ]: undefined,
		[ TwitchEventType.Raid ]: undefined,
		[ TwitchEventType.All ]: undefined,
	};

	constructor( username : string, password? : string, channels? : string[] | string, isDebug? : boolean ) {
		this.#username = username;
		this.#password = password;
		this.debug = !!isDebug;

		// Ensure that channels is an array
		if( typeof channels === "string" || channels instanceof String ) {
			channels = [ channels as string ];
		}
		this.channels = channels || [ username ]; // Use username as the channel to join by default

		// Connect to the server
		this.#connect();
	}

	get #mainChannel() { return this.channels[ 0 ]; }
	get #isConnected() { return this.#ws && this.#ws.readyState === this.#ws.OPEN; }
	get version() { return "@VERSION"; }

	on( eventType : TwitchEventType, handler : ( context? : any ) => void ) {
		this.handlers[ eventType ] = handler;
	}

	say( message : string, channel? : string ) : void {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

		sendChat( this.#ws, channel || this.#mainChannel, message );
	}

	reply( messageId : string, message : string, channel? : string ) : void {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

		replyChat( this.#ws, channel || this.#mainChannel, messageId, message );
	}

	join( channel : string ) : void {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

		joinChannel( this.#ws, channel );
	}

	leave( channel : string ) : void {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

		leaveChannel( this.#ws, channel );
	}

	deleteMessage( messageId : string, channel? : string ) : void {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

		// TODO: This requires an API call
		// https://dev.twitch.tv/docs/api/reference/#delete-chat-messages
	}

	#connect() {
		if( this.#isConnected ) { return; } // Already connected

		const TwitchServerWSS = "wss://irc-ws.chat.twitch.tv:443";
		// const TwitchServerWS = "ws://irc-ws.chat.twitch.tv:80";

		this.#ws = createWebSocket( TwitchServerWSS, "irc" );
		this.#ws.onopen = () => { this.#onOpen(); };
		this.#ws.onmessage = ( event ) => { this.#onMessage( event ); };
		this.#ws.onerror = ( event ) => { this.#onError( event ); };
		this.#ws.onclose = ( event ) => { this.#onClose( event ); };
	}

	#onOpen() {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

		requestCapabilities( this.#ws );
		authenticate( this.#ws, this.#username, this.#password );
		// TODO: Join rooms after confirmation that we connected properly
		joinChannel( this.#ws, this.#mainChannel );
	}

	#onError( event : Event ) {
		console.log( "ERROR", event );
	}

	#onClose( event : Event ) {
		console.log( "CLOSE", event );
		if( this.#pingTimer ) {
			clearInterval( this.#pingTimer );
		}
	}

	#ping() {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }
		this.#pingTime = Date.now();
		ping( this.#ws );
	}

	#onMessage( event : MessageEvent<any> ) {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

		const parts = event.data.trim().split( `\r\n` );
		for( const str of parts ) {
			const message = processMessage( parseMessage( str ) );
			if( message && message.type !== TwitchEventType.None ) {
				// Handle special events
				if( message.type === TwitchEventType.Connect ) {
					// Setup the keep-alive ping timer
					if( this.#pingTimer ) {
						clearInterval( this.#pingTimer );
					}
					this.#pingTimer = setInterval( () => {
						this.#ping();
					}, 60000 );
				}
				if( message.type === TwitchEventType.Ping ) {
					pong( this.#ws );
				}
				if( message.type === TwitchEventType.Pong ) {
					// Calculate and attach latency to the data
					message.data = message.data || {};
					message.data[ "latency" ] = ( Date.now() - this.#pingTime ); // Latency in milliseconds
				}
				// Send the event to handlers
				if( this.handlers[ message.type ] ) {
					this.handlers[ message.type ]!( message.data );
				}
				if( message.type === TwitchEventType.Chat ) {
					// Check if this is a reply message
					if( this.handlers[ TwitchEventType.Reply ] && message.data.extra[ "reply-parent-msg-id" ] ) {
						this.handlers[ TwitchEventType.Reply ]!( {
							...message.data,
							parentId: message.data.extra[ "reply-parent-msg-id" ],
							parentUserId: message.data.extra[ "reply-parent-user-id" ],
							parentUser: message.data.extra[ "reply-parent-user-login" ],
							parentMessage: message.data.extra[ "reply-parent-msg-body" ],
							parentDisplayName: message.data.extra[ "reply-parent-display-name" ],
						} );
					}
				}
				// Also send to the "all" event handler if it exists
				if( this.handlers[ TwitchEventType.All ] ) {
					this.handlers[ TwitchEventType.All ]!( {
						event: message.type,
						...message.data,
					} );
				}
				// console.debug( message );
			}
		}
	}

	destroy() {
		if( this.#ws && this.#ws.readyState !== this.#ws.CLOSED ) {
			this.#ws.close();
		}
	}
}
