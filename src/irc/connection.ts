const _WebSocket = global.WebSocket || require( "ws" );

const channel = "instafluff";
const password = "";

const TwitchServerWSS = "wss://irc-ws.chat.twitch.tv:443";
const TwitchServerWS = "ws://irc-ws.chat.twitch.tv:80";

let ws = new _WebSocket( TwitchServerWSS, [ "irc" ] );
ws.onopen = ( event ) => {
	// Request Twitch-specific Capabilities
	ws.send( "CAP REQ :twitch.tv/tags twitch.tv/commands" );

	// If a PASS exists then send before NICK
	if( password ) {
		ws.send( `PASS ${password}` );
		ws.send( `NICK ${channel}` );
	}
	else {
		// Join anonymously
		const randomUsername = `justinfan${Math.floor( ( Math.random() * 99998999 ) + 1000 )}`;
		const randomPassword = `INSTAFLUFF`;
		ws.send( `PASS ${randomPassword}` );
		ws.send( `NICK ${randomUsername}` );

		// TODO: Join rooms after confirmation that we connected properly
		ws.send( `JOIN #${channel}` );
	}
};

ws.onmessage = ( event ) => {
	console.log( "PROCESSING:", event.data );
	const parts = event.data.trim().split( `\r\n` );

	// console.log( "message!", parts );
	for( const str of parts ) {
		const message = parseMessage( str );
		if( message.command ) {
			const commandParts = message.command?.split( " " );
			switch( commandParts[ 0 ] ) {
			case "JOIN":
			case "PART":
			case "NOTICE":
			case "CLEARCHAT":
			case "HOSTTARGET":
			case "PRIVMSG":
				// Chat Message
				console.log( "Channel:", commandParts[ 1 ], message.parameters );
				break;
			case "PING":
				break;
			case "CAP":
				console.log( "capabilities", commandParts[ 1 ] );
				break;
			case "GLOBALUSERSTATE": // Included only if you request the /commands capability.
				// But it has no meaning without also including the /tags capability.
				console.log( "Global User State" );
				break;
			case "USERSTATE":   // Included only if you request the /commands capability.
			case "ROOMSTATE":   // But it has no meaning without also including the /tags capabilities.
				console.log( "Channel:", commandParts[ 1 ], message.parameters );
				break;
			case "RECONNECT":  
				console.log( "The Twitch IRC server is about to terminate the connection for maintenance." )
				break;
			case "421":
				console.log( `Unsupported IRC command: ${commandParts[ 2 ]}` )
				return null;
			case "001":  // Logged in (successfully authenticated). 
				console.log( "Channel:", commandParts[ 1 ], message.parameters );
				break;
			case "002": // Ignoring all other numeric messages.
			case "003":
			case "004":
			case "353": // Tells you who else is in the chat room you're joining.
			case "366":
			case "372":
			case "375":
			case "376":
				console.log( `numeric message: ${commandParts[ 0 ]}` )
				break;
			default:
				console.debug( "Unsupported command", commandParts[ 0 ] );
				break;
			}
		}
		// console.log( message );
		// const msg = parser.msg(str);
		// if( msg ) {
		// 	this.handleMessage( msg );
		// }
	}
};

ws.onerror = ( event ) => {
	console.log( "ERROR", event );
};

ws.onclose = ( event ) => {
	console.log( "CLOSE", event );
};