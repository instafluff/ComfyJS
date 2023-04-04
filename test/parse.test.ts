/* eslint-disable no-undef */
import { rawMessages } from "./const";
import { parseMessage } from "../src/parse";

describe( "parseMessage", () => {
	it( "should return an object with the correct raw property", () => {
		const message = "test";
		const result = parseMessage( message );
		expect( result.raw ).toEqual( message );
	} );
  
	it( "should parse tags correctly", () => {
		const message = "@emote-only=0;followers-only=-1;r9k=0;room-id=83118047;slow=0;subs-only=0 test";
		const result = parseMessage( message );
		expect( result.tags ).toEqual( {
			"emote-only": "0",
			"followers-only": "-1",
			"r9k": "0",
			"room-id": "83118047",
			"slow": "0",
			"subs-only": "0",
		} );
	} );
  
	it( "should parse source correctly", () => {
		const message = ":nick!user@host test";
		const result = parseMessage( message );
		expect( result.source ).toEqual( "nick!user@host" );
	} );
  
	it( "should parse command correctly", () => {
		const message = "test";
		const result = parseMessage( message );
		expect( result.command ).toEqual( "test" );
	} );
  
	it( "should parse parameters correctly", () => {
		const message = "test :parameters";
		const result = parseMessage( message );
		expect( result.parameters ).toEqual( "parameters" );
	} );
  
	it( "should handle messages with no tags or source", () => {
		const message = "test";
		const result = parseMessage( message );
		expect( result.tags ).toEqual( {} );
		expect( result.source ).toEqual( null );
	} );
  
	it( "should handle messages with no parameters", () => {
		const message = ":nick!user@host test";
		const result = parseMessage( message );
		expect( result.parameters ).toEqual( null );
	} );

	it( "should parse a ping message", () => {
		const parsedMessage = parseMessage( rawMessages[ "ping" ] );
		expect( parsedMessage ).toEqual( {
			"command": "PING",
			"source": "tmi.twitch.tv",
			"parameters": null,
			"raw": rawMessages[ "ping" ],
			"tags": {},
		} );
	} );

	it( "should parse a pong message", () => {
		const parsedMessage = parseMessage( rawMessages[ "pong" ] );
		expect( parsedMessage ).toEqual( {
			"command": "PONG",
			"source": "tmi.twitch.tv",
			"parameters": null,
			"raw": rawMessages[ "pong" ],
			"tags": {},
		} );
	} );

	it( "should parse a cap message", () => {
		const parsedMessage = parseMessage( rawMessages[ "cap" ] );
		expect( parsedMessage ).toEqual( {
			"command": "CAP * ACK",
			"source": "tmi.twitch.tv",
			"parameters": "twitch.tv/tags twitch.tv/commands",
			"raw": rawMessages[ "cap" ],
			"tags": {},
		} );
	} );

	it( "should parse a join message", () => {
		const parsedMessage = parseMessage( rawMessages.join );
		expect( parsedMessage ).toEqual( {
			"command": "JOIN #instafluff",
			"source": "justinfan48698855!justinfan48698855@justinfan48698855.tmi.twitch.tv",
			"parameters": null,
			"raw": rawMessages.join,
			"tags": {},
		} );
	} );

	it( "should parse a part message", () => {
		const parsedMessage = parseMessage( rawMessages.part );
		expect( parsedMessage ).toEqual( {
			"command": "PART #instafriend",
			"source": "instafluff!instafluff@instafluff.tmi.twitch.tv",
			"parameters": null,
			"raw": rawMessages.part,
			"tags": {},
		} );
	} );

	it( "should parse an announcement message", () => {
		const parsedMessage = parseMessage( rawMessages.announcement );
		expect( parsedMessage ).toEqual( {
			"command": "USERNOTICE #instafluff",
			"source": "tmi.twitch.tv",
			"parameters": "chat is amazing",
			"raw": rawMessages.announcement,
			"tags": {
				"badge-info": "subscriber/62",
				"badges": "moderator/1,subscriber/12,glitchcon2020/1",
				"color": "#DAA520",
				"display-name": "sparky_pugwash",
				"emotes": "",
				"flags": "",
				"id": "a4b962ff-b57c-4aa7-a999-db314fd3cac7",
				"login": "sparky_pugwash",
				"mod": "1",
				"msg-id": "announcement",
				"msg-param-color": "PRIMARY",
				"room-id": "83118047",
				"subscriber": "1",
				"system-msg": "",
				"tmi-sent-ts": "1678998960841",
				"user-id": "153060311",
				"user-type": "mod",
			},
		} );
	} );

	it( "should successfully parse all example events", () => {
		for( const key in rawMessages ) {
			const parsedMessage = parseMessage( rawMessages[ key ] );
			expect( parsedMessage ).toBeDefined();
		}
	} );
} );
