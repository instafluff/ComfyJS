function extractComponent( message : string, index : number ) : { component : string, nextIndex : number } {
	const nextSpace = message.indexOf( " ", index );
	const rawComponent = message.slice( index + 1, nextSpace );
	return {
		component: rawComponent,
		nextIndex: nextSpace + 1,
	};
}

export type ParsedMessage = {
	raw : string,
	tags : { [ name : string ] : string },
	source : string | null,
	command : string | null,
	parameters : string | null,
};

// --- Message parsing based on the IRC v3.2 spec (https://ircv3.net/irc/) ---
export function parseMessage( message : string ) : ParsedMessage {
	let parsedMessage : ParsedMessage = {
		raw: message,
		tags: {},
		source: null,
		command: null,
		parameters: null,
	};

	/*
According to IRC v3.2 spec (https://ircv3.net/specs/extensions/message-tags) the messages are formatted as follows:

<message>       ::= ['@' <tags> <SPACE>] [':' <prefix> <SPACE> ] <command> [params] <crlf>
<tags>          ::= <tag> [';' <tag>]*
<tag>           ::= <key> ['=' <escaped_value>]
<key>           ::= [ <client_prefix> ] [ <vendor> '/' ] <key_name>
<client_prefix> ::= '+'
<key_name>      ::= <non-empty sequence of ascii letters, digits, hyphens ('-')>
<escaped_value> ::= <sequence of zero or more utf8 characters except NUL, CR, LF, semicolon (`;`) and SPACE>
<vendor>        ::= <host>
	*/

	let index = 0;

	// --- Tags Parsing ---
	// Check for tags at the beginning of the IRC message indicated by @
	// e.g. @emote-only=0;followers-only=-1;r9k=0;room-id=83118047;slow=0;subs-only=0 :tmi.twitch.tv ROOMSTATE #instafluff
	// The above has tags and then the normal messages start after a space
	if( message.charAt( 0 ) === "@" ) {
		// console.debug( "This message contains tags" );
		const { component, nextIndex } = extractComponent( message, 0 );
		for( const tag of component.split( ";" ) ) {
			const parts = tag.split( "=" );
			parsedMessage.tags[ parts[ 0 ] ] = parts[ 1 ];
		}
		index = nextIndex; // Should now point to source colon (:).
	}

	// --- Source Parsing ---
	// Get the source component (nick and host) of the IRC message.
	// The idx should point to the source part; otherwise, it's a PING command.
	if( message.charAt( index ) === ":" ) {
		// console.debug( "This message has a source component" );
		const { component, nextIndex } = extractComponent( message, index );
		parsedMessage.source = component;
		index = nextIndex; // Should point to the command part of the message.
	}

	// --- Command Parsing ---
	// Get the remainder of the IRC message as a command
	if( index < message.length ) {
		// console.debug( "This message has a command component" );
		const rawCommand = message.slice( index ).trim();
		const commandEnd = rawCommand.indexOf( ":" );
		parsedMessage.command = rawCommand.slice( 0, commandEnd < 0 ? undefined : commandEnd ).trim();
		
		// Parse the parameters
		const parameterIndex = message.indexOf( ":", index );
		if( parameterIndex >= 0 ) {
			// console.debug( "This message has command parameters" );
			parsedMessage.parameters = message.slice( parameterIndex + 1 );
		}
	}

	return parsedMessage;
}

// // Parses the tags component of the IRC message.

// function parseTags( tags ) {
// 	// badge-info=;badges=broadcaster/1;color=#0000FF;...

// 	const tagsToIgnore = {  // List of tags to ignore.
// 		"client-nonce": null,
// 		"flags": null,
// 	};

// 	let dictParsedTags = {};  // Holds the parsed list of tags.
// 	// The key is the tag's name (e.g., color).
// 	let parsedTags = tags.split( ";" ); 

// 	parsedTags.forEach( tag => {
// 		let parsedTag = tag.split( "=" );  // Tags are key/value pairs.
// 		let tagValue = ( parsedTag[ 1 ] === "" ) ? null : parsedTag[ 1 ];

// 		switch( parsedTag[ 0 ] ) {  // Switch on tag name
// 		case "badges":
// 		case "badge-info":
// 			// badges=staff/1,broadcaster/1,turbo/1;

