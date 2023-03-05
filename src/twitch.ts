import { ParsedMessage } from "./parse";

export enum TwitchEventType {
    None = "none",
    Connect = "connect",
    Reconnected = "reconnect",
    Error = "error",
    Roomstate = "roomstate",
    Userstate = "userstate",
    Join = "join",
    Part = "part",
    Message = "message",
    Whisper = "whisper",
}

export type ProcessedMessage = {
    type : TwitchEventType,
    data? : any,
};

function parseUsername( source : string | null ) {
    const parts = ( source as string ).split( "!" );
    return parts.length > 1 ? parts[ 0 ] : undefined;
}

export function processMessage( message : ParsedMessage ) : ProcessedMessage | null {
    try {
        if( message.command ) {
            const commandParts = message.command.split( " " );
            switch( commandParts[ 0 ] ) {
            case "PING":
                console.debug( "PING" );
                break;
            case "PONG":
                console.debug( "PONG" );
                break;
            case "CAP": // Capabilities Confirmation
                // console.debug( "capabilities", message.parameters );
                return null;
            case "JOIN":
                return {
                    type: TwitchEventType.Join,
                    data: {
                        channel: commandParts[ 1 ],
                        username: parseUsername( message.source ),
                    }
                }
            case "PART":
            case "NOTICE":
            case "CLEARCHAT":
            case "CLEARMSG":
            case "HOSTTARGET":
            case "USERNOTICE":
            case "WHISPER":
                console.log( "Channel:", commandParts[ 1 ], message.parameters );
                break;
            case "PRIVMSG":
                // Chat Message
                return {
                    type: TwitchEventType.Message,
                    data: {
                        ...message.tags,
                        channel: commandParts[ 1 ],
                        username: parseUsername( message.source ),
                        message: message.parameters,
                    }
                };
            case "GLOBALUSERSTATE":
                console.log( "Global User State" );
                break;
            case "USERSTATE":
                return {
                    type: TwitchEventType.Userstate,
                    data: {
                        ...message.tags,
                        channel: commandParts[ 1 ],
                        username: parseUsername( message.source ),
                    },
                };
            case "ROOMSTATE":
                return {
                    type: TwitchEventType.Roomstate,
                    data: {
                        ...message.tags,
                        channel: commandParts[ 1 ],
                    },
                };
            case "RECONNECT":  
                console.log( "The Twitch IRC server is about to terminate the connection for maintenance." )
                break;
            default:
                {
                    // Try and parse a numeric command based on RFC1459 (https://www.rfc-editor.org/rfc/rfc1459.html)
                    const commandNumber = parseInt( commandParts[ 0 ] );
                    if( commandNumber >= 400 ) {
                        console.debug( `Error IRC command: ${commandNumber}`, message );
                        return null;
                    }
                    else {
                        // Command & Reserved responses
                        switch( commandNumber ) {
                        case 1:  // Logged in (successfully authenticated). 
                            // console.debug( "Username:", commandParts[ 1 ] );
                            return null;
                        case 2: // Ignoring all other numeric messages.
                        case 3:
                        case 4:
                        case 353: // Get the names of users in the room
                        case 366: // End of names list
                        case 372: // Message Of The Day
                        case 375: // Message Of The Day Start
                            return null;
                        case 376: // End of Message Of The Day
                            return { type: TwitchEventType.Connect };
                        default:
                            console.debug( "Unsupported numeric command", commandNumber );
                            return null;
                        }
                    }
                }
                break;
            }
        }
        else {
            console.debug( "Commandless IRC message:", message.raw );
        }
    }
    catch( error ) {
        console.error( "ERROR:", error );
        return {
            type: TwitchEventType.Error,
            data: error,
        };
    }
    console.log( message );
    return null;
}

export function requestCapabilities( ws : WebSocket ) : void {
    // Request Twitch-specific Capabilities
    // TODO: consider adding twitch.tv/membership CAP to get JOIN and PART events
    ws.send( "CAP REQ :twitch.tv/tags twitch.tv/commands" );
}

export function authenticate( ws : WebSocket, username? : string, password? : string ) : void {
    const ircUsername = password ? username : `justinfan${Math.floor( ( Math.random() * 99998999 ) + 1000 )}`;
    const ircPassword = password || `INSTAFLUFF`;
    ws.send( `PASS ${ircPassword}` );
    ws.send( `NICK ${ircUsername}` );
}

export function joinChannel( ws : WebSocket, channel : string ) : void {
    ws.send( `JOIN #${channel}` );
}

export function leaveChannel( ws : WebSocket, channel : string ) : void {
    ws.send( `PART #${channel}` );
}
