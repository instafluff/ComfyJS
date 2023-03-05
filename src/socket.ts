const _WebSocket = global.WebSocket || require( "ws" );

export function createWebSocket( server : string | URL, protocols? : string | undefined ) : WebSocket {
	const ws = new _WebSocket( server, protocols );
	return ws;
}
