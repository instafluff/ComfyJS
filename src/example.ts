import { TwitchChat } from ".";
import { secretPassword } from "./secrets";
import { TwitchEventType } from "./twitch";

const channel = "instafluff";
const password = secretPassword; //undefined;

const comfyJs = new TwitchChat( channel, password );
comfyJs.on( TwitchEventType.Connect, () => {
	console.log( "Connected to Twitch Chat!" );
} );
comfyJs.on( TwitchEventType.Error, ( context? : any ) => {
	console.error( "ERROR:", context );
} );
comfyJs.on( TwitchEventType.ChatMode, ( context? : any ) => {
	console.error( "ChatMode:", context );
} );
comfyJs.on( TwitchEventType.Command, ( context? : any ) => {
	console.log( `${context.channel} - ${context.username} used command !${context.command} ${context.message}`, context );
	if( context.command === "reply" ) {
		console.log( context );
		comfyJs.reply( context.extra.id, "Hello!" );
	}
	if( context.command === "delete" ) {
		console.log( context );
		comfyJs.deleteMessage( context.extra.id ); // TODO: This currently does not work
	}
} );
comfyJs.on( TwitchEventType.Chat, ( context? : any ) => {
	console.log( `${context.channel} - ${context.username} : ${context.message}`, context );
} );
comfyJs.on( TwitchEventType.Chat, ( context? : any ) => {
	console.log( `${context.channel} - ${context.username} : ${context.message}`, context );
} );
comfyJs.on( TwitchEventType.Whisper, ( context? : any ) => {
	console.log( `${context.channel} - ${context.username} : ${context.message}` );
} );
comfyJs.on( TwitchEventType.Raid, ( context? : any ) => {
	console.log( `${context.channel} - ${context.username} has raided!`, context );
} );
comfyJs.on( TwitchEventType.Reply, ( context? : any ) => {
	console.log( `${context.channel} - ${context.username} replied to ${context.parentDisplayName} : ${context.message}`, context );
	// TODO: REMOVE THIS. THIS IS A TEST
	setTimeout( () => {
		comfyJs.reply( context.extra.id, "Yes, I am replying to your message" );
	}, 3000 );
} );
comfyJs.on( TwitchEventType.Pong, ( context? : any ) => {
	console.log( `PONG: ${context.latency} ms` );
} );
comfyJs.on( TwitchEventType.MessageDeleted, ( context? : any ) => {
	console.log( `Message Deleted in ${context.channel}`, context );
} );
comfyJs.on( TwitchEventType.Ban, ( context? : any ) => {
	console.log( `User Banned in ${context.channel}`, context );
} );
comfyJs.on( TwitchEventType.Timeout, ( context? : any ) => {
	console.log( `User Timed Out in ${context.channel}`, context );
} );

// setTimeout( () => {
// 	try {
// 		console.log( "Sending Chat Message" );
// 		comfyJs.say( "testing!" );
// 		console.log( "Sent!" );
// 	}
// 	catch( err ) {
// 		console.error( err );
// 	}
// }, 3000 );
