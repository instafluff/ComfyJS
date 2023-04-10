import { ParsedMessage } from "./parse";

export enum TwitchEventType {
	None = "none",
	Ping = "Ping",
	Pong = "Pong",
	Connect = "connect",
	Reconnect = "reconnect",
	Error = "error",
	Warning = "Warning",
	ChatMode = "chatmode",
	ClearChat = "ClearChat",
	RoomState = "roomstate",
	GlobalUserState = "globaluserstate",
	UserState = "userstate",
	Notice = "notice",
	Join = "join",
	Leave = "leave",
	Command = "command",
	Chat = "message",
	Reply = "reply",
	Whisper = "whisper",
	Announcement = "announcement",
	Cheer = "Cheer",
	Subscribe = "sub",
	Resubscribe = "resub",
	SubGift = "subgift",
	MysterySubGift = "submysterygift",
	SubGiftContinue = "subgiftcontinue",
	Raid = "raid",
	Unraid = "unraid",
	Timeout = "Timeout",
	Ban = "Ban",
	MessageDeleted = "MessageDeleted",
	// Experimental
	ViewerMilestone = "ViewerMilestone",
	All = "all",
};

export enum TwitchMessageFlag {
	AggressiveContent = "aggressive",
	IdentityBasedHate = "identity-hate",
	ProfaneContent = "profane",
	SexualContent = "sexual",
};

const TwitchUserTypes : { [ key : string ] : string } = {
	"": "Normal",
	"admin": "Admin",
	"global_mod": "Global Mod",
	"staff": "Staff",
	"mod": "Moderator",
};

export type ProcessedMessage = {
    type : TwitchEventType,
    data? : any,
	extra? : any,
};

function parseUsername( source : string | null ) {
	const parts = ( source as string ).split( "!" );
	return parts.length > 1 ? parts[ 0 ] : undefined;
}

function parseBadges( badgesTag : string ) : { [ key : string ] : string } | undefined {
	if( !badgesTag ) { return undefined; }
	const badgeList = badgesTag.split( "," );
	const badges : { [ key : string ] : string } = {};
	for( const badge of badgeList ) {
		const [ name, version ] = badge.split( "/" );
		badges[ name ] = version;
	}
	return badges;
}

function parseMessageFlags( flagsTag : string ) {
	if( !flagsTag ) { return undefined; }
	const flagsList = flagsTag.split( "," );
	const flags : Partial<{ [ key in TwitchMessageFlag ] : number | undefined }> = {};
	for( const flag of flagsList ) {
		const [ , label ] = flag.split( ":" );
		const [ category, level ] = label.split( "." );
		switch( category ) {
		case "A":
			flags[ TwitchMessageFlag.AggressiveContent ] = Math.max( flags[ TwitchMessageFlag.AggressiveContent ] || 0, parseInt( level ) );
			break;
		case "I":
			flags[ TwitchMessageFlag.IdentityBasedHate ] = Math.max( flags[ TwitchMessageFlag.IdentityBasedHate ] || 0, parseInt( level ) );
			break;
		case "P":
			flags[ TwitchMessageFlag.ProfaneContent ] = Math.max( flags[ TwitchMessageFlag.ProfaneContent ] || 0, parseInt( level ) );
			break;
		case "S":
			flags[ TwitchMessageFlag.SexualContent ] = Math.max( flags[ TwitchMessageFlag.SexualContent ] || 0, parseInt( level ) );
			break;
		default:
			break;
		}
	}
	return flags;
}

