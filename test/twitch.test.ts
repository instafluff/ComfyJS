/* eslint-disable no-undef */
import { rawMessages } from "./const";
import { processMessage, TwitchEventType } from "../src/twitch";
import { parseMessage } from "../src/parse";

describe( "processMessage", () => {
	it( "should process a ping message", () => {
		const processedMessage = processMessage( parseMessage( rawMessages[ "ping" ] ) );
		expect( processedMessage ).toEqual( {
			"type": TwitchEventType.Ping,
		} );
	} );

	it( "should process a pong message", () => {
		const processedMessage = processMessage( parseMessage( rawMessages[ "pong" ] ) );
		expect( processedMessage ).toEqual( {
			"type": TwitchEventType.Pong,
		} );
	} );

	it( "returns null for a cap message", () => {
		const processedMessage = processMessage( parseMessage( rawMessages[ "cap" ] ) );
		expect( processedMessage ).toBeNull();
	} );

	it( "should process a join message", () => {
		const processedMessage = processMessage( parseMessage( rawMessages.join ) );
		expect( processedMessage ).toEqual( {
			"type": TwitchEventType.Join,
			"data": {
				"channel": "#instafluff",
				"username": "justinfan48698855",
			},
		} );
	} );

	it( "should process a leave message", () => {
		const processedMessage = processMessage( parseMessage( rawMessages.part ) );
		expect( processedMessage ).toEqual( {
			"type": TwitchEventType.Leave,
			"data": {
				"channel": "#instafriend",
				"username": "instafluff",
			},
		} );
	} );

	it( "should process a roomstate message", () => {
		const processedMessage = processMessage( parseMessage( rawMessages.roomstate ) );
		expect( processedMessage ).toEqual( {
			"type": TwitchEventType.RoomState,
			"data": {
				"channel": "#instafluff",
				"channelId": "83118047",
				"emoteOnly": false,
				"followersOnly": false,
				"r9k": false,
				"slow": false,
				"subscribersOnly": false,
			},
		} );
	} );

	it( "should get the right flag when enabling emote-only", () => {
		processMessage( parseMessage( rawMessages.roomstate ) );
		const processedMessage = processMessage( parseMessage( rawMessages[ "roomstate-emoteonly-on" ] ) );
		expect( processedMessage?.data.emoteOnly ).toBe( true );
	} );

	it( "should get the right flag when disabling emote-only", () => {
		processMessage( parseMessage( rawMessages.roomstate ) );
		processMessage( parseMessage( rawMessages[ "roomstate-emoteonly-on" ] ) );
		const processedMessage = processMessage( parseMessage( rawMessages[ "roomstate-emoteonly-off" ] ) );
		expect( processedMessage?.data.emoteOnly ).toBe( false );
	} );
} );
