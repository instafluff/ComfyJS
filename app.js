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

/**
 * 
 * @param { string } password 
 * @param { (arg: string[] ) => string[] } requiredScopes
 * @returns { string | null }
 */
async function validatePassword( password ) {
  let err = null;
  let validation = await fetch( "https://id.twitch.tv/oauth2/validate", {
    headers: {
      "Authorization": `OAuth ${password}`
    }
  }).then( r => r.json() )
  .catch( e => (err = e, null));

  if ( err || validation === null ) {
    console.error( "Error fetching validation: ", err );
    return null;
  }

  if ( !validation.client_id ) {
    console.error( "Invalid Password" );
    return null;
  }

  return validation;
}

/**
 * 
 * @param { string } channel 
 * @param { string } clientId 
 * @param { string } password 
 * @returns { string | null }
 */
async function fetchChannelIdAsync( channel, clientId, password ) {
  let err;
  let userInfo = await fetch( "https://api.twitch.tv/helix/users?login=" + channel, {
    headers: {
      "Client-ID": clientId,
      "Authorization": `Bearer ${password}`
    }
  }).then( r => r.json() )
  .catch( e => (err = e, null));

  if ( err || userInfo === null ) {
    console.error( "Error fetching user info: ", err );
    return null;
  }

  return userInfo.data[ 0 ].id;
}

/**
 * 
 * @param { string } type 
 * @param { string } version 
 * @param { string } clientId 
 * @param { string } password 
 * @param { string } channelId 
 * @param { string } sessionId 
 * @returns { boolean } was the subscription successful
 */
async function subscribeToEventAsync( type, version, clientId, userId, password, channelId, sessionId ) {
  try {
    const subscriptionResult = await fetch( "https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${password}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify( {
        type,
        version,
        condition: {
          moderator_user_id: userId,
          user_id: userId,
          broadcaster_user_id: channelId,
        },
        transport: {
          method: "websocket",
          session_id: sessionId
        }
      } )
    }).then( r => r.text() );
    // console.log( type, version, subscriptionResult );
    return true;
  }
  catch( error ) {
    console.error( error );
  }
  return false;
}