function handleChatMessage( message : ParsedMessage, channel : string ) : ProcessedMessage {
	const isAction = message.parameters?.startsWith( "\u0001ACTION" );
	const sanitizedMessage = isAction ? message.parameters?.match( /^\u0001ACTION ([^\u0001]+)\u0001$/ )![ 1 ] : message.parameters;

	const id = message.tags[ "id" ];
	const channelId = message.tags[ "room-id" ];
	const userId = message.tags[ "user-id" ];
	const username = parseUsername( message.source );
	const displayName = message.tags[ "display-name" ] || message.tags[ "login" ] || username;
	const userType = TwitchUserTypes[ message.tags[ "user-type" ] ];
	const badgeInfo =  message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined;
	const badges = message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined;
	const userColor = message.tags[ "color" ] || undefined;
	const emotes = message.tags[ "emotes" ];
	const messageFlags = message.tags[ "flags" ];
	const contentFlags = parseMessageFlags( messageFlags );
	const isBroadcaster = username === channel;
	const isMod = message.tags[ "mod" ] === "1";
	const isFounder = badges ? !!badges[ "founder" ] : false;
	const isSubscriber = message.tags[ "subscriber" ] === "1";
	const isTurbo = message.tags[ "turbo" ] === "1";
	const isVIP = badges ? !!badges[ "vip" ] : false;
	const isPrime = badges ? !!badges[ "premium" ] : false;
	const isPartner = badges ? !![ "partner" ] : false;
	const isGameDeveloper = badges ? !!badges[ "game-developer" ] : false;
	const timestamp = parseInt( message.tags[ "tmi-sent-ts" ] );
	
	const isEmoteOnly = message.tags[ "emote-only" ] === "1";
	const isHighlightedMessage = message.tags[ "msg-id" ] === "highlighted-message";
	const isSkipSubsModeMessage = message.tags[ "msg-id" ] === "skip-subs-mode-message";
	const customRewardId = message.tags[ "custom-reward-id" ] || null;

	// TODO: Look into the "first-msg" and "returning-chatter" tags
	const isFirstMessage = message.tags[ "first-msg" ] === "1";
	const isReturningChatter = message.tags[ "returning-chatter" ] === "1";

	const flags = {
		broadcaster: isBroadcaster,
		mod: isMod,
		founder: isFounder,
		subscriber: isSubscriber,
		vip: isVIP,
		partner: isPartner,
		gameDeveloper: isGameDeveloper,
		turbo: isTurbo,
		prime: isPrime,
		highlighted: isHighlightedMessage,
		skipSubsMode: isSkipSubsModeMessage,
		customReward: !!customRewardId,
		emoteOnly: isEmoteOnly,
		firstMessage: isFirstMessage,
		returningChatter: isReturningChatter,
	};

	if( message.tags[ "bits" ] ) {
		return {
			type: TwitchEventType.Cheer,
			data: {
				channel,
				channelId,
				displayName,
				username,
				userId,
				userType,
				id,
				message: message.parameters,
				messageType: isAction ? "action" : "chat", // TODO: Can bits be an action?
				messageEmotes: emotes,
				messageFlags,
				contentFlags,
				isEmoteOnly,
				subscriber: isSubscriber,
				userColor,
				userBadgeInfo: badgeInfo,
				userBadges: badges,
				customRewardId,
				flags,
				bits: parseInt( message.tags[ "bits" ] ),
				timestamp,
				extra: {
					...message.tags,
					flags: messageFlags || null,
				},
			},
		};
	}
	else {
		if( sanitizedMessage?.startsWith( "!" ) ) {
			const msgParts = sanitizedMessage!.split( / (.*)/ );
			const command = msgParts[ 0 ].substring( 1 ).toLowerCase();
			const msg = msgParts[ 1 ] || "";
			return {
				type: TwitchEventType.Command,
				data: {
					channel,
					channelId,
					displayName,
					username,
					userId,
					userType,
					command: command,
					id,
					message: msg,
					messageType: isAction ? "action" : "chat",
					messageEmotes: emotes,
					messageFlags,
					contentFlags,
					isEmoteOnly,
					userColor,
					userBadgeInfo: badgeInfo,
					userBadges: badges,
					customRewardId,
					flags,
					timestamp,
					extra: {
						...message.tags,
						flags: messageFlags || null,
					},
				},
			}
		}
		else {
			return {
				type: TwitchEventType.Chat,
				data: {
					channel,
					channelId,
					displayName,
					username,
					userId,
					userType,
					id,
					message: sanitizedMessage,
					messageType: isAction ? "action" : "chat",
					messageEmotes: emotes,
					messageFlags,
					contentFlags,
					isEmoteOnly,
					userColor,
					userBadgeInfo: badgeInfo,
					userBadges: badges,
					customRewardId,
					flags,
					timestamp,
					extra: {
						...message.tags,
						flags: messageFlags || null,
					},
				},
			};
		}
	}
}

