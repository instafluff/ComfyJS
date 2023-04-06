const _WebSocket = globalThis.WebSocket || require( "ws" );

export function createWebSocket( server : string | URL, protocols? : string | undefined ) : WebSocket {
	return new _WebSocket( server, protocols );
}