// 			if( tagValue ) {
// 				let dict = {};  // Holds the list of badge objects.
// 				// The key is the badge's name (e.g., subscriber).
// 				let badges = tagValue.split( "," ); 
// 				badges.forEach( pair => {
// 					let badgeParts = pair.split( "/" );
// 					dict[ badgeParts[ 0 ] ] = badgeParts[ 1 ];
// 				} )
// 				dictParsedTags[ parsedTag[ 0 ] ] = dict;
// 			}
// 			else {
// 				dictParsedTags[ parsedTag[ 0 ] ] = null;
// 			}
// 			break;
// 		case "emotes":
// 			// emotes=25:0-4,12-16/1902:6-10

// 			if( tagValue ) {
// 				let dictEmotes = {};  // Holds a list of emote objects.
// 				// The key is the emote's ID.
// 				let emotes = tagValue.split( "/" );
// 				emotes.forEach( emote => {
// 					let emoteParts = emote.split( ":" );

// 					let textPositions = [];  // The list of position objects that identify
// 					// the location of the emote in the chat message.
// 					let positions = emoteParts[ 1 ].split( "," );
// 					positions.forEach( position => {
// 						let positionParts = position.split( "-" );
// 						textPositions.push( {
// 							startPosition: positionParts[ 0 ],
// 							endPosition: positionParts[ 1 ],    
// 						} )
// 					} );

// 					dictEmotes[ emoteParts[ 0 ] ] = textPositions;
// 				} )

// 				dictParsedTags[ parsedTag[ 0 ] ] = dictEmotes;
// 			}
// 			else {
// 				dictParsedTags[ parsedTag[ 0 ] ] = null;
// 			}

// 			break;
// 		case "emote-sets":
// 			// emote-sets=0,33,50,237

// 			let emoteSetIds = tagValue.split( "," );  // Array of emote set IDs.
// 			dictParsedTags[ parsedTag[ 0 ] ] = emoteSetIds;
// 			break;
// 		default:
// 			// If the tag is in the list of tags to ignore, ignore
// 			// it; otherwise, add it.

// 			if( tagsToIgnore.hasOwnProperty( parsedTag[ 0 ] ) ) { 
// 				;
// 			}
// 			else {
// 				dictParsedTags[ parsedTag[ 0 ] ] = tagValue;
// 			}
// 		} 
// 	} );

// 	return dictParsedTags;
// }

// // Parses the command component of the IRC message.

// function parseCommand( rawCommandComponent ) {
// 	let parsedCommand = null;
// 	commandParts = rawCommandComponent.split( " " );

// 	switch( commandParts[ 0 ] ) {
// 	case "JOIN":
// 	case "PART":
// 	case "NOTICE":
// 	case "CLEARCHAT":
// 	case "HOSTTARGET":
// 	case "PRIVMSG":
// 		parsedCommand = {
// 			command: commandParts[ 0 ],
// 			channel: commandParts[ 1 ],
// 		}
// 		break;
// 	case "PING":
// 		parsedCommand = {
// 			command: commandParts[ 0 ],
// 		}
// 		break;
// 	case "CAP":
// 		parsedCommand = {
// 			command: commandParts[ 0 ],
// 			isCapRequestEnabled: ( commandParts[ 2 ] === "ACK" ) ? true : false,
// 			// The parameters part of the messages contains the 
// 			// enabled capabilities.
// 		}
// 		break;
// 	case "GLOBALUSERSTATE":  // Included only if you request the /commands capability.
// 		// But it has no meaning without also including the /tags capability.
// 		parsedCommand = {
// 			command: commandParts[ 0 ],
// 		}
// 		break;               
// 	case "USERSTATE":   // Included only if you request the /commands capability.
// 	case "ROOMSTATE":   // But it has no meaning without also including the /tags capabilities.
// 		parsedCommand = {
// 			command: commandParts[ 0 ],
// 			channel: commandParts[ 1 ],
// 		}
// 		break;
// 	case "RECONNECT":  
// 		console.log( "The Twitch IRC server is about to terminate the connection for maintenance." )
// 		parsedCommand = {
// 			command: commandParts[ 0 ],
// 		}
// 		break;
// 	case "421":
// 		console.log( `Unsupported IRC command: ${commandParts[ 2 ]}` )
// 		return null;
// 	case "001":  // Logged in (successfully authenticated). 
// 		parsedCommand = {
// 			command: commandParts[ 0 ],
// 			channel: commandParts[ 1 ],
// 		}
// 		break;
// 	case "002":  // Ignoring all other numeric messages.
// 	case "003":
// 	case "004":
// 	case "353":  // Tells you who else is in the chat room you're joining.
// 	case "366":
// 	case "372":
// 	case "375":
// 	case "376":
// 		console.log( `numeric message: ${commandParts[ 0 ]}` )
// 		return null;
// 	default:
// 		console.log( `\nUnexpected command: ${commandParts[ 0 ]}\n` );
// 		return null;
// 	}

