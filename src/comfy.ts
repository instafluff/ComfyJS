// Comfy.JS v@VERSION
import { TwitchChat } from ".";
import { TwitchEventType } from "./twitch";

export type ComfyJSInstance = {
	version: () => string;
	onError: ( error : Error ) => void;
	onCommand: ( user : string, command : string, message : string, flags : any, extra : any ) => void;
	onChat: ( user : string, message : string, flags : any, self : boolean, extra : any ) => void;
	onWhisper: ( user : string, message : string, flags : any, self : boolean, extra : any ) => void;
	Init: ( username : string, password? : string, channels? : string[] | string, isDebug? : boolean ) => void;
};

let comfyInstance : TwitchChat | undefined;

function parseMessageEmotes( messageEmotes : string ) : any | null {
	if( messageEmotes ) {
		const emotes = messageEmotes.split( "/" );
		const emoteMap : any = {};
		for( const emote of emotes ) {
			const [ id, positions ] = emote.split( ":" );
			emoteMap[ id ] = positions.split( "," );
		}
		return emoteMap;
	}
	return null;
}

function convertContextToUserState( context : any ) : { [ key : string ] : string } {
	const userState : any = {};
	for( const key in context.extra ) {
		if( context.extra[ key ] === "" ) {
			userState[ key ] = null;
		}
		else if( context.extra[ key ] === "1" ) {
			userState[ key ] = true;
		}
		else if( context.extra[ key ] === "0" ) {
			userState[ key ] = false;
		}
		else {
			userState[ key ] = context.extra[ key ];
		}
	}
	userState[ "badge-info-raw" ] = userState[ "badge-info" ];
	userState[ "badge-info" ] = context.userBadgeInfo || null;
	userState[ "badges-raw" ] = userState.badges;
	userState.badges = context.userBadges || null;
	userState[ "emotes-raw" ] = userState.emotes;
	userState.emotes = parseMessageEmotes( context.messageEmotes );
	userState.username = context.username;
	userState[ "message-type" ] = context.messageType;
	return userState;
}

const comfyJS : ComfyJSInstance = {
	version: () => { return "@VERSION"; },
	onError: ( error : Error ) => {
		console.error( "Error:", error );
	},
	onCommand: ( user : string, command : string, message : string, flags : any, extra : any ) => {
		if( comfyInstance && comfyInstance.debug ) {
			console.debug( "onCommand default handler" );
		}
	},
	onChat: ( user : string, message : string, flags : any, self : boolean, extra : any ) => {
		if( comfyInstance && comfyInstance.debug ) {
			console.debug( "onChat default handler" );
		}
	},
	onWhisper: ( user : string, message : string, flags : any, self : boolean, extra : any ) => {
		if( comfyInstance && comfyInstance.debug ) {
			console.debug( "onWhisper default handler" );
		}
	},
	Init: ( username : string, password? : string, channels? : string[] | string, isDebug? : boolean ) => {
		comfyInstance = new TwitchChat( username, password, channels, isDebug );
		comfyInstance.on( TwitchEventType.Command, ( context? : any ) => {
			comfyJS.onCommand( context.displayName || context.username, context.command, context.message, context.flags, { ...context, userState: convertContextToUserState( context ), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		comfyInstance.on( TwitchEventType.Chat, ( context? : any ) => {
			comfyJS.onChat( context.displayName || context.username, context.message, context.flags, context.self, { ...context, userState: convertContextToUserState( context ), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
	},
};

declare global {
	interface Window {
		ComfyJSNew: ComfyJSInstance;
	}
}

// Expose everything, for browser and Node..
if( typeof module !== "undefined" && module.exports ) {
	module.exports = comfyJS;
}

if( typeof window !== "undefined" ) {
	window.ComfyJSNew = comfyJS;
}
