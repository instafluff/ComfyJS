(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Comfy.JS v1.1.27
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

async function eventSubConnectAsync( channel, password, clientId = null, channelId = null, connectionName = null, sessionId = null) {
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
	const reconnectInterval = 1000 * 3; //ms to wait before reconnect

  ws.onerror = function( error ) {
    console.error( error );
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
            break;
          }
        case "revocation":
          {
            if (!subscribtions.map( ( [ type, _ ] ) => type).includes(message.payload.type)) {
              break;
            }
            console.error( "Revocation received" );
            break;
          }
        case "notification":
          {
            const messageId = message.metadata.message_id;

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
                let pollChoices = event.choices.map( choice => choice.title );
                let pollVotes = event.choices.map( choice => ( choice.bits_votes || 0 ) + ( choice.channel_points_votes || 0 ) + ( choice.votes || 0 ) );
                const timeRemaining = new Date( extra.endDate ) - new Date();
                if( message.payload.subscription.type !== "channel.poll.begin" ) {
                  // Sort pollChoices by pollVotes
                  pollChoices = pollChoices.map( ( choice, index ) => [ choice, pollVotes[ index ] ] ).sort( ( a, b ) => b[ 1 ] - a[ 1 ] ).map( x => x[ 0 ] );
                  pollVotes = pollVotes.sort( ( a, b ) => b - a );
                }

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
                      extra.status === "terminated" ? "close" :
                        extra.status === "archived" ? "archive" :
                        extra.status === "moderated" ? "delete" :
                        extra.status === "completed" ? "end" : "unknown",
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
                      extra.status === "canceled" ? "cancel" :
                        extra.status === "resolved" ? "end" : "unknown",
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
  
  ws.onclose = function() {
      setTimeout( () => {
        eventSubConnectAsync( channel, password );
      }, reconnectInterval );
  };
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
    return "1.1.27";
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
      eventSubConnectAsync( mainChannel, password );
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

},{"node-fetch":2,"tmi.js":4,"ws":3}],2:[function(require,module,exports){
(function (global){(function (){
"use strict";

// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
	// the only reliable means to get the global object is
	// `Function('return this')()`
	// However, this causes CSP violations in Chrome apps.
	if (typeof self !== 'undefined') { return self; }
	if (typeof window !== 'undefined') { return window; }
	if (typeof global !== 'undefined') { return global; }
	throw new Error('unable to locate global object');
}

var globalObject = getGlobal();

module.exports = exports = globalObject.fetch;

// Needed for TypeScript and Webpack.
if (globalObject.fetch) {
	exports.default = globalObject.fetch.bind(globalObject);
}

exports.Headers = globalObject.Headers;
exports.Request = globalObject.Request;
exports.Response = globalObject.Response;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
'use strict';

module.exports = function () {
  throw new Error(
    'ws does not work in the browser. Browser clients must use the native ' +
      'WebSocket object'
  );
};

},{}],4:[function(require,module,exports){
(function (global){(function (){
!function s(o,i,r){function a(t,e){if(!i[t]){if(!o[t]){var n="function"==typeof require&&require;if(!e&&n)return n(t,!0);if(c)return c(t,!0);throw(n=new Error("Cannot find module '"+t+"'")).code="MODULE_NOT_FOUND",n}n=i[t]={exports:{}},o[t][0].call(n.exports,function(e){return a(o[t][1][e]||e)},n,n.exports,s,o,i,r)}return i[t].exports}for(var c="function"==typeof require&&require,e=0;e<r.length;e++)a(r[e]);return a}({1:[function(e,t,n){"use strict";e=e("./lib/client");t.exports={client:e,Client:e}},{"./lib/client":3}],2:[function(e,t,n){"use strict";function i(t,e){var n,s=Object.keys(t);return Object.getOwnPropertySymbols&&(n=Object.getOwnPropertySymbols(t),e&&(n=n.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),s.push.apply(s,n)),s}function u(s){for(var e=1;e<arguments.length;e++){var o=null!=arguments[e]?arguments[e]:{};e%2?i(Object(o),!0).forEach(function(e){var t,n;t=s,e=o[n=e],n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e}):Object.getOwnPropertyDescriptors?Object.defineProperties(s,Object.getOwnPropertyDescriptors(o)):i(Object(o)).forEach(function(e){Object.defineProperty(s,e,Object.getOwnPropertyDescriptor(o,e))})}return s}var l=e("node-fetch"),m=e("./utils");t.exports=function(e,t){var n=void 0!==e.url?e.url:e.uri;if(m.isURL(n)||(n="https://api.twitch.tv/kraken".concat("/"===n[0]?n:"/".concat(n))),m.isNode()){var s=Object.assign({method:"GET",json:!0},e);s.qs&&(o=new URLSearchParams(s.qs),n+="?".concat(o));var o={};"fetchAgent"in this.opts.connection&&(o.agent=this.opts.connection.fetchAgent);var o=l(n,u(u({},o),{},{method:s.method,headers:s.headers,body:s.body})),i={};o.then(function(e){return i={statusCode:e.status,headers:e.headers},s.json?e.json():e.text()}).then(function(e){return t(null,i,e)},function(e){return t(e,i,null)})}else{var r,a=Object.assign({method:"GET",headers:{}},e,{url:n}),c=new XMLHttpRequest;for(r in c.open(a.method,a.url,!0),a.headers)c.setRequestHeader(r,a.headers[r]);c.responseType="json",c.addEventListener("load",function(e){4===c.readyState&&(200!==c.status?t(c.status,null,null):t(null,null,c.response))}),c.send()}}},{"./utils":9,"node-fetch":10}],3:[function(p,d,e){!function(f){!function(){"use strict";function t(t,e){var n,s=Object.keys(t);return Object.getOwnPropertySymbols&&(n=Object.getOwnPropertySymbols(t),e&&(n=n.filter(function(e){return Object.getOwnPropertyDescriptor(t,e).enumerable})),s.push.apply(s,n)),s}function i(s){for(var e=1;e<arguments.length;e++){var o=null!=arguments[e]?arguments[e]:{};e%2?t(Object(o),!0).forEach(function(e){var t,n;t=s,e=o[n=e],n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e}):Object.getOwnPropertyDescriptors?Object.defineProperties(s,Object.getOwnPropertyDescriptors(o)):t(Object(o)).forEach(function(e){Object.defineProperty(s,e,Object.getOwnPropertyDescriptor(o,e))})}return s}function H(e){return function(e){if(Array.isArray(e))return s(e)}(e)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(e)||function(e,t){if(e){if("string"==typeof e)return s(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Map"===(n="Object"===n&&e.constructor?e.constructor.name:n)||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?s(e,t):void 0}}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function s(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,s=new Array(t);n<t;n++)s[n]=e[n];return s}function n(e){if(this instanceof n==!1)return new n(e);this.opts=V.get(e,{}),this.opts.channels=this.opts.channels||[],this.opts.connection=this.opts.connection||{},this.opts.identity=this.opts.identity||{},this.opts.options=this.opts.options||{},this.clientId=V.get(this.opts.options.clientId,null),this._globalDefaultChannel=V.channel(V.get(this.opts.options.globalDefaultChannel,"#tmijs")),this._skipMembership=V.get(this.opts.options.skipMembership,!1),this._skipUpdatingEmotesets=V.get(this.opts.options.skipUpdatingEmotesets,!1),this._updateEmotesetsTimer=null,this._updateEmotesetsTimerDelay=V.get(this.opts.options.updateEmotesetsTimer,6e4),this.maxReconnectAttempts=V.get(this.opts.connection.maxReconnectAttempts,1/0),this.maxReconnectInterval=V.get(this.opts.connection.maxReconnectInterval,3e4),this.reconnect=V.get(this.opts.connection.reconnect,!0),this.reconnectDecay=V.get(this.opts.connection.reconnectDecay,1.5),this.reconnectInterval=V.get(this.opts.connection.reconnectInterval,1e3),this.reconnecting=!1,this.reconnections=0,this.reconnectTimer=this.reconnectInterval,this.secure=V.get(this.opts.connection.secure,!this.opts.connection.server&&!this.opts.connection.port),this.emotes="",this.emotesets={},this.channels=[],this.currentLatency=0,this.globaluserstate={},this.lastJoined="",this.latency=new Date,this.moderators={},this.pingLoop=null,this.pingTimeout=null,this.reason="",this.username="",this.userstate={},this.wasCloseCalled=!1,this.ws=null,e="error",this.opts.options.debug&&(e="info"),this.log=this.opts.logger||m;try{m.setLevel(e)}catch(e){}this.opts.channels.forEach(function(e,t,n){return n[t]=V.channel(e)}),l.call(this),this.setMaxListeners(0)}var e,o=void 0!==f?f:"undefined"!=typeof window?window:{},r=o.WebSocket||p("ws"),a=o.fetch||p("node-fetch"),c=p("./api"),u=p("./commands"),l=p("./events").EventEmitter,m=p("./logger"),q=p("./parser"),W=p("./timer"),V=p("./utils"),h=!1;for(e in V.inherits(n,l),u)n.prototype[e]=u[e];n.prototype.emits=function(e,t){for(var n=0;n<e.length;n++){var s=n<t.length?t[n]:t[t.length-1];this.emit.apply(this,[e[n]].concat(s))}},n.prototype.api=function(){h||(this.log.warn("Client.prototype.api is deprecated and will be removed for version 2.0.0"),h=!0),c.apply(void 0,arguments)},n.prototype.handleMessage=function(t){var n=this;if(t){this.listenerCount("raw_message")&&this.emit("raw_message",JSON.parse(JSON.stringify(t)),t);var e,s,o,i,r,a,c,u,l,m=V.channel(V.get(t.params[0],null)),h=V.get(t.params[1],null),f=V.get(t.tags["msg-id"],null),p=t.tags=q.badges(q.badgeInfo(q.emotes(t.tags)));for(e in p)"emote-sets"!==e&&"ban-duration"!==e&&"bits"!==e&&("boolean"==typeof(s=p[e])?s=null:"1"===s?s=!0:"0"===s?s=!1:"string"==typeof s&&(s=V.unescapeIRC(s)),p[e]=s);if(null===t.prefix)switch(t.command){case"PING":this.emit("ping"),this._isConnected()&&this.ws.send("PONG");break;case"PONG":var d=new Date;this.currentLatency=(d.getTime()-this.latency.getTime())/1e3,this.emits(["pong","_promisePing"],[[this.currentLatency]]),clearTimeout(this.pingTimeout);break;default:this.log.warn("Could not parse message with no prefix:\n".concat(JSON.stringify(t,null,4)))}else if("tmi.twitch.tv"===t.prefix)switch(t.command){case"002":case"003":case"004":case"372":case"375":case"CAP":break;case"001":this.username=t.params[0];break;case"376":this.log.info("Connected to server."),this.userstate[this._globalDefaultChannel]={},this.emits(["connected","_promiseConnect"],[[this.server,this.port],[null]]),this.reconnections=0,this.reconnectTimer=this.reconnectInterval,this.pingLoop=setInterval(function(){n._isConnected()&&n.ws.send("PING"),n.latency=new Date,n.pingTimeout=setTimeout(function(){null!==n.ws&&(n.wasCloseCalled=!1,n.log.error("Ping timeout."),n.ws.close(),clearInterval(n.pingLoop),clearTimeout(n.pingTimeout),clearTimeout(n._updateEmotesetsTimer))},V.get(n.opts.connection.timeout,9999))},6e4);var g=V.get(this.opts.options.joinInterval,2e3),_=new W(g=g<300?300:g),b=H(new Set([].concat(H(this.opts.channels),H(this.channels))));this.channels=[];for(var v=0;v<b.length;v++)!function(e){var t=b[e];_.add(function(){n._isConnected()&&n.join(t).catch(function(e){return n.log.error(e)})})}(v);_.next();break;case"NOTICE":var y=[null],w=[m,f,h],k=[m,!0],C=[m,!1],T=[w,y],O=[w,[f]],E="[".concat(m,"] ").concat(h);switch(f){case"subs_on":this.log.info("[".concat(m,"] This room is now in subscribers-only mode.")),this.emits(["subscriber","subscribers","_promiseSubscribers"],[k,k,y]);break;case"subs_off":this.log.info("[".concat(m,"] This room is no longer in subscribers-only mode.")),this.emits(["subscriber","subscribers","_promiseSubscribersoff"],[C,C,y]);break;case"emote_only_on":this.log.info("[".concat(m,"] This room is now in emote-only mode.")),this.emits(["emoteonly","_promiseEmoteonly"],[k,y]);break;case"emote_only_off":this.log.info("[".concat(m,"] This room is no longer in emote-only mode.")),this.emits(["emoteonly","_promiseEmoteonlyoff"],[C,y]);break;case"slow_on":case"slow_off":break;case"followers_on_zero":case"followers_on":case"followers_off":break;case"r9k_on":this.log.info("[".concat(m,"] This room is now in r9k mode.")),this.emits(["r9kmode","r9kbeta","_promiseR9kbeta"],[k,k,y]);break;case"r9k_off":this.log.info("[".concat(m,"] This room is no longer in r9k mode.")),this.emits(["r9kmode","r9kbeta","_promiseR9kbetaoff"],[C,C,y]);break;case"room_mods":var x=h.split(": "),x=(1<x.length?x[1]:"").toLowerCase().split(", ").filter(function(e){return e});this.emits(["_promiseMods","mods"],[[null,x],[m,x]]);break;case"no_mods":this.emits(["_promiseMods","mods"],[[null,[]],[m,[]]]);break;case"vips_success":var S=(h=h.endsWith(".")?h.slice(0,-1):h).split(": "),S=(1<S.length?S[1]:"").toLowerCase().split(", ").filter(function(e){return e});this.emits(["_promiseVips","vips"],[[null,S],[m,S]]);break;case"no_vips":this.emits(["_promiseVips","vips"],[[null,[]],[m,[]]]);break;case"already_banned":case"bad_ban_admin":case"bad_ban_anon":case"bad_ban_broadcaster":case"bad_ban_global_mod":case"bad_ban_mod":case"bad_ban_self":case"bad_ban_staff":case"usage_ban":this.log.info(E),this.emits(["notice","_promiseBan"],O);break;case"ban_success":this.log.info(E),this.emits(["notice","_promiseBan"],T);break;case"usage_clear":this.log.info(E),this.emits(["notice","_promiseClear"],O);break;case"usage_mods":this.log.info(E),this.emits(["notice","_promiseMods"],[w,[f,[]]]);break;case"mod_success":this.log.info(E),this.emits(["notice","_promiseMod"],T);break;case"usage_vips":this.log.info(E),this.emits(["notice","_promiseVips"],[w,[f,[]]]);break;case"usage_vip":case"bad_vip_grantee_banned":case"bad_vip_grantee_already_vip":case"bad_vip_max_vips_reached":case"bad_vip_achievement_incomplete":this.log.info(E),this.emits(["notice","_promiseVip"],[w,[f,[]]]);break;case"vip_success":this.log.info(E),this.emits(["notice","_promiseVip"],T);break;case"usage_mod":case"bad_mod_banned":case"bad_mod_mod":this.log.info(E),this.emits(["notice","_promiseMod"],O);break;case"unmod_success":this.log.info(E),this.emits(["notice","_promiseUnmod"],T);break;case"unvip_success":this.log.info(E),this.emits(["notice","_promiseUnvip"],T);break;case"usage_unmod":case"bad_unmod_mod":this.log.info(E),this.emits(["notice","_promiseUnmod"],O);break;case"usage_unvip":case"bad_unvip_grantee_not_vip":this.log.info(E),this.emits(["notice","_promiseUnvip"],O);break;case"color_changed":this.log.info(E),this.emits(["notice","_promiseColor"],T);break;case"usage_color":case"turbo_only_color":this.log.info(E),this.emits(["notice","_promiseColor"],O);break;case"commercial_success":this.log.info(E),this.emits(["notice","_promiseCommercial"],T);break;case"usage_commercial":case"bad_commercial_error":this.log.info(E),this.emits(["notice","_promiseCommercial"],O);break;case"hosts_remaining":this.log.info(E);S=isNaN(h[0])?0:parseInt(h[0]);this.emits(["notice","_promiseHost"],[w,[null,~~S]]);break;case"bad_host_hosting":case"bad_host_rate_exceeded":case"bad_host_error":case"usage_host":this.log.info(E),this.emits(["notice","_promiseHost"],[w,[f,null]]);break;case"already_r9k_on":case"usage_r9k_on":this.log.info(E),this.emits(["notice","_promiseR9kbeta"],O);break;case"already_r9k_off":case"usage_r9k_off":this.log.info(E),this.emits(["notice","_promiseR9kbetaoff"],O);break;case"timeout_success":this.log.info(E),this.emits(["notice","_promiseTimeout"],T);break;case"delete_message_success":this.log.info("[".concat(m," ").concat(h,"]")),this.emits(["notice","_promiseDeletemessage"],T);break;case"already_subs_off":case"usage_subs_off":this.log.info(E),this.emits(["notice","_promiseSubscribersoff"],O);break;case"already_subs_on":case"usage_subs_on":this.log.info(E),this.emits(["notice","_promiseSubscribers"],O);break;case"already_emote_only_off":case"usage_emote_only_off":this.log.info(E),this.emits(["notice","_promiseEmoteonlyoff"],O);break;case"already_emote_only_on":case"usage_emote_only_on":this.log.info(E),this.emits(["notice","_promiseEmoteonly"],O);break;case"usage_slow_on":this.log.info(E),this.emits(["notice","_promiseSlow"],O);break;case"usage_slow_off":this.log.info(E),this.emits(["notice","_promiseSlowoff"],O);break;case"usage_timeout":case"bad_timeout_admin":case"bad_timeout_anon":case"bad_timeout_broadcaster":case"bad_timeout_duration":case"bad_timeout_global_mod":case"bad_timeout_mod":case"bad_timeout_self":case"bad_timeout_staff":this.log.info(E),this.emits(["notice","_promiseTimeout"],O);break;case"untimeout_success":case"unban_success":this.log.info(E),this.emits(["notice","_promiseUnban"],T);break;case"usage_unban":case"bad_unban_no_ban":this.log.info(E),this.emits(["notice","_promiseUnban"],O);break;case"usage_delete":case"bad_delete_message_error":case"bad_delete_message_broadcaster":case"bad_delete_message_mod":this.log.info(E),this.emits(["notice","_promiseDeletemessage"],O);break;case"usage_unhost":case"not_hosting":this.log.info(E),this.emits(["notice","_promiseUnhost"],O);break;case"whisper_invalid_login":case"whisper_invalid_self":case"whisper_limit_per_min":case"whisper_limit_per_sec":case"whisper_restricted":case"whisper_restricted_recipient":this.log.info(E),this.emits(["notice","_promiseWhisper"],O);break;case"no_permission":case"msg_banned":case"msg_room_not_found":case"msg_channel_suspended":case"tos_ban":case"invalid_user":this.log.info(E),this.emits(["notice","_promiseBan","_promiseClear","_promiseUnban","_promiseTimeout","_promiseDeletemessage","_promiseMods","_promiseMod","_promiseUnmod","_promiseVips","_promiseVip","_promiseUnvip","_promiseCommercial","_promiseHost","_promiseUnhost","_promiseJoin","_promisePart","_promiseR9kbeta","_promiseR9kbetaoff","_promiseSlow","_promiseSlowoff","_promiseFollowers","_promiseFollowersoff","_promiseSubscribers","_promiseSubscribersoff","_promiseEmoteonly","_promiseEmoteonlyoff","_promiseWhisper"],[w,[f,m]]);break;case"msg_rejected":case"msg_rejected_mandatory":this.log.info(E),this.emit("automod",m,f,h);break;case"unrecognized_cmd":this.log.info(E),this.emit("notice",m,f,h);break;case"cmds_available":case"host_target_went_offline":case"msg_censored_broadcaster":case"msg_duplicate":case"msg_emoteonly":case"msg_verified_email":case"msg_ratelimit":case"msg_subsonly":case"msg_timedout":case"msg_bad_characters":case"msg_channel_blocked":case"msg_facebook":case"msg_followersonly":case"msg_followersonly_followed":case"msg_followersonly_zero":case"msg_slowmode":case"msg_suspended":case"no_help":case"usage_disconnect":case"usage_help":case"usage_me":case"unavailable_command":this.log.info(E),this.emit("notice",m,f,h);break;case"host_on":case"host_off":break;default:h.includes("Login unsuccessful")||h.includes("Login authentication failed")||h.includes("Error logging in")||h.includes("Improperly formatted auth")?(this.wasCloseCalled=!1,this.reconnect=!1,this.reason=h,this.log.error(this.reason),this.ws.close()):h.includes("Invalid NICK")?(this.wasCloseCalled=!1,this.reconnect=!1,this.reason="Invalid NICK.",this.log.error(this.reason),this.ws.close()):(this.log.warn("Could not parse NOTICE from tmi.twitch.tv:\n".concat(JSON.stringify(t,null,4))),this.emit("notice",m,f,h))}break;case"USERNOTICE":var L=p["display-name"]||p.login,g=p["msg-param-sub-plan"]||"",j=V.unescapeIRC(V.get(p["msg-param-sub-plan-name"],""))||null,P={prime:g.includes("Prime"),plan:g,planName:j},I=~~(p["msg-param-streak-months"]||0),N=p["msg-param-recipient-display-name"]||p["msg-param-recipient-user-name"],R=~~p["msg-param-mass-gift-count"];switch(p["message-type"]=f){case"resub":this.emits(["resub","subanniversary"],[[m,L,I,h,p,P]]);break;case"sub":this.emits(["subscription","sub"],[[m,L,P,h,p]]);break;case"subgift":this.emit("subgift",m,L,I,N,P,p);break;case"anonsubgift":this.emit("anonsubgift",m,I,N,P,p);break;case"submysterygift":this.emit("submysterygift",m,L,R,P,p);break;case"anonsubmysterygift":this.emit("anonsubmysterygift",m,R,P,p);break;case"primepaidupgrade":this.emit("primepaidupgrade",m,L,P,p);break;case"giftpaidupgrade":var A=p["msg-param-sender-name"]||p["msg-param-sender-login"];this.emit("giftpaidupgrade",m,L,A,p);break;case"anongiftpaidupgrade":this.emit("anongiftpaidupgrade",m,L,p);break;case"raid":var A=p["msg-param-displayName"]||p["msg-param-login"],M=+p["msg-param-viewerCount"];this.emit("raided",m,A,M,p);break;case"ritual":M=p["msg-param-ritual-name"];"new_chatter"===M?this.emit("newchatter",m,L,p,h):this.emit("ritual",M,m,L,p,h);break;default:this.emit("usernotice",f,m,p,h)}break;case"HOSTTARGET":var j=h.split(" "),D=~~j[1]||0;"-"===j[0]?(this.log.info("[".concat(m,"] Exited host mode.")),this.emits(["unhost","_promiseUnhost"],[[m,D],[null]])):(this.log.info("[".concat(m,"] Now hosting ").concat(j[0]," for ").concat(D," viewer(s).")),this.emit("hosting",m,j[0],D));break;case"CLEARCHAT":1<t.params.length?null===(o=V.get(t.tags["ban-duration"],null))?(this.log.info("[".concat(m,"] ").concat(h," has been banned.")),this.emit("ban",m,h,null,t.tags)):(this.log.info("[".concat(m,"] ").concat(h," has been timed out for ").concat(o," seconds.")),this.emit("timeout",m,h,null,~~o,t.tags)):(this.log.info("[".concat(m,"] Chat was cleared by a moderator.")),this.emits(["clearchat","_promiseClear"],[[m],[null]]));break;case"CLEARMSG":1<t.params.length&&(D=h,o=p.login,p["message-type"]="messagedeleted",this.log.info("[".concat(m,"] ").concat(o,"'s message has been deleted.")),this.emit("messagedeleted",m,o,D,p));break;case"RECONNECT":this.log.info("Received RECONNECT request from Twitch.."),this.log.info("Disconnecting and reconnecting in ".concat(Math.round(this.reconnectTimer/1e3)," seconds..")),this.disconnect().catch(function(e){return n.log.error(e)}),setTimeout(function(){return n.connect().catch(function(e){return n.log.error(e)})},this.reconnectTimer);break;case"USERSTATE":t.tags.username=this.username,"mod"===t.tags["user-type"]&&(this.moderators[m]||(this.moderators[m]=[]),this.moderators[m].includes(this.username)||this.moderators[m].push(this.username)),V.isJustinfan(this.getUsername())||this.userstate[m]||(this.userstate[m]=p,this.lastJoined=m,this.channels.push(m),this.log.info("Joined ".concat(m)),this.emit("join",m,V.username(this.getUsername()),!0)),t.tags["emote-sets"]!==this.emotes&&this._updateEmoteset(t.tags["emote-sets"]),this.userstate[m]=p;break;case"GLOBALUSERSTATE":this.globaluserstate=p,this.emit("globaluserstate",p),void 0!==t.tags["emote-sets"]&&this._updateEmoteset(t.tags["emote-sets"]);break;case"ROOMSTATE":V.channel(this.lastJoined)===m&&this.emit("_promiseJoin",null,m),t.tags.channel=m,this.emit("roomstate",m,t.tags),V.hasOwn(t.tags,"subs-only")||(V.hasOwn(t.tags,"slow")&&("boolean"!=typeof t.tags.slow||t.tags.slow?(i=[m,!0,~~t.tags.slow],this.log.info("[".concat(m,"] This room is now in slow mode.")),this.emits(["slow","slowmode","_promiseSlow"],[i,i,[null]])):(i=[m,!1,0],this.log.info("[".concat(m,"] This room is no longer in slow mode.")),this.emits(["slow","slowmode","_promiseSlowoff"],[i,i,[null]]))),V.hasOwn(t.tags,"followers-only")&&("-1"===t.tags["followers-only"]?(r=[m,!1,0],this.log.info("[".concat(m,"] This room is no longer in followers-only mode.")),this.emits(["followersonly","followersmode","_promiseFollowersoff"],[r,r,[null]])):(r=[m,!0,~~t.tags["followers-only"]],this.log.info("[".concat(m,"] This room is now in follower-only mode.")),this.emits(["followersonly","followersmode","_promiseFollowers"],[r,r,[null]]))));break;case"SERVERCHANGE":break;default:this.log.warn("Could not parse message from tmi.twitch.tv:\n".concat(JSON.stringify(t,null,4)))}else if("jtv"===t.prefix)"MODE"===t.command?"+o"===h?(this.moderators[m]||(this.moderators[m]=[]),this.moderators[m].includes(t.params[2])||this.moderators[m].push(t.params[2]),this.emit("mod",m,t.params[2])):"-o"===h&&(this.moderators[m]||(this.moderators[m]=[]),this.moderators[m].filter(function(e){return e!==t.params[2]}),this.emit("unmod",m,t.params[2])):this.log.warn("Could not parse message from jtv:\n".concat(JSON.stringify(t,null,4)));else switch(t.command){case"353":this.emit("names",t.params[2],t.params[3].split(" "));break;case"366":break;case"JOIN":var U=t.prefix.split("!")[0];V.isJustinfan(this.getUsername())&&this.username===U&&(this.lastJoined=m,this.channels.push(m),this.log.info("Joined ".concat(m)),this.emit("join",m,U,!0)),this.username!==U&&this.emit("join",m,U,!1);break;case"PART":var J=!1,G=t.prefix.split("!")[0];this.username===G&&(J=!0,this.userstate[m]&&delete this.userstate[m],-1!==(U=this.channels.indexOf(m))&&this.channels.splice(U,1),-1!==(U=this.opts.channels.indexOf(m))&&this.opts.channels.splice(U,1),this.log.info("Left ".concat(m)),this.emit("_promisePart",null)),this.emit("part",m,G,J);break;case"WHISPER":J=t.prefix.split("!")[0];this.log.info("[WHISPER] <".concat(J,">: ").concat(h)),V.hasOwn(t.tags,"username")||(t.tags.username=J),t.tags["message-type"]="whisper";J=V.channel(t.tags.username);this.emits(["whisper","message"],[[J,t.tags,h,!1]]);break;case"PRIVMSG":t.tags.username=t.prefix.split("!")[0],"jtv"===t.tags.username?(c=V.username(h.split(" ")[0]),u=h.includes("auto"),h.includes("hosting you for")?(a=V.extractNumber(h),this.emit("hosted",m,c,a,u)):h.includes("hosting you")&&this.emit("hosted",m,c,0,u)):(a=V.get(this.opts.options.messagesLogLevel,"info"),c=V.actionMessage(h),t.tags["message-type"]=c?"action":"chat",h=c?c[1]:h,V.hasOwn(t.tags,"bits")?this.emit("cheer",m,t.tags,h):(V.hasOwn(t.tags,"msg-id")?"highlighted-message"===t.tags["msg-id"]?(u=t.tags["msg-id"],this.emit("redeem",m,t.tags.username,u,t.tags,h)):"skip-subs-mode-message"===t.tags["msg-id"]&&(l=t.tags["msg-id"],this.emit("redeem",m,t.tags.username,l,t.tags,h)):V.hasOwn(t.tags,"custom-reward-id")&&(l=t.tags["custom-reward-id"],this.emit("redeem",m,t.tags.username,l,t.tags,h)),c?(this.log[a]("[".concat(m,"] *<").concat(t.tags.username,">: ").concat(h)),this.emits(["action","message"],[[m,t.tags,h,!1]])):(this.log[a]("[".concat(m,"] <").concat(t.tags.username,">: ").concat(h)),this.emits(["chat","message"],[[m,t.tags,h,!1]]))));break;default:this.log.warn("Could not parse message:\n".concat(JSON.stringify(t,null,4)))}}},n.prototype.connect=function(){var s=this;return new Promise(function(t,n){s.server=V.get(s.opts.connection.server,"irc-ws.chat.twitch.tv"),s.port=V.get(s.opts.connection.port,80),s.secure&&(s.port=443),443===s.port&&(s.secure=!0),s.reconnectTimer=s.reconnectTimer*s.reconnectDecay,s.reconnectTimer>=s.maxReconnectInterval&&(s.reconnectTimer=s.maxReconnectInterval),s._openConnection(),s.once("_promiseConnect",function(e){e?n(e):t([s.server,~~s.port])})})},n.prototype._openConnection=function(){var e="".concat(this.secure?"wss":"ws","://").concat(this.server,":").concat(this.port,"/"),t={};"agent"in this.opts.connection&&(t.agent=this.opts.connection.agent),this.ws=new r(e,"irc",t),this.ws.onmessage=this._onMessage.bind(this),this.ws.onerror=this._onError.bind(this),this.ws.onclose=this._onClose.bind(this),this.ws.onopen=this._onOpen.bind(this)},n.prototype._onOpen=function(){var n=this;this._isConnected()&&(this.log.info("Connecting to ".concat(this.server," on port ").concat(this.port,"..")),this.emit("connecting",this.server,~~this.port),this.username=V.get(this.opts.identity.username,V.justinfan()),this._getToken().then(function(e){var t=V.password(e);n.log.info("Sending authentication to server.."),n.emit("logon");e="twitch.tv/tags twitch.tv/commands";n._skipMembership||(e+=" twitch.tv/membership"),n.ws.send("CAP REQ :"+e),t?n.ws.send("PASS ".concat(t)):V.isJustinfan(n.username)&&n.ws.send("PASS SCHMOOPIIE"),n.ws.send("NICK ".concat(n.username))}).catch(function(e){n.emits(["_promiseConnect","disconnected"],[[e],["Could not get a token."]])}))},n.prototype._getToken=function(){var e,t=this.opts.identity.password;return"function"==typeof t?(e=t())instanceof Promise?e:Promise.resolve(e):Promise.resolve(t)},n.prototype._onMessage=function(e){var t=this;e.data.trim().split("\r\n").forEach(function(e){e=q.msg(e);e&&t.handleMessage(e)})},n.prototype._onError=function(){var t=this;this.moderators={},this.userstate={},this.globaluserstate={},clearInterval(this.pingLoop),clearTimeout(this.pingTimeout),clearTimeout(this._updateEmotesetsTimer),this.reason=null===this.ws?"Connection closed.":"Unable to connect.",this.emits(["_promiseConnect","disconnected"],[[this.reason]]),this.reconnect&&this.reconnections===this.maxReconnectAttempts&&(this.emit("maxreconnect"),this.log.error("Maximum reconnection attempts reached.")),this.reconnect&&!this.reconnecting&&this.reconnections<=this.maxReconnectAttempts-1&&(this.reconnecting=!0,this.reconnections=this.reconnections+1,this.log.error("Reconnecting in ".concat(Math.round(this.reconnectTimer/1e3)," seconds..")),this.emit("reconnect"),setTimeout(function(){t.reconnecting=!1,t.connect().catch(function(e){return t.log.error(e)})},this.reconnectTimer)),this.ws=null},n.prototype._onClose=function(){var t=this;this.moderators={},this.userstate={},this.globaluserstate={},clearInterval(this.pingLoop),clearTimeout(this.pingTimeout),clearTimeout(this._updateEmotesetsTimer),this.wasCloseCalled?(this.wasCloseCalled=!1,this.reason="Connection closed.",this.log.info(this.reason),this.emits(["_promiseConnect","_promiseDisconnect","disconnected"],[[this.reason],[null],[this.reason]])):(this.emits(["_promiseConnect","disconnected"],[[this.reason]]),this.reconnect&&this.reconnections===this.maxReconnectAttempts&&(this.emit("maxreconnect"),this.log.error("Maximum reconnection attempts reached.")),this.reconnect&&!this.reconnecting&&this.reconnections<=this.maxReconnectAttempts-1&&(this.reconnecting=!0,this.reconnections=this.reconnections+1,this.log.error("Could not connect to server. Reconnecting in ".concat(Math.round(this.reconnectTimer/1e3)," seconds..")),this.emit("reconnect"),setTimeout(function(){t.reconnecting=!1,t.connect().catch(function(e){return t.log.error(e)})},this.reconnectTimer))),this.ws=null},n.prototype._getPromiseDelay=function(){return this.currentLatency<=600?600:this.currentLatency+100},n.prototype._sendCommand=function(s,o,i,r){var a=this;return new Promise(function(e,t){if(!a._isConnected())return t("Not connected to server.");var n;null!==s&&"number"!=typeof s||(null===s&&(s=a._getPromiseDelay()),V.promiseDelay(s).then(function(){return t("No response from Twitch.")})),null!==o?(n=V.channel(o),a.log.info("[".concat(n,"] Executing command: ").concat(i)),a.ws.send("PRIVMSG ".concat(n," :").concat(i))):(a.log.info("Executing command: ".concat(i)),a.ws.send(i)),"function"==typeof r?r(e,t):e()})},n.prototype._sendMessage=function(c,u,l,m){var h=this;return new Promise(function(e,t){if(!h._isConnected())return t("Not connected to server.");if(V.isJustinfan(h.getUsername()))return t("Cannot send anonymous messages.");var n,s=V.channel(u);h.userstate[s]||(h.userstate[s]={}),500<=l.length&&(n=V.splitLine(l,500),l=n[0],setTimeout(function(){h._sendMessage(c,u,n[1],function(){})},350)),h.ws.send("PRIVMSG ".concat(s," :").concat(l));var o={};Object.keys(h.emotesets).forEach(function(e){return h.emotesets[e].forEach(function(e){return(V.isRegex(e.code)?q.emoteRegex:q.emoteString)(l,e.code,e.id,o)})});var i=Object.assign(h.userstate[s],q.emotes({emotes:q.transformEmotes(o)||null})),r=V.get(h.opts.options.messagesLogLevel,"info"),a=V.actionMessage(l);a?(i["message-type"]="action",h.log[r]("[".concat(s,"] *<").concat(h.getUsername(),">: ").concat(a[1])),h.emits(["action","message"],[[s,i,a[1],!0]])):(i["message-type"]="chat",h.log[r]("[".concat(s,"] <").concat(h.getUsername(),">: ").concat(l)),h.emits(["chat","message"],[[s,i,l,!0]])),"function"==typeof m?m(e,t):e()})},n.prototype._updateEmoteset=function(s){var t,o=this,e=void 0!==s;e&&(s===this.emotes?e=!1:this.emotes=s),this._skipUpdatingEmotesets?e&&this.emit("emotesets",s,{}):(t=function(){0<o._updateEmotesetsTimerDelay&&(clearTimeout(o._updateEmotesetsTimer),o._updateEmotesetsTimer=setTimeout(function(){return o._updateEmoteset(s)},o._updateEmotesetsTimerDelay))},this._getToken().then(function(e){var t="https://api.twitch.tv/kraken/chat/emoticon_images?emotesets=".concat(s),n={};return"fetchAgent"in o.opts.connection&&(n.agent=o.opts.connection.fetchAgent),a(t,i(i({},n),{},{headers:{Accept:"application/vnd.twitchtv.v5+json",Authorization:"OAuth ".concat(V.token(e)),"Client-ID":o.clientId}}))}).then(function(e){return e.json()}).then(function(e){o.emotesets=e.emoticon_sets||{},o.emit("emotesets",s,o.emotesets),t()}).catch(t))},n.prototype.getUsername=function(){return this.username},n.prototype.getOptions=function(){return this.opts},n.prototype.getChannels=function(){return this.channels},n.prototype.isMod=function(e,t){e=V.channel(e);return this.moderators[e]||(this.moderators[e]=[]),this.moderators[e].includes(V.username(t))},n.prototype.readyState=function(){return null===this.ws?"CLOSED":["CONNECTING","OPEN","CLOSING","CLOSED"][this.ws.readyState]},n.prototype._isConnected=function(){return null!==this.ws&&1===this.ws.readyState},n.prototype.disconnect=function(){var n=this;return new Promise(function(e,t){null!==n.ws&&3!==n.ws.readyState?(n.wasCloseCalled=!0,n.log.info("Disconnecting from server.."),n.ws.close(),n.once("_promiseDisconnect",function(){return e([n.server,~~n.port])})):(n.log.error("Cannot disconnect from server. Socket is not opened or connection is already closing."),t("Cannot disconnect from server. Socket is not opened or connection is already closing."))})},n.prototype.off=n.prototype.removeListener,void 0!==d&&d.exports&&(d.exports=n),"undefined"!=typeof window&&(window.tmi={client:n,Client:n})}.call(this)}.call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"./api":2,"./commands":4,"./events":5,"./logger":6,"./parser":7,"./timer":8,"./utils":9,"node-fetch":10,ws:10}],4:[function(e,t,n){"use strict";var u=e("./utils");function s(s,o){var e=this;return s=u.channel(s),o=u.get(o,30),this._sendCommand(null,s,"/followers ".concat(o),function(t,n){e.once("_promiseFollowers",function(e){e?n(e):t([s,~~o])})})}function o(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/followersoff",function(t,n){e.once("_promiseFollowersoff",function(e){e?n(e):t([s])})})}function i(s){var e=this;return s=u.channel(s),this._sendCommand(null,null,"PART ".concat(s),function(t,n){e.once("_promisePart",function(e){e?n(e):t([s])})})}function r(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/r9kbeta",function(t,n){e.once("_promiseR9kbeta",function(e){e?n(e):t([s])})})}function a(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/r9kbetaoff",function(t,n){e.once("_promiseR9kbetaoff",function(e){e?n(e):t([s])})})}function c(s,o){var e=this;return s=u.channel(s),o=u.get(o,300),this._sendCommand(null,s,"/slow ".concat(o),function(t,n){e.once("_promiseSlow",function(e){e?n(e):t([s,~~o])})})}function l(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/slowoff",function(t,n){e.once("_promiseSlowoff",function(e){e?n(e):t([s])})})}t.exports={action:function(n,s){return n=u.channel(n),s="ACTION ".concat(s,""),this._sendMessage(this._getPromiseDelay(),n,s,function(e,t){e([n,s])})},ban:function(s,o,i){var e=this;return s=u.channel(s),o=u.username(o),i=u.get(i,""),this._sendCommand(null,s,"/ban ".concat(o," ").concat(i),function(t,n){e.once("_promiseBan",function(e){e?n(e):t([s,o,i])})})},clear:function(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/clear",function(t,n){e.once("_promiseClear",function(e){e?n(e):t([s])})})},color:function(e,s){var o=this;return s=u.get(s,e),this._sendCommand(null,"#tmijs","/color ".concat(s),function(t,n){o.once("_promiseColor",function(e){e?n(e):t([s])})})},commercial:function(s,o){var e=this;return s=u.channel(s),o=u.get(o,30),this._sendCommand(null,s,"/commercial ".concat(o),function(t,n){e.once("_promiseCommercial",function(e){e?n(e):t([s,~~o])})})},deletemessage:function(s,e){var o=this;return s=u.channel(s),this._sendCommand(null,s,"/delete ".concat(e),function(t,n){o.once("_promiseDeletemessage",function(e){e?n(e):t([s])})})},emoteonly:function(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/emoteonly",function(t,n){e.once("_promiseEmoteonly",function(e){e?n(e):t([s])})})},emoteonlyoff:function(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/emoteonlyoff",function(t,n){e.once("_promiseEmoteonlyoff",function(e){e?n(e):t([s])})})},followersonly:s,followersmode:s,followersonlyoff:o,followersmodeoff:o,host:function(o,i){var e=this;return o=u.channel(o),i=u.username(i),this._sendCommand(2e3,o,"/host ".concat(i),function(n,s){e.once("_promiseHost",function(e,t){e?s(e):n([o,i,~~t])})})},join:function(a){var c=this;return a=u.channel(a),this._sendCommand(void 0,null,"JOIN ".concat(a),function(s,o){var i="_promiseJoin",r=!1,e=function e(t,n){a===u.channel(n)&&(c.removeListener(i,e),r=!0,t?o(t):s([a]))};c.on(i,e);e=c._getPromiseDelay();u.promiseDelay(e).then(function(){r||c.emit(i,"No response from Twitch.",a)})})},mod:function(s,o){var e=this;return s=u.channel(s),o=u.username(o),this._sendCommand(null,s,"/mod ".concat(o),function(t,n){e.once("_promiseMod",function(e){e?n(e):t([s,o])})})},mods:function(o){var i=this;return o=u.channel(o),this._sendCommand(null,o,"/mods",function(n,s){i.once("_promiseMods",function(e,t){e?s(e):(t.forEach(function(e){i.moderators[o]||(i.moderators[o]=[]),i.moderators[o].includes(e)||i.moderators[o].push(e)}),n(t))})})},part:i,leave:i,ping:function(){var n=this;return this._sendCommand(null,null,"PING",function(t,e){n.latency=new Date,n.pingTimeout=setTimeout(function(){null!==n.ws&&(n.wasCloseCalled=!1,n.log.error("Ping timeout."),n.ws.close(),clearInterval(n.pingLoop),clearTimeout(n.pingTimeout))},u.get(n.opts.connection.timeout,9999)),n.once("_promisePing",function(e){return t([parseFloat(e)])})})},r9kbeta:r,r9kmode:r,r9kbetaoff:a,r9kmodeoff:a,raw:function(n){return this._sendCommand(null,null,n,function(e,t){e([n])})},say:function(n,s){return n=u.channel(n),s.startsWith(".")&&!s.startsWith("..")||s.startsWith("/")||s.startsWith("\\")?"me "===s.substr(1,3)?this.action(n,s.substr(4)):this._sendCommand(null,n,s,function(e,t){e([n,s])}):this._sendMessage(this._getPromiseDelay(),n,s,function(e,t){e([n,s])})},slow:c,slowmode:c,slowoff:l,slowmodeoff:l,subscribers:function(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/subscribers",function(t,n){e.once("_promiseSubscribers",function(e){e?n(e):t([s])})})},subscribersoff:function(s){var e=this;return s=u.channel(s),this._sendCommand(null,s,"/subscribersoff",function(t,n){e.once("_promiseSubscribersoff",function(e){e?n(e):t([s])})})},timeout:function(s,o,i,r){var e=this;return s=u.channel(s),o=u.username(o),null===i||u.isInteger(i)||(r=i,i=300),i=u.get(i,300),r=u.get(r,""),this._sendCommand(null,s,"/timeout ".concat(o," ").concat(i," ").concat(r),function(t,n){e.once("_promiseTimeout",function(e){e?n(e):t([s,o,~~i,r])})})},unban:function(s,o){var e=this;return s=u.channel(s),o=u.username(o),this._sendCommand(null,s,"/unban ".concat(o),function(t,n){e.once("_promiseUnban",function(e){e?n(e):t([s,o])})})},unhost:function(s){var e=this;return s=u.channel(s),this._sendCommand(2e3,s,"/unhost",function(t,n){e.once("_promiseUnhost",function(e){e?n(e):t([s])})})},unmod:function(s,o){var e=this;return s=u.channel(s),o=u.username(o),this._sendCommand(null,s,"/unmod ".concat(o),function(t,n){e.once("_promiseUnmod",function(e){e?n(e):t([s,o])})})},unvip:function(s,o){var e=this;return s=u.channel(s),o=u.username(o),this._sendCommand(null,s,"/unvip ".concat(o),function(t,n){e.once("_promiseUnvip",function(e){e?n(e):t([s,o])})})},vip:function(s,o){var e=this;return s=u.channel(s),o=u.username(o),this._sendCommand(null,s,"/vip ".concat(o),function(t,n){e.once("_promiseVip",function(e){e?n(e):t([s,o])})})},vips:function(e){var t=this;return e=u.channel(e),this._sendCommand(null,e,"/vips",function(n,s){t.once("_promiseVips",function(e,t){e?s(e):n(t)})})},whisper:function(n,s){var o=this;return(n=u.username(n))===this.getUsername()?Promise.reject("Cannot send a whisper to the same account."):this._sendCommand(null,"#tmijs","/w ".concat(n," ").concat(s),function(e,t){o.once("_promiseWhisper",function(e){e&&t(e)})}).catch(function(e){if(e&&"string"==typeof e&&0!==e.indexOf("No response from Twitch."))throw e;var t=u.channel(n),e=Object.assign({"message-type":"whisper","message-id":null,"thread-id":null,username:o.getUsername()},o.globaluserstate);return o.emits(["whisper","message"],[[t,e,s,!0],[t,e,s,!0]]),[n,s]})}}},{"./utils":9}],5:[function(e,t,n){"use strict";function s(e){return(s="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function o(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function c(e){return"function"==typeof e}function u(e){return"object"===s(e)&&null!==e}function a(e){return void 0===e}((t.exports=o).EventEmitter=o).prototype._events=void 0,o.prototype._maxListeners=void 0,o.defaultMaxListeners=10,o.prototype.setMaxListeners=function(e){if("number"!=typeof e||e<0||isNaN(e))throw TypeError("n must be a positive number");return this._maxListeners=e,this},o.prototype.emit=function(e){var t,n,s,o,i,r;if(this._events||(this._events={}),"error"===e&&(!this._events.error||u(this._events.error)&&!this._events.error.length)){if((t=arguments[1])instanceof Error)throw t;throw TypeError('Uncaught, unspecified "error" event.')}if(a(n=this._events[e]))return!1;if(c(n))switch(arguments.length){case 1:n.call(this);break;case 2:n.call(this,arguments[1]);break;case 3:n.call(this,arguments[1],arguments[2]);break;default:o=Array.prototype.slice.call(arguments,1),n.apply(this,o)}else if(u(n))for(o=Array.prototype.slice.call(arguments,1),s=(r=n.slice()).length,i=0;i<s;i++)r[i].apply(this,o);return!0},o.prototype.on=o.prototype.addListener=function(e,t){var n;if(!c(t))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",e,c(t.listener)?t.listener:t),this._events[e]?u(this._events[e])?this._events[e].push(t):this._events[e]=[this._events[e],t]:this._events[e]=t,u(this._events[e])&&!this._events[e].warned&&(n=a(this._maxListeners)?o.defaultMaxListeners:this._maxListeners)&&0<n&&this._events[e].length>n&&(this._events[e].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[e].length),"function"==typeof console.trace&&console.trace()),this},o.prototype.once=function(e,t){if(!c(t))throw TypeError("listener must be a function");var n=!1;if(this._events.hasOwnProperty(e)&&"_"===e.charAt(0)){var s,o=1,i=e;for(s in this._events)this._events.hasOwnProperty(s)&&s.startsWith(i)&&o++;e+=o}function r(){"_"!==e.charAt(0)||isNaN(e.substr(e.length-1))||(e=e.substring(0,e.length-1)),this.removeListener(e,r),n||(n=!0,t.apply(this,arguments))}return r.listener=t,this.on(e,r),this},o.prototype.removeListener=function(e,t){var n,s,o,i;if(!c(t))throw TypeError("listener must be a function");if(!this._events||!this._events[e])return this;if(o=(n=this._events[e]).length,s=-1,n===t||c(n.listener)&&n.listener===t){if(delete this._events[e],this._events.hasOwnProperty(e+"2")&&"_"===e.charAt(0)){var r,a=e;for(r in this._events)this._events.hasOwnProperty(r)&&r.startsWith(a)&&(isNaN(parseInt(r.substr(r.length-1)))||(this._events[e+parseInt(r.substr(r.length-1)-1)]=this._events[r],delete this._events[r]));this._events[e]=this._events[e+"1"],delete this._events[e+"1"]}this._events.removeListener&&this.emit("removeListener",e,t)}else if(u(n)){for(i=o;0<i--;)if(n[i]===t||n[i].listener&&n[i].listener===t){s=i;break}if(s<0)return this;1===n.length?(n.length=0,delete this._events[e]):n.splice(s,1),this._events.removeListener&&this.emit("removeListener",e,t)}return this},o.prototype.removeAllListeners=function(e){var t,n;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[e]&&delete this._events[e],this;if(0===arguments.length){for(t in this._events)"removeListener"!==t&&this.removeAllListeners(t);return this.removeAllListeners("removeListener"),this._events={},this}if(c(n=this._events[e]))this.removeListener(e,n);else if(n)for(;n.length;)this.removeListener(e,n[n.length-1]);return delete this._events[e],this},o.prototype.listeners=function(e){e=this._events&&this._events[e]?c(this._events[e])?[this._events[e]]:this._events[e].slice():[];return e},o.prototype.listenerCount=function(e){if(this._events){e=this._events[e];if(c(e))return 1;if(e)return e.length}return 0},o.listenerCount=function(e,t){return e.listenerCount(t)}},{}],6:[function(e,t,n){"use strict";var s=e("./utils"),o="info",i={trace:0,debug:1,info:2,warn:3,error:4,fatal:5};function r(t){return function(e){i[o]<=i[t]&&console.log("[".concat(s.formatDate(new Date),"] ").concat(t,": ").concat(e))}}t.exports={setLevel:function(e){o=e},trace:r("trace"),debug:r("debug"),info:r("info"),warn:r("warn"),error:r("error"),fatal:r("fatal")}},{"./utils":9}],7:[function(e,t,n){"use strict";var r=e("./utils"),a=/\S+/g;function s(e,t,n,s,o){var n=2<arguments.length&&void 0!==n?n:",",i=3<arguments.length&&void 0!==s?s:"/",r=4<arguments.length?o:void 0,s=e[t];if(void 0===s)return e;o="string"==typeof s;if(e[t+"-raw"]=o?s:null,!0===s)return e[t]=null,e;if(e[t]={},o)for(var a=s.split(n),c=0;c<a.length;c++){var u=a[c].split(i),l=u[1];void 0!==r&&l&&(l=l.split(r)),e[t][u[0]]=l||null}return e}t.exports={badges:function(e){return s(e,"badges")},badgeInfo:function(e){return s(e,"badge-info")},emotes:function(e){return s(e,"emotes","/",":",",")},emoteRegex:function(e,t,n,s){a.lastIndex=0;for(var o,i=new RegExp("(\\b|^|\\s)"+r.unescapeHtml(t)+"(\\b|$|\\s)");null!==(o=a.exec(e));)i.test(o[0])&&(s[n]=s[n]||[],s[n].push([o.index,a.lastIndex-1]))},emoteString:function(e,t,n,s){var o;for(a.lastIndex=0;null!==(o=a.exec(e));)o[0]===r.unescapeHtml(t)&&(s[n]=s[n]||[],s[n].push([o.index,a.lastIndex-1]))},transformEmotes:function(t){var n="";return Object.keys(t).forEach(function(e){n="".concat(n+e,":"),t[e].forEach(function(e){return n="".concat(n+e.join("-"),",")}),n="".concat(n.slice(0,-1),"/")}),n.slice(0,-1)},formTags:function(e){var t,n=[];for(t in e){var s=r.escapeIRC(e[t]);n.push("".concat(t,"=").concat(s))}return"@".concat(n.join(";"))},msg:function(e){var t={raw:e,tags:{},prefix:null,command:null,params:[]},n=0,s=0;if(64===e.charCodeAt(0)){if(-1===(s=e.indexOf(" ")))return null;for(var o=e.slice(1,s).split(";"),i=0;i<o.length;i++){var r=o[i],a=r.split("=");t.tags[a[0]]=r.substring(r.indexOf("=")+1)||!0}n=s+1}for(;32===e.charCodeAt(n);)n++;if(58===e.charCodeAt(n)){if(-1===(s=e.indexOf(" ",n)))return null;for(t.prefix=e.slice(n+1,s),n=s+1;32===e.charCodeAt(n);)n++}if(-1===(s=e.indexOf(" ",n)))return e.length>n?(t.command=e.slice(n),t):null;for(t.command=e.slice(n,s),n=s+1;32===e.charCodeAt(n);)n++;for(;n<e.length;){if(s=e.indexOf(" ",n),58===e.charCodeAt(n)){t.params.push(e.slice(n+1));break}if(-1===s){if(-1===s){t.params.push(e.slice(n));break}}else for(t.params.push(e.slice(n,s)),n=s+1;32===e.charCodeAt(n);)n++}return t}}},{"./utils":9}],8:[function(e,t,n){"use strict";function o(e,t){for(var n=0;n<t.length;n++){var s=t[n];s.enumerable=s.enumerable||!1,s.configurable=!0,"value"in s&&(s.writable=!0),Object.defineProperty(e,s.key,s)}}t.exports=function(){function t(e){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),this.queue=[],this.index=0,this.defaultDelay=void 0===e?3e3:e}var e,n,s;return e=t,(n=[{key:"add",value:function(e,t){this.queue.push({fn:e,delay:t})}},{key:"next",value:function(){var e,t=this,n=this.index++,n=this.queue[n];n&&(e=this.queue[this.index],n.fn(),e&&(n=void 0===e.delay?this.defaultDelay:e.delay,setTimeout(function(){return t.next()},n)))}}])&&o(e.prototype,n),s&&o(e,s),t}()},{}],9:[function(e,f,t){!function(h){!function(){"use strict";function t(e){return(t="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}var n,s=/^\u0001ACTION ([^\u0001]+)\u0001$/,o=/^(justinfan)(\d+$)/,i=/\\([sn:r\\])/g,r=/([ \n;\r\\])/g,a={s:" ",n:"",":":";",r:""},c={" ":"s","\n":"n",";":":","\r":"r"},u=new RegExp("^(?:(?:https?|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))\\.?)(?::\\d{2,5})?(?:[/?#]\\S*)?$","i"),l=/[|\\^$*+?:#]/,m=f.exports={get:function(e,t){return void 0===e?t:e},hasOwn:function(e,t){return{}.hasOwnProperty.call(e,t)},promiseDelay:function(t){return new Promise(function(e){return setTimeout(e,t)})},isFinite:(n=function(e){return isFinite(e)&&!isNaN(parseFloat(e))},e.toString=function(){return n.toString()},e),toNumber:function(e,t){if(null===e)return 0;t=Math.pow(10,m.isFinite(t)?t:0);return Math.round(e*t)/t},isInteger:function(e){return!isNaN(m.toNumber(e,0))},isRegex:function(e){return l.test(e)},isURL:function(e){return u.test(e)},justinfan:function(){return"justinfan".concat(Math.floor(8e4*Math.random()+1e3))},isJustinfan:function(e){return o.test(e)},channel:function(e){var t;return"#"===(t=(e||"").toLowerCase())[0]?t:"#"+t},username:function(e){var t;return"#"===(t=(e||"").toLowerCase())[0]?t.slice(1):t},token:function(e){return e?e.toLowerCase().replace("oauth:",""):""},password:function(e){e=m.token(e);return e?"oauth:".concat(e):""},actionMessage:function(e){return e.match(s)},replaceAll:function(e,t){if(null==e)return null;for(var n in t)e=e.replace(new RegExp(n,"g"),t[n]);return e},unescapeHtml:function(e){return e.replace(/\\&amp\\;/g,"&").replace(/\\&lt\\;/g,"<").replace(/\\&gt\\;/g,">").replace(/\\&quot\\;/g,'"').replace(/\\&#039\\;/g,"'")},unescapeIRC:function(e){return e&&"string"==typeof e&&e.includes("\\")?e.replace(i,function(e,t){return t in a?a[t]:t}):e},escapeIRC:function(e){return e&&"string"==typeof e?e.replace(r,function(e,t){return t in c?"\\".concat(c[t]):t}):e},addWord:function(e,t){return e.length?e+" "+t:e+t},splitLine:function(e,t){var n=e.substring(0,t).lastIndexOf(" ");return[e.substring(0,n=-1===n?t-1:n),e.substring(n+1)]},extractNumber:function(e){for(var t=e.split(" "),n=0;n<t.length;n++)if(m.isInteger(t[n]))return~~t[n];return 0},formatDate:function(e){var t=e.getHours(),e=((e=e.getMinutes())<10?"0":"")+e;return"".concat(t=(t<10?"0":"")+t,":").concat(e)},inherits:function(e,t){e.super_=t;function n(){}n.prototype=t.prototype,e.prototype=new n,e.prototype.constructor=e},isNode:function(){try{return"object"===(void 0===h?"undefined":t(h))&&"[object process]"===Object.prototype.toString.call(h)}catch(e){}return!1}};function e(e){return n.apply(this,arguments)}}.call(this)}.call(this,e("_process"))},{_process:11}],10:[function(e,t,n){},{}],11:[function(e,t,n){var s,o,t=t.exports={};function i(){throw new Error("setTimeout has not been defined")}function r(){throw new Error("clearTimeout has not been defined")}function a(t){if(s===setTimeout)return setTimeout(t,0);if((s===i||!s)&&setTimeout)return s=setTimeout,setTimeout(t,0);try{return s(t,0)}catch(e){try{return s.call(null,t,0)}catch(e){return s.call(this,t,0)}}}!function(){try{s="function"==typeof setTimeout?setTimeout:i}catch(e){s=i}try{o="function"==typeof clearTimeout?clearTimeout:r}catch(e){o=r}}();var c,u=[],l=!1,m=-1;function h(){l&&c&&(l=!1,c.length?u=c.concat(u):m=-1,u.length&&f())}function f(){if(!l){var e=a(h);l=!0;for(var t=u.length;t;){for(c=u,u=[];++m<t;)c&&c[m].run();m=-1,t=u.length}c=null,l=!1,function(t){if(o===clearTimeout)return clearTimeout(t);if((o===r||!o)&&clearTimeout)return o=clearTimeout,clearTimeout(t);try{o(t)}catch(e){try{return o.call(null,t)}catch(e){return o.call(this,t)}}}(e)}}function p(e,t){this.fun=e,this.array=t}function d(){}t.nextTick=function(e){var t=new Array(arguments.length-1);if(1<arguments.length)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];u.push(new p(e,t)),1!==u.length||l||a(f)},p.prototype.run=function(){this.fun.apply(null,this.array)},t.title="browser",t.browser=!0,t.env={},t.argv=[],t.version="",t.versions={},t.on=d,t.addListener=d,t.once=d,t.off=d,t.removeListener=d,t.removeAllListeners=d,t.emit=d,t.prependListener=d,t.prependOnceListener=d,t.listeners=function(e){return[]},t.binding=function(e){throw new Error("process.binding is not supported")},t.cwd=function(){return"/"},t.chdir=function(e){throw new Error("process.chdir is not supported")},t.umask=function(){return 0}},{}]},{},[1]);
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);
