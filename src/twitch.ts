import { ParsedMessage } from "./parse";


export enum TwitchEventType {
	None = "none",
	Ping = "Ping",
	Pong = "Pong",
	Connect = "connect",
	Reconnected = "reconnect",
	Error = "error",
	ChatMode = "roomstate",
	Userstate = "userstate",
	Join = "join",
	Leave = "leave",
	Command = "command",
	Chat = "message",
	Reply = "reply",
	Whisper = "whisper",
	Subscribe = "sub",
	Resubscribe = "resub",
	SubscribeGift = "subgift",
	SubscribeGiftAnonymous = "anonsubgift", // TODO: Confirm. This might not be called
	SubscribeGiftMystery = "submysterygift",
	SubscribeGiftMysteryAnonymous = "anonsubmysterygift", // TODO: Confirm. This might not be called
	Raid = "raid",
	Timeout = "Timeout",
	Ban = "Ban",
	MessageDeleted = "MessageDeleted",
	All = "all",
};

export type ProcessedMessage = {
    type : TwitchEventType,
    data? : any,
	extra? : any,
};

function parseUsername( source : string | null ) {
	const parts = ( source as string ).split( "!" );
	return parts.length > 1 ? parts[ 0 ] : undefined;
}

export function processMessage( message : ParsedMessage ) : ProcessedMessage | null {
	try {
		if( message.command ) {
			const commandParts = message.command.split( " " );
			const channel = commandParts[ 1 ];
			switch( commandParts[ 0 ] ) {
			case "PING":
				return { type: TwitchEventType.Ping	};
			case "PONG":
				return { type: TwitchEventType.Pong	};
			case "CAP": // Capabilities Confirmation
				// console.debug( "capabilities", message.parameters );
				return null;
			case "JOIN":
				return {
					type: TwitchEventType.Join,
					data: { channel, username: parseUsername( message.source ) },
				}
			case "PART":
				return {
					type: TwitchEventType.Leave,
					data: { channel, username: parseUsername( message.source ) },
				}
			case "ROOMSTATE":
				// TODO: Save ChatMode for the room at the first message and then diff the notifications afterwards
				//      e.g. emoteOnly & followersOnly are both sent in the initial message but then enabling/disabling emoteOnly doesn't send the followersOnly mode flag
				console.log( message );
				return {
					type: TwitchEventType.ChatMode,
					data: {
						emoteOnly: message.tags[ "emote-only" ] ? message.tags[ "emote-only" ] !== "0" : false,
						followersOnly: message.tags[ "followers-only" ] ? message.tags[ "followers-only" ] !== "-1" : false,
						...message.tags,
						channel: commandParts[ 1 ],
					},
				};
			case "GLOBALUSERSTATE":
				console.log( "Global User State" );
				break;
			case "USERSTATE":
				console.log( message );
				switch( message.tags[ "msg-id" ] ) {
				default:
					return {
						type: TwitchEventType.Userstate,
						data: {
							...message.tags,
							channel: commandParts[ 1 ],
							username: parseUsername( message.source ),
							extra: message.tags,
						},
					};
				}
			case "HOSTTARGET":
			case "USERNOTICE":
				switch( message.tags[ "msg-id" ] ) {
				case "sub":
					return {
						type: TwitchEventType.Subscribe,
						data: {
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							months: parseInt( message.tags[ "msg-param-months" ] ),
							multiMonthDuration: parseInt( message.tags[ "msg-param-multimonth-duration" ] ),
							multiMonthTenure: parseInt( message.tags[ "msg-param-multimonth-tenure" ] ),
							shouldShareStreak: message.tags[ "msg-param-should-share-streak" ] === "1",
							subPlan: message.tags[ "msg-param-sub-plan" ],
							wasGifted: message.tags[ "msg-param-was-gifted" ] === "true",
							goalContributionType: message.tags[ "msg-param-goal-contribution-type" ],
							goalCurrentContributions: message.tags[ "msg-param-goal-current-contributions" ],
							goalDescription: message.tags[ "msg-param-goal-description" ],
							goalTargetContributions: message.tags[ "msg-param-goal-target-contributions" ],
							goalUserContributions: message.tags[ "msg-param-goal-user-contributions" ],
							channel: commandParts[ 1 ],
							username: message.tags[ "login" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "resub":
					return {
						type: TwitchEventType.Resubscribe,
						data: {
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							cumulativeMonths: parseInt( message.tags[ "msg-param-cumulative-months" ] ),
							months: parseInt( message.tags[ "msg-param-months" ] ),
							multiMonthDuration: parseInt( message.tags[ "msg-param-multimonth-duration" ] ),
							multiMonthTenure: parseInt( message.tags[ "msg-param-multimonth-tenure" ] ),
							streakMonths: parseInt( message.tags[ "msg-param-streak-months" ] ),
							shouldShareStreak: message.tags[ "msg-param-should-share-streak" ] === "1",
							subPlan: message.tags[ "msg-param-sub-plan" ],
							wasGifted: message.tags[ "msg-param-was-gifted" ] === "true",
							channel: commandParts[ 1 ],
							username: message.tags[ "login" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "raid":
					// TODO: Should User be displayName || username || login?
					return {
						type: TwitchEventType.Raid,
						data: {
							profileImageURL: message.tags[ "msg-param-profileImageURL" ],
							displayName: message.tags[ "msg-param-displayName" ] || message.tags[ "display-name" ] || message.tags[ "msg-param-login" ] || message.tags[ "login" ],
							viewers: parseInt( message.tags[ "msg-param-viewerCount" ] ),
							channel: commandParts[ 1 ],
							username: message.tags[ "msg-param-login" ] || message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				default:
					console.log( "TODO IMPLEMENT COMMAND", message );
					break;
				}
				break;
			case "WHISPER":
				// TODO: Check for OAuth password and scope for reading whispers
				console.log( message );
				console.log( "Channel:", commandParts[ 1 ], message.parameters );
				return {
					type: TwitchEventType.Whisper,
					data: {
						...message.tags,
						channel: commandParts[ 1 ],
						username: parseUsername( message.source ),
						message: message.parameters,
					},
				};
			case "NOTICE":
				console.log( "NOTICE!!!", message );
				break;
			case "CLEARCHAT":
				// Chat Cleared, User Timeout/Ban
				if( message.tags[ "target-user-id" ] ) {
					if( message.tags[ "ban-duration" ] ) {
						return {
							type: TwitchEventType.Timeout,
							data: {
								...message.tags,
								channel: commandParts[ 1 ],
								username: message.parameters,
								userId: message.tags[ "target-user-id" ],
								timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
								extra: message.tags,
							},
						};
					}
					else {
						return {
							type: TwitchEventType.Ban,
							data: {
								...message.tags,
								channel: commandParts[ 1 ],
								username: message.parameters,
								userId: message.tags[ "target-user-id" ],
								timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
								extra: message.tags,
							},
						};
					}
				}
				else {
					// TODO: Handle Chat Cleared
				}
				break;
			case "CLEARMSG":
				// Message Deleted
				return {
					type: TwitchEventType.MessageDeleted,
					data: {
						...message.tags,
						channel: commandParts[ 1 ],
						displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
						username: message.tags[ "login" ],
						message: message.parameters,
						extra: message.tags,
					},
				};
			case "PRIVMSG":
				// Chat Message
				if( message.parameters?.startsWith( "!" ) ) {
					const msgParts = message.parameters.split( / (.*)/ );
					const command = msgParts[ 0 ].substring( 1 ).toLowerCase();
					const msg = msgParts[ 1 ] || "";
					return {
						type: TwitchEventType.Command,
						data: {
							channel: commandParts[ 1 ],
							username: parseUsername( message.source ),
							command: command,
							message: msg,
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					}
				}
				else {					
					// Replace dash to camelCase
					// const tagKey = parts[ 0 ].replace( /(\-[a-z])/g, val => val.toUpperCase().replace( "-", "" ) );
					return {
						type: TwitchEventType.Chat,
						data: {
							channel: commandParts[ 1 ],
							username: parseUsername( message.source ),
							message: message.parameters,
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				}
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

export function ping( ws : WebSocket ) : void {
	ws.send( `PING` );
}

export function pong( ws : WebSocket ) : void {
	ws.send( `PONG` );
}

export function sendChat( ws : WebSocket, channel : string, message : string ) : void {
	// Note: If we want to send tags like client-nonce, then the chat message should look like
	//       @client-nonce=asdf;reply-parent-msg-id PRIVMSG #channel :message text here
	ws.send( `PRIVMSG #${channel} :${message}` );
}

export function replyChat( ws : WebSocket, channel : string, messageId : string, message : string ) : void {
	// console.debug( `@reply-parent-msg-id=${messageId} PRIVMSG #${channel} :${message}` );
	ws.send( `@reply-parent-msg-id=${messageId} PRIVMSG #${channel} :${message}` );
}