async function eventSubConnectAsync( channel, password, clientId = null, channelId = null, connectionName = null, sessionId = null, clearObject = null) {
  const scopesToEventSubs = {
    "moderator:read:followers": "followEvent",
    "channel:read:redemptions": "redemptionEvent",
    "channel:manage:redemptions": "redemptionEvent",
    "channel:read:hype_train": "hypeTrainEvent",
    "channel:manage:hype_train": "hypeTrainEvent",
    "moderator:read:shoutouts": "shoutoutEvent",
    "moderator:manage:shoutouts": "shoutoutEvent",
    "user:read:whispers": "whisperEvent",
    "user:manage:whisper": "whisperEvent",
    "channel:read:polls": "channelPollEvent",
    "channel:manage:polls": "channelPollEvent",
    "channel:read:predictions": "channelPredictionEvent",
    "channel:manage:predictions": "channelPredictionEvent",
  };
  const eventSubToSubscriptions = {
    "followEvent": [
      [ "channel.follow", "2" ],
    ],
    "redemptionEvent": [
      [ "channel.channel_points_automatic_reward_redemption.add", "1" ],
      [ "channel.channel_points_custom_reward_redemption.add", "1" ],
    ],
    "hypeTrainEvent": [
      [ "channel.hype_train.begin", "1" ],
      [ "channel.hype_train.progress", "1" ],
      [ "channel.hype_train.end", "1" ],
    ],
    "shoutoutEvent": [
      [ "channel.shoutout.create", "1" ],
    ],
    "whisperEvent": [
      [ "user.whisper.message", "1" ],
    ],
    "channelPollEvent": [
      [ "channel.poll.begin", "1" ],
      [ "channel.poll.progress", "1" ],
      [ "channel.poll.end", "1" ],
    ],
    "channelPredictionEvent": [
      [ "channel.prediction.begin", "1" ],
      [ "channel.prediction.progress", "1" ],
      [ "channel.prediction.lock", "1" ],
      [ "channel.prediction.end", "1" ],
    ],
  };
  
  if( !password ) {
    console.error( "No OAuth password provided" );
    return;
  }
	password = password.replace( "oauth:", "" );
  const userValidation = await validatePassword( password );

  if ( !clientId ) {
    // if validation failed, return
    if ( userValidation === null ) {
      return;
    }
    clientId = userValidation.client_id;
  }

  if ( !channelId ) {
    channelId = await fetchChannelIdAsync( channel, clientId, password );
    if ( channelId === null ) {
      return;
    }
  }

  let keepAliveSeconds = 30;
  if (!connectionName) {
    connectionName = "wss://eventsub.wss.twitch.tv/ws";
    if ( keepAliveSeconds !== 30 ) {
      connectionName += "?keepalive_timeout_seconds=" + keepAliveSeconds;
    }
  }

  const ws = typeof window !== "undefined"
    ? new WebSocket( connectionName )
    : new NodeSocket( connectionName );
  
  /** @type { NodeJS.Timeout } */
  let reconnectTimeout = null;

  // this way if we need to reconnect we can call this function again in returned function
  clearObject = clearObject || {};
  clearObject.onDisconnect = (reconnect = true) => {
    clearTimeout(reconnectTimeout);
    ws.close();
    if (reconnect) {
      // Reconnecting
      eventSubConnectAsync( channel, password, clientId, channelId, connectionName, sessionId, clearObject );
    }
    else {
      console.log( "Disconnected from EventSub" );
    }
  }

  clearObject.messages = clearObject.messages || {};

  ws.onerror = function( error ) {
    console.error( error );
    clearObject.onDisconnect(false);
  }

  ws.onopen = function( event ) {
    if ( comfyJS && comfyJS.isDebug ) {
      console.log( "Connected to EventSub" );
    }
  }

  ws.onmessage = function( event ) {
    try {
      const message = JSON.parse(event.data);
      if( message.type === "PING" ) {
        ws.send( JSON.stringify( { type: 'PONG' } ) );
        return;
      }
      // console.log( message );
      switch( message.metadata.message_type ) {
        case "session_welcome":
          {
            sessionId = message.payload.session.id;
            
            // subscribe to all the events based on the user scopes available
            let eventSubs = userValidation.scopes.map( scope => scopesToEventSubs[ scope ] ).filter( x => !!x );
            eventSubs = eventSubs.filter((v,i) => eventSubs.indexOf(v) === i);
            const subscriptions = eventSubs.map( x => eventSubToSubscriptions[ x ] ).flat();
            // console.log( subscriptions );

            Promise.all(
              subscriptions.map(( [ type, version ] ) =>
                subscribeToEventAsync( type, version, clientId, userValidation.user_id, password, channelId, sessionId )
              )
            );
            break;
          }
        case "session_keepalive":
          {
            console.debug( "Keepalive received" );
            break;
          }
        case "session_reconnect":
          {
            connectionName = message.payload.session.reconnect_url;
            clearTimeout(reconnectTimeout);
            clearObject.onDisconnect();
            break;
          }
        case "revocation":
          {
            if (!subscribtions.map( ( [ type, _ ] ) => type).includes(message.payload.type)) {
              break;
            }
            clearObject.onDisconnect(false);
            break;
          }
        case "notification":
          {
            const messageId = message.metadata.message_id;
            if( clearObject.messages[messageId] ) {
              break;
            }

            clearObject.messages[messageId] = true;
            setTimeout( () => delete clearObject.messages[messageId], keepAliveSeconds * 1000 );

            // Handle the message based on type
            switch( message.payload.subscription.type ) {
              // Channel Points
              case "channel.channel_points_custom_reward_redemption.add":
              case "channel.channel_points_automatic_reward_redemption.add":
              {
                const redemption = message.payload.event;
                const reward = redemption.reward;
                const rewardObj = {
                  id: reward.id,
                  channelId,
                  title: "title" in reward ? reward.title : null,
                  prompt: "prompt" in reward ? reward.prompt : null,
                  message:  redemption.user_input || "",
                  cost: reward.cost,
                };
                const extra = {
                  channelId: redemption.broadcaster_user_id,
                  channelName: redemption.broadcaster_user_login,
                  channelDisplayName: redemption.broadcaster_user_name,
                  reward: rewardObj,
                  rewardFulfilled: message.payload.subscription.type === "channel.channel_points_automatic_reward_redemption.add"
                    || redemption.status.toLowerCase() === "fulfilled",
                  userId: redemption.user_id,
                  username: redemption.user_login,
                  displayName: redemption.user_name,
                  customRewardId: redemption.id,
                  redeemed_at: redemption.redeemed_at,
                };

                comfyJS.onReward(
                  extra.displayName || extra.username,
                  rewardObj.title,
                  rewardObj.cost,
                  rewardObj.message,
                  extra,
                );
              }
              break;
              // Hype Train
              case "channel.hype_train.begin":
              case "channel.hype_train.progress":
              case "channel.hype_train.end":
              {
                const event = message.payload.event;
                const extra = {
                  ...event,
                  id: event.id,
                  channelId: event.broadcaster_user_id,
                  channelName: event.broadcaster_user_login,
                  channelDisplayName: event.broadcaster_user_name,
                  level: event.level,
                  progressToNextLevel: event.progress,
                  goalToNextLevel: event.goal,
                  totalHype: event.total,
                  isGoldenKappaTrain: event.is_golden_kappa_train,
                  hypeEvent: event,
                  startDate: event.started_at,
                  endDate: event.expires_at || event.ended_at,
                };
                const timeRemaining = new Date( extra.endDate ) - new Date();

                switch( message.payload.subscription.type ) {
                  case "channel.hype_train.begin":
                    comfyJS.onHypeTrain(
                      "begin",
                      event.level,
                      event.progress || 0,
                      event.goal,
                      event.total,
                      timeRemaining,
                      extra
                    );
                    break;
                  case "channel.hype_train.progress":
                    comfyJS.onHypeTrain(
                      "progress",
                      event.level,
                      event.progress || 0,
                      event.goal,
                      event.total,
                      timeRemaining,
                      extra
                    );
                    break;
                  case "channel.hype_train.end":
                    comfyJS.onHypeTrain(
                      "end",
                      event.level,
                      event.progress || 0,
                      event.goal,
                      event.total,
                      timeRemaining,
                      extra
                    );
                    break;
                }
              }
              break;
              // Shoutout Events
              case "channel.shoutout.create":
              {
                // event: {
                //   broadcaster_user_id: '83118047',
                //   broadcaster_user_login: 'instafluff',
                //   broadcaster_user_name: 'Instafluff',
                //   to_broadcaster_user_id: '112375357',
                //   to_broadcaster_user_login: 'lana_lux',
                //   to_broadcaster_user_name: 'Lana_Lux',
                //   moderator_user_id: '83118047',
                //   moderator_user_login: 'instafluff',
                //   moderator_user_name: 'Instafluff',
                //   viewer_count: 94,
                //   started_at: '2025-02-02T21:07:49Z',
                //   cooldown_ends_at: '2025-02-02T21:09:49Z',
                //   target_cooldown_ends_at: '2025-02-02T22:07:49Z'
                // }
                const event = message.payload.event;
                const extra = {
                  ...event,
                  channelId: event.to_broadcaster_user_id,
                  channelName: event.to_broadcaster_user_login,
                  channelDisplayName: event.to_broadcaster_user_name,
                  shouterChannelId: event.broadcaster_user_id,
                  shouterChannelName: event.broadcaster_user_login,
                  shouterChannelDisplayName: event.broadcaster_user_name,
                  viewerCount: event.viewer_count,
                  startedAt: event.started_at,
                  cooldownEndsAt: event.cooldown_ends_at,
                  targetCooldownEndsAt: event.target_cooldown_ends_at,
                };
                // Cooldown lasts one minute
                const timeRemaining = new Date( extra.startedAt ) - new Date() + 60000;
                
                comfyJS.onShoutout( extra.channelDisplayName, extra.viewerCount, timeRemaining, extra );
              }
              break;
              // Whisper Events (In-Progress)
              case "user.whisper.message":
              {
                // event: {
                //   from_user_id: '153060311',
                //   from_user_login: 'sparky_pugwash',
                //   from_user_name: 'sparky_pugwash',
                //   to_user_id: '83118047',
                //   to_user_login: 'instafluff',
                //   to_user_name: 'Instafluff',
                //   whisper_id: '4ac0349e-28f8-4469-b27f-c23263176260',
                //   whisper: [Object]
                // }
                const event = message.payload.event;
                const extra = {
                  fromUserId: event.from_user_id,
                  fromUserLogin: event.from_user_login,
                  fromUserName: event.from_user_name,
                  toUserId: event.to_user_id,
                  toUserLogin: event.to_user_login,
                  toUserName: event.to_user_name,
                  whisperId: event.whisper_id,
                  whisper: event.whisper,
                };

                // user, message, flags, self, extra
                comfyJS.onWhisper(
                  event.from_user_name || event.from_user_login,
                  event.whisper.text,
                  {},
                  false,
                  extra
                );
              }
              break;
              // Poll Events
              case "channel.poll.begin":
              case "channel.poll.progress":
              case "channel.poll.end":
              {
                const event = message.payload.event;
                const extra = {
                  ...event,
                  channelId: event.broadcaster_user_id,
                  channelName: event.broadcaster_user_login,
                  channelDisplayName: event.broadcaster_user_name,
                  pollId: event.id,
                  title: event.title,
                  choices: event.choices,
                  bitsVoting: event.bits_voting,
                  bitsPerVote: event.bits_per_vote,
                  startDate: event.started_at,
                  endDate: event.ends_at || event.ended_at,
                  status: event.status,
                };
                const pollChoices = event.choices.map( choice => choice.title );
                const pollVotes = event.choices.map( choice => ( choice.bits_votes || 0 ) + ( choice.channel_points_votes || 0 ) + ( choice.votes || 0 ) );
                const timeRemaining = new Date( extra.endDate ) - new Date();

                switch( message.payload.subscription.type ) {
                  case "channel.poll.begin":
                    comfyJS.onPoll(
                      "begin",
                      event.title,
                      pollChoices,
                      pollVotes,
                      timeRemaining,
                      extra
                    );
                    break;
                  case "channel.poll.progress":
                    comfyJS.onPoll(
                      "progress",
                      event.title,
                      pollChoices,
                      pollVotes,
                      timeRemaining,
                      extra
                    );
                    break;
                  case "channel.poll.end":
                    comfyJS.onPoll(
                      "end",
                      event.title,
                      pollChoices,
                      pollVotes,
                      0,
                      extra
                    );
                    break;
                }
              }
              break;
              // Prediction Events
              case "channel.prediction.begin":
              case "channel.prediction.progress":
              case "channel.prediction.lock":
              case "channel.prediction.end":
              {
                const event = message.payload.event;
                const extra = {
                  ...event,
                  channelId: event.broadcaster_user_id,
                  channelName: event.broadcaster_user_login,
                  channelDisplayName: event.broadcaster_user_name,
                  predictionId: event.id,
                  title: event.title,
                  outcomes: event.outcomes,
                  startDate: event.started_at,
                  lockDate: event.locks_at || event.locked_at,
                  endDate: event.ends_at || event.ended_at,
                  status: event.status,
                };
                const predictionOutcomes = event.outcomes.map( outcome => outcome.title );
                const topPredictors = [];
                for( const outcome of event.outcomes ) {
                  if( !outcome.top_predictors ) {
                    topPredictors.push( [] );
                    continue;
                  }
                  const users = [];
                  for( const user of outcome.top_predictors ) {
                    users.push( {
                      user: user.user_name || user.user_login,
                      userId: user.user_id,
                      points: user.channel_points_used || 0,
                      won: user.channel_points_won || 0,
                    } );
                  }
                  topPredictors.push( users );
                }
                const timeRemaining = new Date( extra.lockDate ) - new Date();
                
                switch( message.payload.subscription.type ) {
                  case "channel.prediction.begin":
                    comfyJS.onPrediction(
                      "begin",
                      event.title,
                      predictionOutcomes,
                      topPredictors,
                      timeRemaining,
                      extra
                    );
                    break;
                  case "channel.prediction.progress":
                    comfyJS.onPrediction(
                      "progress",
                      event.title,
                      predictionOutcomes,
                      topPredictors,
                      timeRemaining,
                      extra
                    );
                    break;
                  case "channel.prediction.lock":
                    comfyJS.onPrediction(
                      "lock",
                      event.title,
                      predictionOutcomes,
                      topPredictors,
                      0,
                      extra
                    );
                    break;
                  case "channel.prediction.end":
                    comfyJS.onPrediction(
                      "end",
                      event.title,
                      predictionOutcomes,
                      topPredictors,
                      0,
                      extra
                    );
                    break;
                }
              }
              break;
              default:
                console.debug( "Unhandled EventSub Type", message.payload.subscription.type );
                console.debug( message.payload );
              break;
            }

            break;
          }
        default:
          break;
      }
    }
    catch( error ) {
      console.error( error );
    }
  }

  return () => clearObject.onDisconnect(false);
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
                        var reward = redemption.reward;
                        var rewardObj = {
                          id: reward.id,
                          channelId: reward.channel_id,
                          title: reward.title,
                          prompt: reward.prompt,
                          cost: reward.cost,
                          userInputRequired: reward.is_user_input_required,
                          subOnly: reward.is_sub_only,
                          image: {
                            url1x: reward.image?reward.image.url_1x:null,
                            url2x: reward.image?reward.image.url_2x:null,
                            url4x: reward.image?reward.image.url_4x:null,
                          },
                          defaultImage: {
                            url1x: reward.default_image.url_1x,
                            url2x: reward.default_image.url_2x,
                            url4x: reward.default_image.url_4x,
                          },
                          backgroundColor: reward.background_color,
                          enabled: reward.is_enabled,
                          paused: reward.is_paused,
                          inStock: reward.is_in_stock,
                          maxPerStream: {
                            enabled: reward.max_per_stream.is_enabled,
                            maxPerStream: reward.max_per_stream.max_per_stream,
                          },
                          shouldRedemptionsSkipRequestQueue: reward.should_redemptions_skip_request_queue,
                          templateId: reward.template_id,
                          updatedForIndicatorAt: reward.updated_for_indicator_at,
                          maxPerUserPerStream: {
                            enabled: reward.max_per_user_per_stream.is_enabled,
                            maxPerUserPerStream: reward.max_per_user_per_stream.max_per_user_per_stream,
                          },
                          globalCooldown: {
                            enabled: reward.global_cooldown.is_enabled,
                            globalCooldownSeconds: reward.global_cooldown.global_cooldown_seconds,
                          },
                          redemptionsRedeemedCurrentStream: reward.redemptions_redeemed_current_stream,
                          cooldownExpiresAt: reward.cooldown_expires_at,
                        };
						var extra = {
				          channelId: redemption.channel_id,
				          reward: rewardObj,
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
var channelPassword = "";
var channelInfo = null;
var client = null;
var isFirstConnect = true;
var reconnectCount = 0;
// works as both a flag and a function to disconnect from eventsub
/** @type {(() => void) | boolean | undefined | null } */
var eventsubDisconnect = null;
var comfyJS = {
  isDebug: false,
  useEventSub: true, // set to false to use PubSub
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
  onBan: function (bannedUsername, extra) {
    if ( comfyJS.isDebug ){
      console.log ( "onBan default handler" );
    }
  },
  onTimeout: function (timedOutUsername, durationInSeconds, extra) {
    if ( comfyJS.isDebug ){
      console.log ( "onTimeout default handler" );
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
  onCheer: function( user, message, bits, flags, extra ) {
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
  onShoutout: function( channel, viewerCount, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onShoutout default handler" );
    }
  },
  onHypeTrain: function( type, level, progress, goal, total, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onHypeTrain default handler" );
    }
  },
  onPoll: function( type, title, choices, votes, timeRemainingInSeconds, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onPoll default handler" );
    }
  },
  onPrediction: function( type, title, outcomes, topPredictors, timeRemainingInSeconds, extra ) {
    if( comfyJS.isDebug ) {
      console.log( "onPrediction default handler" );
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
  Reply: function (parentId, message, channel) {
    if (client) {
      if (!channel) {
        channel = mainChannel;
      }
      const replyMessage = `@reply-parent-msg-id=${parentId} PRIVMSG #${channel} :${message}`;
      client.ws.send(replyMessage);
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
  Announce: function( message, channel, color = null ) {
    if( client ) {
      if( !channel ) {
        channel = mainChannel;
      }
      client.say( channel, `/announce ${message}` )
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
    eventsubDisconnect = null;
    mainChannel = channels[ 0 ];
    var options = {
      options: {
        debug: isDebug,
        skipUpdatingEmotesets: true
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
      channelPassword = password;
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
          userState: userstate,
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
        } else if (!self && message.split(" ").length > 0 && message[0] === "@" && message.split(" ")[1][0] === "!"){
          // Message is also a command: @user !command
          // Remove first word (@mention)
          var parts = message.split(" ");
          var command = parts[1].slice(1).toLowerCase();
          var msg = parts.slice(2).join(" ");
          extra["sinceLastCommand"] = getTimePeriod(command, userId);
          comfyJS.onCommand(user, command, msg, flags, extra);
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
    client.on( 'ban', function(channel, username, reason, userstate){
      try{
        var bannedUsername = username;
        var roomId = userstate[ "room-id" ];
        var bannedUserId = userstate[ "target-user-id" ]
        var extra = {
          roomId,
          username,
          bannedUserId
        }
        comfyJS.onBan( bannedUsername, extra )
      }
      catch( error )  {
        comfyJS.onError( error );
      }
    });
    client.on( 'timeout', function(channel, username, reason, duration, userstate){
      try{
        var timedOutUsername = username;
        var durationInSeconds = duration;
        var roomId = userstate[ "room-id" ];
        var timedOutUserId = userstate[ "target-user-id" ]
        var extra = {
          roomId,
          username,
          timedOutUserId
        }
        comfyJS.onTimeout( timedOutUsername, durationInSeconds, extra )
      }
      catch( error )  {
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
        userState: userstate,
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
        userBadges: userstate['badges'],
        userState: userstate,
        channel: channel.replace('#', ''),
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
        userBadges: userstate['badges'],
        channel: channel.replace('#', ''),
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
        userState: userstate,
        recipientDisplayName: userstate["msg-param-recipient-display-name"],
        recipientUsername: userstate["msg-param-recipient-user-name"],
        recipientId: userstate["msg-param-recipient-id"],
        channel: channel.replace('#', ''),
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
        userState: userstate,
        recipientDisplayName: userstate["msg-param-recipient-display-name"],
        recipientUsername: userstate["msg-param-recipient-user-name"],
        recipientId: userstate["msg-param-recipient-id"],
        userMassGiftCount: ~~userstate[ 'msg-param-mass-gift-count' ],
        channel: channel.replace('#', ''),
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
        userState: userstate,
        gifterUsername: userstate['msg-param-sender-login'],
        gifterDisplayName: userstate['msg-param-sender-name'],
        channel: channel.replace('#', ''),
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
    if ( comfyJS.useEventSub ) {
      eventSubConnectAsync( mainChannel, password )
        .then( disconnect => {
          if( typeof eventsubDisconnect !== "boolean" ) {
            if( typeof disconnect !== "function" ) {
              throw new Error( "EventSub connection failed" );
            }
            eventsubDisconnect = disconnect
            return;
          }
          disconnect();
          eventsubDisconnect = null;
        })
        .catch( (_) => {
          pubsubConnect( mainChannel, password );
        });
    } else {
      pubsubConnect( mainChannel, password );
    }
	}
  },
  Disconnect: function() {
    if ( typeof eventsubDisconnect === "function" ) {
      eventsubDisconnect();
      eventsubDisconnect = null;
    } else {
      eventsubDisconnect = typeof eventsubDisconnect !== "undefined" ? true : null;
    }
    client.disconnect()
    .catch( comfyJS.onError );
  },
  GetChannelRewards: async function( clientId, manageableOnly = false ) {
      if( channelPassword ) {
          if( !channelInfo ) {
              let info = await fetch( `https://api.twitch.tv/helix/users?login=${mainChannel}`, {
                  headers: {
                      "Client-ID": clientId,
                      "Authorization": `Bearer ${channelPassword}`
                  }
              } ).then( r => r.json() );
              channelInfo = info.data[ 0 ];
          }
          let rewards = await fetch( `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${channelInfo.id}&only_manageable_rewards=${manageableOnly}`, {
              headers: {
                  "Client-ID": clientId,
                  "Authorization": `Bearer ${channelPassword}`
              }
          } ).then( r => r.json() );
          return rewards.data || [];
      }
      else {
          return [];
      }
  },
  CreateChannelReward: async function( clientId, rewardInfo ) {
      if( channelPassword ) {
          if( !channelInfo ) {
              let info = await fetch( `https://api.twitch.tv/helix/users?login=${mainChannel}`, {
                  headers: {
                      "Client-ID": clientId,
                      "Authorization": `Bearer ${channelPassword}`
                  }
              } ).then( r => r.json() );
              channelInfo = info.data[ 0 ];
          }
          let custom = await fetch( `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${channelInfo.id}`, {
              method: "POST",
              headers: {
                  "Client-ID": clientId,
                  "Authorization": `Bearer ${channelPassword}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify( rewardInfo )
          } ).then( r => r.json() );
          return custom.data[ 0 ];
      }
      else {
          throw new Error( "Missing Channel Password" );
      }
  },
  UpdateChannelReward: async function( clientId, rewardId, rewardInfo ) {
      if( channelPassword ) {
          if( !channelInfo ) {
              let info = await fetch( `https://api.twitch.tv/helix/users?login=${mainChannel}`, {
                  headers: {
                      "Client-ID": clientId,
                      "Authorization": `Bearer ${channelPassword}`
                  }
              } ).then( r => r.json() );
              channelInfo = info.data[ 0 ];
          }
          let custom = await fetch( `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${channelInfo.id}&id=${rewardId}`, {
              method: "PATCH",
              headers: {
                  "Client-ID": clientId,
                  "Authorization": `Bearer ${channelPassword}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify( rewardInfo )
          } ).then( r => r.json() );
          return custom.data[ 0 ];
      }
      else {
          throw new Error( "Missing Channel Password" );
      }
  },
  DeleteChannelReward: async function( clientId, rewardId ) {
      if( channelPassword ) {
          if( !channelInfo ) {
              let info = await fetch( `https://api.twitch.tv/helix/users?login=${mainChannel}`, {
                  headers: {
                      "Client-ID": clientId,
                      "Authorization": `Bearer ${channelPassword}`
                  }
              } ).then( r => r.json() );
              channelInfo = info.data[ 0 ];
          }
          let deleted = await fetch( `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${channelInfo.id}&id=${rewardId}`, {
              method: "DELETE",
              headers: {
                  "Client-ID": clientId,
                  "Authorization": `Bearer ${channelPassword}`
              }
          } ).then( r => r.text() );
          return deleted;
      }
      else {
          throw new Error( "Missing Channel Password" );
      }
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
