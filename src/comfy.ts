// Comfy.JS v@VERSION
import { TwitchEvents } from ".";
import { TwitchEventType } from "./twitch";

export type ComfyJSInstance = {
	version: () => string;
	latency: () => number;
	getInstance: () => TwitchEvents | undefined;
	onConnected: ( address : string, port : number, isFirstConnect : boolean ) => void;
	onReconnect: ( reconnectCount : number ) => void;
	onError: ( error : Error ) => void;
	onCommand: ( user : string, command : string, message : string, flags : any, extra : any ) => void;
	onChat: ( user : string, message : string, flags : any, self : boolean, extra : any ) => void;
	onWhisper: ( user : string, message : string, flags : any, self : boolean, extra : any ) => void;
	onCheer: ( user : string, message : string, bits : number, flags : any, extra : any ) => void;
	onSub: ( user : string, message : string, subTierInfo : any, extra : any ) => void;
	onResub: ( user : string, message : string, streamMonths : number, cumulativeMonths : number, subTierInfo : any, extra : any ) => void;
	onSubGift: ( gifterUser : string, streakMonths : number, recipientUser : string, senderCount : number, subTierInfo : any, extra : any ) => void;
	onSubMysteryGift: ( gifterUser : string, numbOfSubs : number, senderCount : number, subTierInfo : any, extra : any ) => void;
	onGiftSubContinue: ( user : string, sender : string, extra : any ) => void;
	onTimeout: ( user : string, duration : number, extra : any ) => void;
	onBan: ( user : string, extra : any ) => void;
	onMessageDeleted: ( messageId : string, extra : any ) => void;
	onRaid: ( user : string, viewers : number, extra : any ) => void;
	onUnraid: ( channel : string, extra : any ) => void;
	simulateIRCMessage: ( message : string ) => void;
	Init: ( username : string, password? : string, channels? : string[] | string, isDebug? : boolean ) => void;
};

let twitchEvents : TwitchEvents | undefined;

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
	latency: () => { return twitchEvents ? twitchEvents.latency : -1; },
	getInstance: () => { return twitchEvents; },
	onConnected: ( address : string, port : number, isFirstConnect : boolean ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onConnected default handler" );
		}
	},
	onReconnect: ( reconnectCount : number ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onReconnect default handler" );
		}
	},
	onError: ( error : Error ) => {
		console.error( "Error:", error );
	},
	onCommand: ( user : string, command : string, message : string, flags : any, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onCommand default handler" );
		}
	},
	onChat: ( user : string, message : string, flags : any, self : boolean, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onChat default handler" );
		}
	},
	onCheer: ( user : string, message : string, bits : number, flags : any, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onCheer default handler" );
		}
	},
	onWhisper: ( user : string, message : string, flags : any, self : boolean, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onWhisper default handler" );
		}
	},
	onSub: ( user : string, message : string, subTierInfo : any, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onSub default handler" );
		}
	},
	onResub: ( user : string, message : string, streamMonths : number, cumulativeMonths : number, subTierInfo : any, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onResub default handler" );
		}
	},
	onSubGift: ( gifterUser : string, streakMonths : number, recipientUser : string, senderCount : number, subTierInfo : any, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onSubGift default handler" );
		}
	},
	onSubMysteryGift: ( gifterUser : string, numbOfSubs : number, senderCount : number, subTierInfo : any, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onSubMysteryGift default handler" );
		}
	},
	onGiftSubContinue: ( user : string, sender : string, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onGiftSubContinue default handler" );
		}
	},
	onTimeout: ( user : string, duration : number, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onTimeout default handler" );
		}
	},
	onBan: ( user : string, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onBan default handler" );
		}
	},
	onMessageDeleted: ( messageID : string, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onMessageDeleted default handler" );
		}
	},
	onRaid: ( user : string, viewers : number, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onRaid default handler" );
		}
	},
	onUnraid: ( channel : string, extra : any ) => {
		if( twitchEvents && twitchEvents.debug ) {
			console.debug( "onUnraid default handler" );
		}
	},
	simulateIRCMessage: ( message : string ) => {
		if( twitchEvents ) {
			twitchEvents.simulateIRCMessage( message );
		}
	},
	Init: ( username : string, password? : string, channels? : string[] | string, isDebug? : boolean ) => {
		twitchEvents = new TwitchEvents( username, password, channels, isDebug );
		twitchEvents.on( TwitchEventType.Connect, ( context? : any ) => {
			comfyJS.onConnected( context.address, context.port, context.isFirstConnect );
		} );
		twitchEvents.on( TwitchEventType.Reconnect, ( context? : any ) => {
			console.log( "RECONNECT" );
			comfyJS.onReconnect( context.reconnectCount );
		} );
		twitchEvents.on( TwitchEventType.Error, ( error : Error ) => {
			comfyJS.onError( error );
		} );
		twitchEvents.on( TwitchEventType.Command, ( context? : any ) => {
			comfyJS.onCommand( context.displayName || context.username, context.command, context.message, context.flags, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.Chat, ( context? : any ) => {
			comfyJS.onChat( context.displayName || context.username, context.message, context.flags, context.self, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.Whisper, ( context? : any ) => {
			comfyJS.onWhisper( context.displayName || context.username, context.message, context.flags, context.self, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, channel: context.username, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.Cheer, ( context? : any ) => {
			comfyJS.onCheer( context.displayName || context.username, context.message, context.bits, context.flags, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.Subscribe, ( context? : any ) => {
			comfyJS.onSub( context.displayName || context.username, context.message, { prime: context.subPlan === "Prime", plan: context.subPlan, planName: context.subPlanName || null }, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.Resubscribe, ( context? : any ) => {
			comfyJS.onResub( context.displayName || context.username, context.message, context.streakMonths || 0, context.cumulativeMonths, { prime: context.subPlan === "Prime", plan: context.subPlan, planName: context.subPlanName || null }, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.SubGift, ( context? : any ) => {
			comfyJS.onSubGift( context.displayName || context.username, context.streakMonths || 0, context.recipientDisplayName, context.senderCount, { prime: context.subPlan === "Prime", plan: context.subPlan, planName: context.subPlanName || null }, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.MysterySubGift, ( context? : any ) => {
			comfyJS.onSubMysteryGift( context.displayName || context.username, context.giftCount, context.senderCount, { prime: context.subPlan === "Prime", plan: context.subPlan, planName: context.subPlanName || null }, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ), userMassGiftCount: context.giftCount } );
		} );
		twitchEvents.on( TwitchEventType.SubGiftContinue, ( context? : any ) => {
			comfyJS.onGiftSubContinue( context.displayName || context.username, context.gifterDisplayName, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.Timeout, ( context? : any ) => {
			comfyJS.onTimeout( context.displayName || context.username, context.duration, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ), timedOutUserId: context.userId } );
		} );
		twitchEvents.on( TwitchEventType.Ban, ( context? : any ) => {
			comfyJS.onBan( context.displayName || context.username, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ), bannedUserId: context.userId } );
		} );
		twitchEvents.on( TwitchEventType.MessageDeleted, ( context? : any ) => {
			comfyJS.onMessageDeleted( context.id, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.Raid, ( context? : any ) => {
			comfyJS.onRaid( context.displayName || context.username, context.viewers, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
		} );
		twitchEvents.on( TwitchEventType.Unraid, ( context? : any ) => {
			comfyJS.onUnraid( context.channel, { ...context, userState: convertContextToUserState( context ), extra: null, flags: context.extra?.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes( context.messageEmotes ) } );
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
