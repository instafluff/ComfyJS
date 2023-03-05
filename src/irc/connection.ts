const _WebSocket = global.WebSocket || require( "ws" );

export function connectToIRC( server : string | URL ) : WebSocket {
	const ws = new _WebSocket( server, [ "irc" ] );
	return ws;
}
