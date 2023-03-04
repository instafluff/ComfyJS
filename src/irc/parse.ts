export type ParsedMessage = {
	raw : string,
	tags : { [ name : string ] : string },
	source : string | null,
	command : string | null,
	parameters : string | null,
};

function extractComponent( message : string, index : number ) : { component : string, nextIndex : number } {
	const nextSpace = message.indexOf( " ", index );
	const rawComponent = message.slice( index + 1, nextSpace );
	return {
		component: rawComponent,
		nextIndex: nextSpace + 1,
	};
}

// --- Message parsing based on the IRC v3.2 spec (https://ircv3.net/irc/) ---
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
export function parseMessage( message : string ) : ParsedMessage {
	let parsedMessage : ParsedMessage = {
		raw: message,
		tags: {},
		source: null,
		command: null,
		parameters: null,
	};

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

// TODO: TURN INTO UNIT TESTS
// const exampleMessages = [
// 	// ":tmi.twitch.tv CAP * ACK :twitch.tv/tags twitch.tv/commands",

// 	// ":tmi.twitch.tv 001 justinfan48698855 :Welcome, GLHF!",
// 	// ":tmi.twitch.tv 002 justinfan48698855 :Your host is tmi.twitch.tv",
// 	// ":tmi.twitch.tv 003 justinfan48698855 :This server is rather new",
// 	// ":tmi.twitch.tv 004 justinfan48698855 :-",
// 	// ":tmi.twitch.tv 375 justinfan48698855 :-",
// 	// ":tmi.twitch.tv 372 justinfan48698855 :You are in a maze of twisty passages, all alike.",
// 	// ":tmi.twitch.tv 376 justinfan48698855 :>",

// 	// ":justinfan48698855!justinfan48698855@justinfan48698855.tmi.twitch.tv JOIN #instafluff",
//  	// ":justinfan48698855.tmi.twitch.tv 353 justinfan48698855 = #instafluff :justinfan48698855",
// 	// ":justinfan48698855.tmi.twitch.tv 366 justinfan48698855 #instafluff :End of /NAMES list",
// 	// "@emote-only=0;followers-only=-1;r9k=0;room-id=83118047;slow=0;subs-only=0 :tmi.twitch.tv ROOMSTATE #instafluff",

// 	"@badge-info=subscriber/67;badges=broadcaster/1,subscriber/3012,game-developer/1;client-nonce=76552d943fb9395ca816a8efc0a7c6cd;color=#FFD166;display-name=Instafluff;emotes=;first-msg=0;flags=;id=1ce5970f-8e96-4643-a61e-71e46fa44a9e;mod=0;returning-chatter=0;room-id=83118047;subscriber=1;tmi-sent-ts=1677879699984;turbo=0;user-id=83118047;user-type= :instafluff!instafluff@instafluff.tmi.twitch.tv PRIVMSG #instafluff :test message; hello",
// 	"@badge-info=;badges=moderator/1,premium/1;client-nonce=9f37ae4c357ba94d8354bc9bf07dfe0d;color=#0AFF00;display-name=BungalowGlow;emotes=;first-msg=0;flags=;id=5ce83ba6-e7db-4d89-a2a0-f9a731078ad5;mod=1;returning-chatter=0;room-id=83118047;subscriber=0;tmi-sent-ts=1677879698429;turbo=0;user-id=123975421;user-type=mod :bungalowglow!bungalowglow@bungalowglow.tmi.twitch.tv PRIVMSG #instafluff :^^^",
// ];

// for( const msg of exampleMessages ) {
// 	console.log( "Parsing:", msg );
// 	const result = parseMessage( msg );
// 	console.log( result );
// 	console.log( "\n\n" );
// }