// 	return parsedCommand;
// }

// // Parses the source (nick and host) components of the IRC message.

// function parseSource( rawSourceComponent ) {
// 	if( null == rawSourceComponent ) {  // Not all messages contain a source
// 		return null;
// 	}
// 	else {
// 		let sourceParts = rawSourceComponent.split( "!" );
// 		return {
// 			nick: ( sourceParts.length == 2 ) ? sourceParts[ 0 ] : null,
// 			host: ( sourceParts.length == 2 ) ? sourceParts[ 1 ] : sourceParts[ 0 ],
// 		}
// 	}
// }

// // Parsing the IRC parameters component if it contains a command (e.g., !dice).

// function parseParameters( rawParametersComponent, command ) {
// 	let idx = 0
// 	let commandParts = rawParametersComponent.slice( idx + 1 ).trim(); 
// 	let paramsIdx = commandParts.indexOf( " " );

// 	if( -1 == paramsIdx ) { // no parameters
// 		command.botCommand = commandParts.slice( 0 ); 
// 	}
// 	else {
// 		command.botCommand = commandParts.slice( 0, paramsIdx ); 
// 		command.botCommandParams = commandParts.slice( paramsIdx ).trim();
// 		// TODO: remove extra spaces in parameters string
// 	}

// 	return command;
// }


const exampleMessages = [
	// ":tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/commands",

	// ":tmi.twitch.tv 001 justinfan48698855 :Welcome, GLHF!",
	// ":tmi.twitch.tv 002 justinfan48698855 :Your host is tmi.twitch.tv",
	// ":tmi.twitch.tv 003 justinfan48698855 :This server is rather new",
	// ":tmi.twitch.tv 004 justinfan48698855 :-",
	// ":tmi.twitch.tv 375 justinfan48698855 :-",
	// ":tmi.twitch.tv 372 justinfan48698855 :You are in a maze of twisty passages, all alike.",
	// ":tmi.twitch.tv 376 justinfan48698855 :>",

	// ":justinfan48698855!justinfan48698855@justinfan48698855.tmi.twitch.tv JOIN #instafluff",
 	// ":justinfan48698855.tmi.twitch.tv 353 justinfan48698855 = #instafluff :justinfan48698855",
	// ":justinfan48698855.tmi.twitch.tv 366 justinfan48698855 #instafluff :End of /NAMES list",
	// "@emote-only=0;followers-only=-1;r9k=0;room-id=83118047;slow=0;subs-only=0 :tmi.twitch.tv ROOMSTATE #instafluff",

	"@badge-info=subscriber/67;badges=broadcaster/1,subscriber/3012,game-developer/1;client-nonce=76552d943fb9395ca816a8efc0a7c6cd;color=#FFD166;display-name=Instafluff;emotes=;first-msg=0;flags=;id=1ce5970f-8e96-4643-a61e-71e46fa44a9e;mod=0;returning-chatter=0;room-id=83118047;subscriber=1;tmi-sent-ts=1677879699984;turbo=0;user-id=83118047;user-type= :instafluff!instafluff@instafluff.tmi.twitch.tv PRIVMSG #instafluff :test message; hello",
	"@badge-info=;badges=moderator/1,premium/1;client-nonce=9f37ae4c357ba94d8354bc9bf07dfe0d;color=#0AFF00;display-name=BungalowGlow;emotes=;first-msg=0;flags=;id=5ce83ba6-e7db-4d89-a2a0-f9a731078ad5;mod=1;returning-chatter=0;room-id=83118047;subscriber=0;tmi-sent-ts=1677879698429;turbo=0;user-id=123975421;user-type=mod :bungalowglow!bungalowglow@bungalowglow.tmi.twitch.tv PRIVMSG #instafluff :^^^",
];

for( const msg of exampleMessages ) {
	console.log( "Parsing:", msg );
	const result = parseMessage( msg );
	console.log( result );
	console.log( "\n\n" );
}