export function processMessage( message : ParsedMessage ) : ProcessedMessage | null {
	try {
		if( message.command ) { // Twitch-Specific Tags: https://dev.twitch.tv/docs/irc/tags/
			const commandParts = message.command.split( " " );
			const channel = commandParts.length > 1 ? commandParts[ 1 ].substring( 1 ) : undefined;
			switch( commandParts[ 0 ] ) {
			case "PING":
				return { type: TwitchEventType.Ping	};
			case "PONG":
				return { type: TwitchEventType.Pong	};
			case "CAP": // Capabilities Confirmation
				// console.debug( "capabilities", message.parameters );
				return null;
			case "JOIN":
				return {
					type: TwitchEventType.Join,
					data: { channel, username: parseUsername( message.source ) },
				}
			case "PART":
				return {
					type: TwitchEventType.Leave,
					data: { channel, username: parseUsername( message.source ) },
				}
			case "ROOMSTATE":
				return {
					type: TwitchEventType.RoomState,
					data: {
						// Only add the properties if they exist
						...( message.tags[ "broadcaster-lang" ] && { broadcasterLanguage: message.tags[ "broadcaster-lang" ] } ),
						...( message.tags[ "emote-only" ] && { emoteOnly: message.tags[ "emote-only" ] !== "0" } ),
						...( message.tags[ "followers-only" ] && { followersOnly: message.tags[ "followers-only" ] !== "-1" } ),
						...( message.tags[ "subs-only" ] && { subscribersOnly: message.tags[ "subs-only" ] !== "0" } ),
						...( message.tags[ "r9k" ] && { r9k: message.tags[ "r9k" ] !== "0" } ),
						...( message.tags[ "rituals" ] && { rituals: message.tags[ "rituals" ] !== "0" } ),
						...( message.tags[ "slow" ] && { slow: message.tags[ "slow" ] !== "0" } ),
						channel,
						channelId: message.tags[ "room-id" ],
					},
				};
			case "GLOBALUSERSTATE":
				return {
					type: TwitchEventType.GlobalUserState,
					data: {
						displayName: message.tags[ "display-name" ],
						userId: message.tags[ "user-id" ],
						userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
						color: message.tags[ "color" ],
						badges: message.tags[ "badges" ],
						badgeInfo: message.tags[ "badge-info" ],
						emoteSets: message.tags[ "emote-sets" ],
						extra: message.tags,
					},
				};
			case "USERSTATE":
				return {
					type: TwitchEventType.UserState,
					data: {
						channel: channel,
						displayName: message.tags[ "display-name" ],
						userId: message.tags[ "user-id" ],
						userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
						color: message.tags[ "color" ],
						badgeInfo: message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined,
						badges: message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined,
						emoteSets: message.tags[ "emote-sets" ],
						...( message.tags[ "id" ] && { id: message.tags[ "id" ] } ),
						mod: message.tags[ "mod" ] === "1",
						subscriber: message.tags[ "subscriber" ] === "1",
						turbo: message.tags[ "turbo" ] === "1",
						extra: message.tags,
					},
				};
			case "HOSTTARGET": // No longer supported
				break;
			case "USERNOTICE":
				switch( message.tags[ "msg-id" ] ) {
				case "announcement":
					return {
						type: TwitchEventType.Announcement,
						data: {
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							channel,
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							message: message.parameters,
							messageType: message.tags[ "msg-id" ],
							messageEmotes: message.tags[ "emotes" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "sub":
					return {
						type: TwitchEventType.Subscribe,
						data: {
							id: message.tags[ "id" ],
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							months: parseInt( message.tags[ "msg-param-months" ] ),
							multiMonthDuration: parseInt( message.tags[ "msg-param-multimonth-duration" ] ),
							multiMonthTenure: parseInt( message.tags[ "msg-param-multimonth-tenure" ] ),
							shouldShareStreak: message.tags[ "msg-param-should-share-streak" ] === "1",
							subPlan: message.tags[ "msg-param-sub-plan" ],
							subPlanName: message.tags[ "msg-param-sub-plan-name" ],
							wasGifted: message.tags[ "msg-param-was-gifted" ] === "true",
							...( message.tags[ "msg-param-goal-contribution-type" ] && { goalContributionType: message.tags[ "msg-param-goal-contribution-type" ] } ),
							...( message.tags[ "msg-param-goal-current-contributions" ] && { goalCurrentContributions: parseInt( message.tags[ "msg-param-goal-current-contributions" ] ) } ),
							...( message.tags[ "msg-param-goal-description" ] && { goalDescription: message.tags[ "msg-param-goal-description" ] } ),
							...( message.tags[ "msg-param-goal-target-contributions" ] && { goalTargetContributions: parseInt( message.tags[ "msg-param-goal-target-contributions" ] ) } ),
							...( message.tags[ "msg-param-goal-user-contributions" ] && { goalUserContributions: parseInt( message.tags[ "msg-param-goal-user-contributions" ] ) } ),
							channel,
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
							userBadgeInfo: message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined,
							userBadges: message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined,
							userColor: message.tags[ "color" ] || undefined,
							message: message.parameters,
							messageType: message.tags[ "msg-id" ],
							messageEmotes: message.tags[ "emotes" ],
							messageFlags: message.tags[ "flags" ],
							contentFlags: parseMessageFlags( message.tags[ "flags" ] ),
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "resub":
					return {
						type: TwitchEventType.Resubscribe,
						data: {
							id: message.tags[ "id" ],
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							cumulativeMonths: parseInt( message.tags[ "msg-param-cumulative-months" ] ),
							months: parseInt( message.tags[ "msg-param-months" ] ),
							multiMonthDuration: parseInt( message.tags[ "msg-param-multimonth-duration" ] ),
							multiMonthTenure: parseInt( message.tags[ "msg-param-multimonth-tenure" ] ),
							...( message.tags[ "msg-param-streak-months" ] && { streakMonths: parseInt( message.tags[ "msg-param-streak-months" ] ) } ),
							shouldShareStreak: message.tags[ "msg-param-should-share-streak" ] === "1",
							subPlan: message.tags[ "msg-param-sub-plan" ],
							subPlanName: message.tags[ "msg-param-sub-plan-name" ],
							wasGifted: message.tags[ "msg-param-was-gifted" ] === "true",
							channel,
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
							userBadgeInfo: message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined,
							userBadges: message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined,
							userColor: message.tags[ "color" ] || undefined,
							message: message.parameters,
							messageType: message.tags[ "msg-id" ],
							messageEmotes: message.tags[ "emotes" ],
							messageFlags: message.tags[ "flags" ],
							contentFlags: parseMessageFlags( message.tags[ "flags" ] ),
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "submysterygift":
					return {
						type: TwitchEventType.MysterySubGift,
						data: {
							id: message.tags[ "id" ],
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							giftCount: parseInt( message.tags[ "msg-param-mass-gift-count" ] ),
							senderCount: parseInt( message.tags[ "msg-param-sender-count" ] || "0" ),
							subPlan: message.tags[ "msg-param-sub-plan" ],
							subPlanName: message.tags[ "msg-param-sub-plan-name" ],
							...( message.tags[ "msg-param-goal-contribution-type" ] && { goalContributionType: message.tags[ "msg-param-goal-contribution-type" ] } ),
							...( message.tags[ "msg-param-goal-current-contributions" ] && { goalCurrentContributions: parseInt( message.tags[ "msg-param-goal-current-contributions" ] ) } ),
							...( message.tags[ "msg-param-goal-description" ] && { goalDescription: message.tags[ "msg-param-goal-description" ] } ),
							...( message.tags[ "msg-param-goal-target-contributions" ] && { goalTargetContributions: parseInt( message.tags[ "msg-param-goal-target-contributions" ] ) } ),
							...( message.tags[ "msg-param-goal-user-contributions" ] && { goalUserContributions: parseInt( message.tags[ "msg-param-goal-user-contributions" ] ) } ),
							channel,
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
							userBadgeInfo: message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined,
							userBadges: message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined,
							userColor: message.tags[ "color" ] || undefined,
							messageType: message.tags[ "msg-id" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "subgift":
					return {
						type: TwitchEventType.SubGift,
						data: {
							id: message.tags[ "id" ],
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							recipientDisplayName: message.tags[ "msg-param-recipient-display-name" ],
							recipientId: message.tags[ "msg-param-recipient-id" ],
							recipientUsername: message.tags[ "msg-param-recipient-user-name" ],
							months: parseInt( message.tags[ "msg-param-months" ] ),
							giftMonths: parseInt( message.tags[ "msg-param-gift-months" ] ),
							senderCount: parseInt( message.tags[ "msg-param-sender-count" ] || "0" ), // How many all-time total gift subs sender has sent the channel
							subPlan: message.tags[ "msg-param-sub-plan" ],
							subPlanName: message.tags[ "msg-param-sub-plan-name" ],
							...( message.tags[ "msg-param-goal-contribution-type" ] && { goalContributionType: message.tags[ "msg-param-goal-contribution-type" ] } ),
							...( message.tags[ "msg-param-goal-current-contributions" ] && { goalCurrentContributions: parseInt( message.tags[ "msg-param-goal-current-contributions" ] ) } ),
							...( message.tags[ "msg-param-goal-description" ] && { goalDescription: message.tags[ "msg-param-goal-description" ] } ),
							...( message.tags[ "msg-param-goal-target-contributions" ] && { goalTargetContributions: parseInt( message.tags[ "msg-param-goal-target-contributions" ] ) } ),
							...( message.tags[ "msg-param-goal-user-contributions" ] && { goalUserContributions: parseInt( message.tags[ "msg-param-goal-user-contributions" ] ) } ),
							channel,
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
							userBadgeInfo: message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined,
							userBadges: message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined,
							userColor: message.tags[ "color" ] || undefined,
							messageType: message.tags[ "msg-id" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "giftpaidupgrade":
					return {
						type: TwitchEventType.SubGiftContinue,
						data: {
							id: message.tags[ "id" ],
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							gifterDisplayName: message.tags[ "msg-param-sender-name" ] || message.tags[ "msg-param-sender-login" ],
							gifterUsername: message.tags[ "msg-param-sender-login" ],
							channel,
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
							userBadgeInfo: message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined,
							userBadges: message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined,
							userColor: message.tags[ "color" ] || undefined,
							messageType: message.tags[ "msg-id" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "raid":
					return {
						type: TwitchEventType.Raid,
						data: {
							id: message.tags[ "id" ],
							profileImageURL: message.tags[ "msg-param-profileImageURL" ],
							displayName: message.tags[ "msg-param-displayName" ] || message.tags[ "display-name" ] || message.tags[ "msg-param-login" ] || message.tags[ "login" ],
							viewers: parseInt( message.tags[ "msg-param-viewerCount" ] ),
							channel,
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "msg-param-login" ] || message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
							messageType: message.tags[ "msg-id" ],
							// TODO: Add flags and badges
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "unraid":
					console.log( message );
					return {
						type: TwitchEventType.Unraid,
						data: {
							id: message.tags[ "id" ],
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							channel: message.tags[ "login" ],
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
							userBadgeInfo: message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined,
							userBadges: message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined,
							userColor: message.tags[ "color" ] || undefined,
							messageType: message.tags[ "msg-id" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				case "viewermilestone":
					console.log( message );
					return {
						type: TwitchEventType.ViewerMilestone,
						data: {
							id: message.tags[ "id" ],
							displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
							channel,
							channelId: message.tags[ "room-id" ],
							username: message.tags[ "login" ],
							userId: message.tags[ "user-id" ],
							userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
							messageType: message.tags[ "msg-id" ],
							category: message.tags[ "msg-param-category" ],
							milestoneId: message.tags[ "msg-param-id" ],
							milestoneValue: parseInt( message.tags[ "msg-param-value" ] ),
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				default:
					console.log( "TODO IMPLEMENT COMMAND", message );
					break;
				}
				break;
			case "WHISPER":
				// TODO: Check for OAuth password and scope for reading whispers
				return {
					type: TwitchEventType.Whisper,
					data: {
						displayName: message.tags[ "display-name" ] || message.tags[ "login" ] || parseUsername( message.source ),
						username: parseUsername( message.source ),
						userId: message.tags[ "user-id" ],
						userType: TwitchUserTypes[ message.tags[ "user-type" ] ],
						userColor: message.tags[ "color" ] || undefined,
						userBadgeInfo: message.tags[ "badge-info" ] ? parseBadges( message.tags[ "badge-info" ] ) : undefined,
						userBadges: message.tags[ "badges" ] ? parseBadges( message.tags[ "badges" ] ) : undefined,
						messageEmotes: message.tags[ "emotes" ],
						turbo: message.tags[ "turbo" ] === "1",
						threadId: message.tags[ "thread-id" ],
						messageId: message.tags[ "message-id" ],
						message: message.parameters,
						messageType: "whisper",
						extra: message.tags,
					},
				};
			case "NOTICE": // Notice Message IDs: https://dev.twitch.tv/docs/irc/msg-id/
				// Check for errors
				if( message.parameters?.includes( "Login unsuccessful" ) || message.parameters?.includes( "Login authentication failed" ) ||
					message.parameters?.includes( "Error logging in" ) || message.parameters?.includes( "Improperly formatted auth" ) ||
					message.parameters?.includes( "Invalid NICK" ) || message.parameters?.includes( "Invalid CAP REQ" ) ) {
					return {
						type: TwitchEventType.Error,
						data: {
							channel,
							message: message.parameters,
						},
					};
				}
				// General Notice Event
				return {
					type: TwitchEventType.Notice,
					data: {
						channel,
						msgId: message.tags[ "msg-id" ],
						message: message.parameters,
					},
				};
			case "CLEARCHAT":
				// Chat Cleared, User Timeout/Ban
				if( message.tags[ "target-user-id" ] ) {
					if( message.tags[ "ban-duration" ] ) {
						return {
							type: TwitchEventType.Timeout,
							data: {
								channel,
								channelId: message.tags[ "room-id" ],
								duration: parseInt( message.tags[ "ban-duration" ] ),
								username: message.parameters,
								userId: message.tags[ "target-user-id" ],
								timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
								extra: message.tags,
							},
						};
					}
					else {
						return {
							type: TwitchEventType.Ban,
							data: {
								channel,
								channelId: message.tags[ "room-id" ],
								username: message.parameters,
								userId: message.tags[ "target-user-id" ],
								timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
								extra: message.tags,
							},
						};
					}
				}
				else {
					return {
						type: TwitchEventType.ClearChat,
						data: {
							channel,
							channelId: message.tags[ "room-id" ],
							timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
							extra: message.tags,
						},
					};
				}
			case "CLEARMSG":
				// Message Deleted
				return {
					type: TwitchEventType.MessageDeleted,
					data: {
						channel,
						channelId: message.tags[ "room-id" ], // Room ID seems to be empty for this event
						displayName: message.tags[ "display-name" ] || message.tags[ "login" ],
						username: message.tags[ "login" ],
						id: message.tags[ "target-msg-id" ],
						message: message.parameters,
						timestamp: parseInt( message.tags[ "tmi-sent-ts" ] ),
						extra: message.tags,
					},
				};
			case "PRIVMSG":
				// Chat Message
				return handleChatMessage( message, channel as string );
			case "RECONNECT":  
				console.log( "The Twitch IRC server is about to terminate the connection for maintenance." )
				break;
			default:
				{
					// Try and parse a numeric command based on RFC1459 (https://www.rfc-editor.org/rfc/rfc1459.html)
					const commandNumber = parseInt( commandParts[ 0 ] );
					if( commandNumber >= 400 ) {
						console.debug( `Error IRC command: ${commandNumber}`, message );
						return null;
					}
					else {
						// Command & Reserved responses
						switch( commandNumber ) {
						case 1:  // Logged in (successfully authenticated). 
							// console.debug( "Username:", channel );
							return null;
						case 2: // Ignoring all other numeric messages.
						case 3:
						case 4:
						case 353: // Get the names of users in the room
						case 366: // End of names list
						case 372: // Message Of The Day
						case 375: // Message Of The Day Start
							return null;
						case 376: // End of Message Of The Day
							return { type: TwitchEventType.Connect, data: { username: commandParts[ 1 ] } };
						default:
							console.debug( "Unsupported numeric command", commandNumber );
							return null;
						}
					}
				}
				break;
			}
		}
		else {
			console.debug( "Unprocessed IRC message:", message.raw );
		}
	}
	catch( error ) {
		console.error( error );
		return {
			type: TwitchEventType.Warning,
			data: error,
		};
	}
	console.log( message );
	return null;
}

export function requestCapabilities( ws : WebSocket ) : void {
	// Request Twitch-specific Capabilities
	// TODO: consider adding twitch.tv/membership CAP to get JOIN and PART events
	ws.send( "CAP REQ :twitch.tv/tags twitch.tv/commands" );
}

export function authenticate( ws : WebSocket, username? : string, password? : string ) : void {
	const ircUsername = password ? username : `justinfan${Math.floor( ( Math.random() * 99998999 ) + 1000 )}`;
	const ircPassword = password || `INSTAFLUFF`;
	ws.send( `PASS ${ircPassword}` );
	ws.send( `NICK ${ircUsername}` );
}

export function joinChannel( ws : WebSocket, channel : string | string[] ) : void {
	if( Array.isArray( channel ) ) {
		// TODO: Check for too many channels and then split into multiple requests
		const channels = channel.map( c => `#${c}` ).join( "," );
		ws.send( `JOIN ${channels}` );
	}
	else {
		ws.send( `JOIN #${channel}` );
	}
}

export function leaveChannel( ws : WebSocket, channel : string ) : void {
	ws.send( `PART #${channel}` );
}

export function ping( ws : WebSocket ) : void {
	ws.send( `PING` );
}

export function pong( ws : WebSocket ) : void {
	ws.send( `PONG` );
}

export function sendChat( ws : WebSocket, channel : string, message : string ) : void {
	// Note: If we want to send tags like client-nonce, then the chat message should look like
	//       @client-nonce=asdf;reply-parent-msg-id PRIVMSG #channel :message text here
	ws.send( `PRIVMSG #${channel} :${message}` );
}

export function replyChat( ws : WebSocket, channel : string, messageId : string, message : string ) : void {
	// console.debug( `@reply-parent-msg-id=${messageId} PRIVMSG #${channel} :${message}` );
	ws.send( `@reply-parent-msg-id=${messageId} PRIVMSG #${channel} :${message}` );
}
