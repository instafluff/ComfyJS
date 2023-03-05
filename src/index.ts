import { parseMessage } from "./parse";
import { createWebSocket } from "./socket";
import { authenticate, joinChannel, processMessage, requestCapabilities, TwitchEventType } from "./twitch";

/*
TODO:
- pong
- parsing tags to events
- event handlers
- reconnect
- connecting to multiple channels
- connecting to many multiple channels
- websub events
- APIs / channel points things
*/

export class TwitchChat {
	#ws : WebSocket | undefined;
	#username : string;
	#password : string | undefined;
	debug : boolean;
	channels : string[];

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
	}

	#onMessage( event : MessageEvent<any> ) {
		const parts = event.data.trim().split( `\r\n` );
		for( const str of parts ) {
			const message = processMessage( parseMessage( str ) );
			if( message && message.type !== TwitchEventType.None ) {
				// Send the event to handlers
				console.log( message );
			}
		}
	}

	destroy() {
		if( this.#ws && this.#ws.readyState !== this.#ws.CLOSED ) {
			this.#ws.close();
		}
	}
}
