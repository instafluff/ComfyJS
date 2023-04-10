// Escape values for IRC messages (https://ircv3.net/specs/extensions/message-tags.html#escaping-values)
export function unescapeIRC( text : string ) : string {
	if( !text || typeof text !== "string" || !text.includes( "\\" ) ) {
		return text;
	}
	return text.replace( /\\(.)/g, ( _, char ) => {
		switch( char ) {
		case "\\": return "\\";
		case ":": return ";";
		case "s": return " ";
		case "r": return "\r";
		case "n": return "\n";
		default: return char;
		}
	} );
}
