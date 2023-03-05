import { ParsedMessage } from "./parse";

export function requestCapabilities( ws : WebSocket ) {
    // Request Twitch-specific Capabilities
    // TODO: consider adding twitch.tv/membership CAP to get JOIN and PART events
    ws.send( "CAP REQ :twitch.tv/tags twitch.tv/commands" );
}

export function authenticate( ws : WebSocket, username? : string, password? : string ) {
    const ircUsername = password ? username : `justinfan${Math.floor( ( Math.random() * 99998999 ) + 1000 )}`;
    const ircPassword = password || `INSTAFLUFF`;
    ws.send( `PASS ${ircPassword}` );
    ws.send( `NICK ${ircUsername}` );
}

export function joinChannel( ws : WebSocket, channel : string ) {
    ws.send( `JOIN #${channel}` );
}

export function processMessage( message : ParsedMessage ) {
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
}
