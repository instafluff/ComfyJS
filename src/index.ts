import { parseMessage } from "./parse";
import { createWebSocket } from "./socket";
import { authenticate, joinChannel, leaveChannel, ping, pong, ProcessedMessage, processMessage, replyChat, requestCapabilities, sendChat, TwitchEventType } from "./twitch";

export type TwitchChatHandler = ( context? : any ) => void;
export type TwitchChatMode = {
	emoteOnly : boolean;
	followersOnly : boolean;
	subscribersOnly : boolean;
	r9k : boolean; // Unique Chat Mode
	slow : boolean;
	language : string;
};

export class TwitchChat {
	#ws : WebSocket | undefined;
	#username : string;
	#password : string | undefined;
	#pingTimer : ReturnType<typeof setInterval> | undefined;
	#pingTime : number = 0;
	debug : boolean;
	channels : string[];
	chatModes : { [ channel : string ] : TwitchChatMode } = {};
	handlers : Partial<{ [ key in TwitchEventType ] : TwitchChatHandler | undefined }> = {};

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

	#handleSpecialEvents( message : ProcessedMessage ) {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

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
		if( message.type === TwitchEventType.RoomState ) {
			// Save ChatMode for the room at the first message and then diff the notifications afterwards
			// e.g. emoteOnly & followersOnly are both sent in the initial message but then enabling/disabling emoteOnly doesn't send the followersOnly mode flag
			this.chatModes[ message.data.channel ] = {
				...this.chatModes[ message.data.channel ],
				...message.data,
			};
			if( this.handlers[ TwitchEventType.ChatMode ] ) {
				this.handlers[ TwitchEventType.ChatMode ]!( this.chatModes[ message.data.channel ] );
			}
		}
		// if( message.type === TwitchEventType.Reconnect ) {
		// 	this.#connect();
		// }
		// if( message.type === TwitchEventType.Join ) {
		// 	if( message.channel ) {
		// 		this.channels.push( message.channel );
		// 	}
		// }
		
		// If it's a chat message and it has a reply-parent-msg-id, then it's a reply. Handle it as a reply.
		if( message.type === TwitchEventType.Chat ) {
			// Check if this is a reply message
			if( this.handlers[ TwitchEventType.Reply ] && message.data.extra[ "reply-parent-msg-id" ] ) {
				this.handlers[ TwitchEventType.Reply ]!( {
					...message.data,
					parentId: message.data.extra[ "reply-parent-msg-id" ],
					parentUserId: message.data.extra[ "reply-parent-user-id" ],
					parentUser: message.data.extra[ "reply-parent-user-login" ],
					parentMessage: message.data.extra[ "reply-parent-msg-body" ],
					parentDisplayName: message.data.extra[ "reply-parent-display-name" ] || message.data.extra[ "reply-parent-user-login" ],
				} );
			}
		}
	}

	#onMessage( event : MessageEvent<any> ) {
		if( !this.#ws ) { return; }
		if( !this.#isConnected ) { return; }

		const parts = event.data.trim().split( `\r\n` );
		for( const str of parts ) {
			const message = processMessage( parseMessage( str ) );
			if( message && message.type !== TwitchEventType.None ) {
				// Handle special events
				this.#handleSpecialEvents( message );

				// Send the event to handlers
				if( this.handlers[ message.type ] ) {
					this.handlers[ message.type ]!( message.data );
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
