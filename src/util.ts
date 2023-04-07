export function unescapeIRC( text : string ) : string {
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
