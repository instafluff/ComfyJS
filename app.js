// Comfy.JS v@VERSION
var tmi = require( "tmi.js" );
var fetch = require( "node-fetch" );
var NodeSocket = require( "ws" );

// User and global timestamp store
var timestamps = {
  global: {},
  users: {},
}

// Returns an object containing the time period since last user interaction, and last interaction from any user in `ms`.
//
// # Examples
//
// let userId = 1;
// let last = getTimePeriod(userId);
// console.log(last.any);   // print the time period since last user interacted with the commands, in ms
// console.log(last.user);  // print the time period since this user interacted with the commands, in ms; if `userId` is
//                          // is null or undefined, the field will be `null` as well.
var getTimePeriod = function( command, userId ) {
  if( !command ) {
    return {
      any: null,
      user: null,
    }
  }

  var now = new Date();
  var res = {};

  if( !timestamps.global[command] ) {
    res["any"] = 0;
  } else {
    res["any"] = now - timestamps.global[command];
  }

  // update the global since-last timestamp
  timestamps.global[command] = now;

  // store and update global since-last timestamp
  if( userId ) {
    if( !timestamps.users[userId]) {
      timestamps.users[userId] = {};
    }

    if( !timestamps.users[userId][command] ) {
      res["user"] = 0;
    } else {
      res["user"] = now - timestamps.users[userId][command];
    }

    timestamps.users[userId][command] = now
  } else {
    res["user"] = null;
  }

  return res
}

// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce( length ) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function pubsubConnect( channel, password ) {
	const heartbeatInterval = 1000 * 60; //ms between PING's
	const reconnectInterval = 1000 * 3; //ms to wait before reconnect
	let heartbeatHandle;

	password = password.replace( "oauth:", "" );

	let validation = await fetch( "https://id.twitch.tv/oauth2/validate", {
		headers: {
			"Authorization": `OAuth ${password}`
		}
	}).then( r => r.json() );

	if( !validation.client_id || !validation.scopes.includes( "channel:read:redemptions" ) || !validation.scopes.includes( "user:read:email" ) ) {
		console.error( "Invalid Password or Permission Scopes (channel:read:redemptions, user:read:email)" );
		return;
	}

	let userInfo = await fetch( "https://api.twitch.tv/helix/users?login=" + channel, {
		headers: {
			"Client-ID": validation.client_id,
			"Authorization": `Bearer ${password}`
		}
	}).then( r => r.json() );
	let channelId = userInfo.data[ 0 ].id;

	let ws;
	if( typeof window !== "undefined" ) {
		ws = new WebSocket( "wss://pubsub-edge.twitch.tv" );
	}
	else {
		ws = new NodeSocket( "wss://pubsub-edge.twitch.tv" );
	}
	ws.onopen = function( event ) {
		ws.send( JSON.stringify( { type: 'PING' } ) );
        heartbeatHandle = setInterval( () => {
			ws.send( JSON.stringify( { type: 'PING' } ) );
		}, heartbeatInterval );

		// Listen to channel points topic
		let message = {
	        type: "LISTEN",
	        nonce: nonce( 15 ),
	        data: {
	            topics: [ `channel-points-channel-v1.${channelId}` ],
	            auth_token: password
	        }
	    };
		ws.send( JSON.stringify( message ) );
    };
    ws.onerror = function( error ) {
		console.error( error );
    };
    ws.onmessage = function( event ) {
        message = JSON.parse( event.data );
		switch( message.type ) {
			case "RESPONSE":
				if( message.error === "ERR_BADAUTH" ) {
					console.error( "PubSub Authentication Failure" );
				}
				break;
			case "RECONNECT":
	            setTimeout( () => {
					pubsubConnect( channel, password )
				}, reconnectInterval );
				break;
			case "MESSAGE":
				if( message.data.topic.startsWith( "channel-points-channel" ) ) {
					let messageData = JSON.parse( message.data.message );
					if( messageData.type === "reward-redeemed" ) {
						let redemption = messageData.data.redemption;
						// console.log( redemption );
						var extra = {
				          channelId: redemption.channel_id,
				          reward: redemption.reward,
				          rewardFulfilled: redemption.status === "FULFILLED",
				          userId: redemption.user.id,
				          username: redemption.user.login,
				          displayName: redemption.user.display_name,
				          customRewardId: redemption.id,
				          timestamp: redemption.redeemed_at,
				        };
						comfyJS.onReward(
							redemption.user.display_name || redemption.user.login,
							redemption.reward.title,
							redemption.reward.cost,
                            redemption.user_input || "",
							extra
						);
					}
					// console.log( messageData );
				}
				break;
		}
    };
    ws.onclose = function() {
        clearInterval( heartbeatHandle );
        setTimeout( () => {
			pubsubConnect( channel, password )
		}, reconnectInterval );
    };
}

