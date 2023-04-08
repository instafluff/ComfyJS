import { unescapeIRC } from "./util";

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
	const parsedMessage : ParsedMessage = {
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
	if( message[ 0 ] === "@" ) {
		// console.debug( "This message contains tags" );
		const { component, nextIndex } = extractComponent( message, 0 );
		for( const tag of component.split( ";" ) ) {
			const tagSplitIndex = tag.indexOf( "=" );
			const key = tag.substring( 0, tagSplitIndex );
			const value = tag.substring( tagSplitIndex + 1 );
			parsedMessage.tags[ key ] = unescapeIRC( value );
		}
		index = nextIndex; // Should now point to source colon (:).
	}

	// --- Source Parsing ---
	// Get the source component (nick and host) of the IRC message.
	// The idx should point to the source part; otherwise, it's a PING command.
	if( message[ index ] === ":" ) {
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
