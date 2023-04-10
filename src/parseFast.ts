import { unescapeIRC } from "./util";

export type ParsedMessage = {
  raw: string;
  tags: { [name: string]: string };
  source: string | null;
  command: string | null;
  parameters: string | null;
};

export function parseMessage( message: string ): ParsedMessage {
	const parsedMessage: ParsedMessage = {
		raw: message,
		tags: {},
		source: null,
		command: null,
		parameters: null,
	};

	let index = 0;

	// --- Tags Parsing ---
	if( message[ 0 ] === "@" ) {
		index = message.indexOf( " " );
		const rawTags = message.slice( 1, index );

		for( const tag of rawTags.split( ";" ) ) {
			const tagSplitIndex = tag.indexOf( "=" );
			const key = tag.substring( 0, tagSplitIndex );
			const value = tag.substring( tagSplitIndex + 1 );

			// Optimizations for common tags that won't be escaped
			parsedMessage.tags[ key ] =
			key === "emote-sets" ||
			key === "ban-duration" ||
			key === "bits" ||
			key === "id" ||
			key === "room-id" ||
			key === "color" ||
			key === "login"
        	? value
        	: unescapeIRC( value );
		}
	}

	// --- Source Parsing ---
	if( message[ ++index ] === ":" ) {
		const nextSpace = message.indexOf( " ", index );
		parsedMessage.source = message.slice( index + 1, nextSpace );
		index = nextSpace + 1;
	}

	// --- Command Parsing ---
	if( index < message.length ) {
		const commandEnd = message.indexOf( ":", index );
		parsedMessage.command = message.slice( index, commandEnd < 0 ? undefined : commandEnd ).trim();

		// Parse the parameters
		if( commandEnd >= 0 ) {
			parsedMessage.parameters = message.slice( commandEnd + 1 );
		}
	}

	return parsedMessage;
}