var mainChannel = "";
var client = null;
var isFirstConnect = true;
var reconnectCount = 0;
var comfyJS = {
  isDebug: false,
  chatModes: {},
  version: function() {
    return "@VERSION";
  },
  onError: function( error ) {
    console.error( "Error:", error );
  },
  onCommand: function( user, command, message, flags, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onCommand default handler" );
    }
  },
  onChat: function( user, message, flags, self, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onChat default handler" );
    }
  },
  onWhisper: function( user, message, flags, self, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onWhisper default handler" );
    }
  },
  onMessageDeleted: function( id, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onMessageDeleted default handler" );
    }
  },
  onJoin: function( user, self, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onJoin default handler" );
    }
  },
  onPart: function( user, self, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onPart default handler" );
    }
  },
  onHosted: function( user, viewers, autohost, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onHosted default handler" );
    }
  },
  onRaid: function( user, viewers, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onRaid default handler" );
    }
  },
  onSub: function( user, message, subTierInfo, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onSub default handler" );
    }
  },
  onResub: function( user, message, streakMonths, cumulativeMonths, subTierInfo, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onResub default handler" );
    }
  },
  onSubGift: function( gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onSubGift default handler" );
    }
  },
  onSubMysteryGift: function( gifterUser, numbOfSubs, senderCount, subTierInfo, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onSubMysteryGift default handler" );
    }
  },
  onGiftSubContinue: function( user, sender, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onGiftSubContinue default handler" );
    }
  },
  onCheer: function( message, bits, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onCheer default handler" );
    }
  },
  onChatMode: function( flags, channel ) {
    if( comfyJS.isDebug ) {
      console.log( "onChatMode default handler" );
    }
  },
  onReward: function( user, reward, cost, message, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onReward default handler" );
    }
  },
  onConnected: function( address, port, isFirstConnect ) {
  },
  onReconnect: function( reconnectCount ) {
  },
  Say: function( message, channel ) {
    if( client ) {
      if( !channel ) {
        channel = mainChannel;
      }
      client.say( channel, message )
      .catch( comfyJS.onError );
      return true;
    }
    return false;
  },
  Whisper: function( message, user ) {
    if( client ) {
      client.whisper( user, message )
      .catch( comfyJS.onError );
      return true;
    }
    return false;
  },
  DeleteMessage: function( id, channel ) {
    if( client ) {
      if( !channel ) {
        channel = mainChannel;
      }
      client.deletemessage( channel, id )
      .catch( comfyJS.onError );
      return true;
    }
    return false;
  },
  GetClient: function() {
    return client;
  },
  Init: function( username, password, channels, isDebug ) {
    channels = channels || [ username ];
    if( typeof channels === 'string' || channels instanceof String ) {
      channels = [ channels ];
    }
    if( !Array.isArray( channels ) ) {
      throw new Error( "Channels is not an array" );
    }
    comfyJS.isDebug = isDebug;
    mainChannel = channels[ 0 ];
    var options = {
      options: {
        debug: isDebug
      },
      connection: {
        reconnect: true,
        secure: true
      },
      channels: channels
    };
    if( password ) {
      options.identity = {
        username: username,
        password: password
      };
    }

    client = new tmi.client( options );
    client.on( 'roomstate', function( channel, state ) {
      try {
        var channelName = channel.replace( "#", "" );
        comfyJS.chatModes[ channelName ] = comfyJS.chatModes[ channelName ] || {};
        if( "emote-only" in state ) { comfyJS.chatModes[ channelName ].emoteOnly = state[ "emote-only" ]; }
        if( "followers-only" in state ) { comfyJS.chatModes[ channelName ].followerOnly = ( state[ "followers-only" ] >= 0 ); }
        if( "subs-only" in state ) { comfyJS.chatModes[ channelName ].subOnly = state[ "subs-only" ]; }
        if( "r9k" in state ) { comfyJS.chatModes[ channelName ].r9kMode = state[ "r9k" ]; }
        if( "slow" in state ) { comfyJS.chatModes[ channelName ].slowMode = state[ "slow" ]; }
        comfyJS.onChatMode( comfyJS.chatModes[ channelName ], channelName );
      }
      catch( error ) {
        comfyJS.onError( error );
      }
    });
    client.on( 'message', function( channel, userstate, message, self ) {
      try {
        var user = userstate[ "display-name" ] || userstate[ "username" ] || username;
        var isBroadcaster = ( "#" + userstate[ "username" ] ) === channel;
        var isMod = userstate[ "mod" ];
        var isFounder = ( userstate[ "badges" ] && userstate[ "badges" ].founder === "0" )
        var isSubscriber = isFounder || ( userstate[ "badges" ] && typeof userstate[ "badges" ].subscriber !== "undefined" ) || userstate[ "subscriber" ];
        var isVIP = ( userstate[ "badges" ] && userstate[ "badges" ].vip === "1" ) || false;
        var isHighlightedMessage = userstate[ "msg-id" ] === "highlighted-message";
        var userId = userstate[ "user-id" ];
        var messageId = userstate[ "id" ];
        var roomId = userstate[ "room-id" ];
        var badges = userstate[ "badges" ];
        var userColor = userstate[ "color" ];
        var emotes = userstate[ "emotes" ];
        var messageFlags = userstate[ "flags" ];
        var messageTimestamp = userstate[ "tmi-sent-ts" ];
        var isEmoteOnly = userstate[ "emote-only" ] || false;
        var messageType = userstate[ "message-type" ];
        var customRewardId = userstate[ "custom-reward-id" ] || null;
        var flags = {
          broadcaster: isBroadcaster,
          mod: isMod,
          founder: isFounder,
          subscriber: isSubscriber || isFounder,
          vip: isVIP,
          highlighted: isHighlightedMessage,
          customReward: !!customRewardId
        };
        var extra = {
          id: messageId,
          channel: channel.replace('#', ''),
          roomId: roomId,
          messageType: messageType,
          messageEmotes: emotes,
          isEmoteOnly: isEmoteOnly,
          userId: userId,
          username: userstate[ "username" ],
          displayName: userstate[ "display-name" ],
          userColor: userColor,
          userBadges: badges,
          customRewardId: customRewardId,
          flags: messageFlags,
          timestamp: messageTimestamp,
        };
        if( !self && message[ 0 ] === "!" ) {
          // Message is a command
          var parts = message.split( / (.*)/ );
          var command = parts[ 0 ].slice( 1 ).toLowerCase();
          var msg = parts[ 1 ] || "";
          extra["sinceLastCommand"] = getTimePeriod( command, userId );
          comfyJS.onCommand( user, command, msg, flags, extra );
        }
        else {
          if( messageType === "action" || messageType === "chat" ) {
            comfyJS.onChat( user, message, flags, self, extra );
          }
          else if( messageType === "whisper" ) {
            comfyJS.onWhisper( user, message, flags, self, extra );
          }
        }
      }
      catch( error ) {
        comfyJS.onError( error );
      }
    });
    client.on( 'messagedeleted', function( channel, username, deletedMessage, userstate ) {
      try {
        var messageId = userstate[ "target-msg-id" ];
        var roomId = userstate[ "room-id" ];
        var extra = {
            id: messageId,
            roomId: roomId,
            username: username,
            message: deletedMessage
        };
        comfyJS.onMessageDeleted( messageId, extra );
      }
      catch( error ) {
        comfyJS.onError( error );
      }
    });
    client.on( 'join', function( channel, username, self ) {
      var extra = {
        channel: channel.replace('#', ''),
      };
      comfyJS.onJoin( username, self, extra );
    });
    client.on( 'part', function( channel, username, self ) {
      var extra = {
        channel: channel.replace('#', ''),
      };
      comfyJS.onPart( username, self, extra );
    });
    client.on( 'hosted', function( channel, username, viewers, autohost ) {
      var extra = {
        channel: channel.replace('#', ''),
      };
      comfyJS.onHosted( username, viewers, autohost, extra );
    });
    client.on( 'raided', function( channel, username, viewers ) {
      var extra = {
        channel: channel.replace('#', ''),
      };
      comfyJS.onRaid( username, viewers, extra );
    });
    client.on( 'cheer', function( channel, userstate, message ) {
      var bits = ~~userstate['bits'];
      var roomId = userstate[ "room-id" ];
      var user = userstate[ "display-name" ] || userstate[ "username" ] || userstate[ "login" ];
      var userId = userstate[ "user-id" ];
      var isBroadcaster = ( "#" + userstate[ "username" ] ) === channel;
      var isMod = userstate[ "mod" ];
      var isFounder = ( userstate[ "badges" ] && userstate[ "badges" ].founder === "0" )
      var isSubscriber = isFounder || ( userstate[ "badges" ] && typeof userstate[ "badges" ].subscriber !== "undefined" ) || userstate[ "subscriber" ];
      var isVIP = ( userstate[ "badges" ] && userstate[ "badges" ].vip === "1" ) || false;
      var flags = {
        broadcaster: isBroadcaster,
        mod: isMod,
        founder: isFounder,
        subscriber: isSubscriber,
        vip: isVIP
      };
      var extra = {
        id: userstate['id'],
        channel: channel.replace('#', ''),
        roomId: roomId,
        userId: userId,
        username: userstate[ 'username' ],
        userColor: userstate['color'],
        userBadges: userstate['badges'],
        displayName: userstate[ 'display-name' ],
        messageEmotes: userstate['emotes'],
        subscriber: userstate['subscriber'],
      };

      comfyJS.onCheer( user, message, bits, flags, extra );
    });
    client.on( 'subscription', function( channel, username, methods, message, userstate ) {
      var extra = {
        id: userstate['id'],
        roomId: userstate['room-id'],
        messageType: userstate['message-type'],
        messageEmotes: userstate['emotes'],
        userId: userstate['user-id'],
        username: userstate[ 'login' ],
        displayName: userstate[ 'display-name' ],
        userColor: userstate['color'],
        userBadges: userstate['badges']
      };

      comfyJS.onSub( username, message, methods, extra );
    });
    client.on( 'resub', function( channel, username, streakMonths, message, userstate, methods ) {
      var cumulativeMonths = ~~userstate[ 'msg-param-cumulative-months' ];
      var extra = {
        id: userstate['id'],
        roomId: userstate['room-id'],
        messageType: userstate['message-type'],
        messageEmotes: userstate['emotes'],
        userId: userstate['user-id'],
        username: userstate[ 'login' ],
        displayName: userstate[ 'display-name' ],
        userColor: userstate['color'],
        userBadges: userstate['badges']
      };

      comfyJS.onResub( username, message, streakMonths, cumulativeMonths, methods, extra );
    });
    client.on( 'subgift', function( channel, gifterUser, streakMonths, recipientUser, methods, userstate ) {
      var senderCount = ~~userstate[ 'msg-param-sender-count' ];
      var extra = {
        id: userstate['id'],
        roomId: userstate['room-id'],
        messageType: userstate['message-type'],
        messageEmotes: userstate['emotes'],
        userId: userstate['user-id'],
        username: userstate[ 'login' ],
        displayName: userstate[ 'display-name' ],
        userColor: userstate['color'],
        userBadges: userstate['badges'],
        recipientDisplayName: userstate["msg-param-recipient-display-name"],
        recipientUsername: userstate["msg-param-recipient-user-name"],
        recipientId: userstate["msg-param-recipient-id"]
      };

      comfyJS.onSubGift( gifterUser, streakMonths, recipientUser, senderCount, methods, extra );
    });
    client.on( 'submysterygift', function( channel, gifterUser, numbOfSubs, methods, userstate ) {
      var senderCount = ~~userstate[ 'msg-param-sender-count' ];

      var extra = {
        id: userstate['id'],
        roomId: userstate['room-id'],
        messageType: userstate['message-type'],
        messageEmotes: userstate['emotes'],
        userId: userstate['user-id'],
        username: userstate[ 'login' ],
        displayName: userstate[ 'display-name' ],
        userColor: userstate['color'],
        userBadges: userstate['badges'],
        recipientDisplayName: userstate["msg-param-recipient-display-name"],
        recipientUsername: userstate["msg-param-recipient-user-name"],
        recipientId: userstate["msg-param-recipient-id"],
        userMassGiftCount: ~~userstate[ 'msg-param-mass-gift-count' ]
      };

      comfyJS.onSubMysteryGift( gifterUser, numbOfSubs, senderCount, methods, extra );
    });
    client.on( 'giftpaidupgrade', function( channel, username, sender, userstate ) {
      var extra = {
        id: userstate['id'],
        roomId: userstate['room-id'],
        messageType: userstate['message-type'],
        messageEmotes: userstate['emotes'],
        userId: userstate['user-id'],
        username: userstate[ 'login' ],
        displayName: userstate[ 'display-name' ],
        userColor: userstate['color'],
        userBadges: userstate['badges'],
        gifterUsername: userstate['msg-param-sender-login'],
        gifterDisplayName: userstate['msg-param-sender-name']
      };

      comfyJS.onGiftSubContinue( username, sender, extra);
    });
    client.on( 'connected', function( address, port ) {
      console.log( 'Connected:' + address + ':' + port );
      comfyJS.onConnected( address, port, isFirstConnect );
      isFirstConnect = false;
    });
    client.on( 'reconnect', function() {
      console.log( 'Reconnecting' );
      reconnectCount++;
      comfyJS.onReconnect( reconnectCount );
    });
    client.connect()
    .catch( comfyJS.onError );

	// Setup PubSub (https://github.com/twitchdev/pubsub-javascript-sample)
	if( password ) {
		pubsubConnect( mainChannel, password );
	}
  },
  Disconnect: function() {
    client.disconnect()
    .catch( comfyJS.onError );
  }
};

// Expose everything, for browser and Node..
if (typeof module !== "undefined" && module.exports) {
    module.exports = comfyJS;
}

if (typeof window !== "undefined") {
    window.ComfyJS = comfyJS;
    tmi = window.tmi;
}
