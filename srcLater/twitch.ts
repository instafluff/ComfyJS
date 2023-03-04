enum TwitchEventType {
	Error = "error",
	Command = "command",
	Chat = "chat",
	Whisper = "whisper",
}

export class TwitchEvents {
	mainChannel : string = "";
	channelPassword : string = "";
	isFirstConnect : boolean = true;
	reconnectCount : number = 0;
	isDebug : boolean = false;
	version : string = "@VERSION";

	constructor() {
	}

	on( eventType : TwitchEventType, context : any ) {
		
	}
}
