export function unescapeIRC( text: string ): string {
	if( !text || typeof text !== "string" || !text.includes( "\\" ) ) {
		return text;
	}
	return text.replace( /\\(.)/g, ( _, char ) => {
		switch( char ) {
		case "\\":
			return "\\";
		case ":":
			return ";";
		case "s":
			return " ";
		case "r":
			return "\r";
		case "n":
			return "\n";
		default:
			return char;
		}
	} );
}
	
export type ParsedMessage = {
	raw: string;
	tags: { [name: string]: string };
	source: string | null;
	command: string | null;
	parameters: string | null;
	};
	
function parseTag( tag: string ) {
	const tagSplitIndex = tag.indexOf( "=" );
	const key = tag.substring( 0, tagSplitIndex );
	const value = tag.substring( tagSplitIndex + 1 );
	return { key, value };
}

export function parseMessage( message: string ): ParsedMessage {
	const parsedMessage: ParsedMessage = {
		raw: message,
		tags: {},
		source: null,
		command: null,
		parameters: null,
	};
	
	let index = 0;
	
	if( message[ 0 ] === "@" ) {
		index = message.indexOf( " " );
		const tagString = message.substring( 1, index );
		const tagList = tagString.split( ";" );
	
		for( const tag of tagList ) {
			const { key, value } = parseTag( tag );
			parsedMessage.tags[ key ] = unescapeIRC( value );
		}
	}
	
	if( message[ index ] === " " ) { index++; }
	
	const sourceStartIndex = message.indexOf( ":", index );
	if( sourceStartIndex >= 0 && sourceStartIndex < message.indexOf( " ", index ) ) {
		const sourceEndIndex = message.indexOf( " ", sourceStartIndex );
		parsedMessage.source = message.substring( sourceStartIndex + 1, sourceEndIndex );
		index = sourceEndIndex + 1;
	}
	
	const commandEndIndex = message.indexOf( " :", index );
	parsedMessage.command = message.substring( index, commandEndIndex >= 0 ? commandEndIndex : undefined ).trim();
	
	const parameterIndex = message.indexOf( ":", index );
	if( parameterIndex >= 0 ) {
		parsedMessage.parameters = message.slice( parameterIndex + 1 );
	}
	
	return parsedMessage;
}
	