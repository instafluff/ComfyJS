// Comfy.JS v@VERSION
var tmi = require( "tmi.js" );

var mainChannel = "";
var client = null;
var comfyJS = {
  version: function() {
    return "@VERSION";
  },
  onCommand: function( user, command, message, flags, extra ) {
    console.log( "onCommand default handler" );
  },
  onChat: function( user, message, flags, self, extra ) {
    console.log( "onChat default handler" );
  },
  onWhisper: function( user, message, flags, self, extra ) {
    console.log( "onWhisper default handler" );
  },
  onMessageDeleted: function( id, extra ) {
    console.log( "onMessageDeleted default handler" );
  },
  onJoin: function( username, self ) {
    console.log( "onJoin default handler" );
  },
  onPart: function( username, self ) {
    console.log( "onPart default handler" );
  },
  onHosted: function( username, viewers, autohost ) {
    console.log( "onHosted default handler" );
  },
  onRaid: function( username, viewers ) {
    console.log( "onRaid default handler" );
  },
  onSub: function( username, method, message, userstate ) {
    console.log( "onSub default handler" );
  },
  onResub: function( username, months, message, cumulativeMonths ) {
    console.log( "onResub default handler" );
  },
  onSubGift: function( username, streakMonths, recipient, senderCount ) {
    console.log( "onSubGift default handler" );
  },
  onSubMysteryGift: function( username, numbOfSubs, senderCount ) {
    console.log( "onSubMysteryGift default handler" );
  },
  onGiftSubContinue: function( username, sender, userstate ) {
    console.log( "onGiftSubContinue default handler" );
  },
  onCheer: function( userstate, message ) {
    console.log( "onCheer default handler" );
  },
  Say: function( message, channel ) {
    if( client ) {
      if( !channel ) {
        channel = mainChannel;
      }
      client.say( channel, message )
      .catch( function( error ) { console.log( "Error:", error ); } );
      return true;
    }
    return false;
  },
  Whisper: function( message, user ) {
    if( client ) {
      client.whisper( user, message )
      .catch( function( error ) { console.log( "Error:", error ); } );
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
      .catch( function( error ) { console.log( "Error:", error ); } );
      return true;
    }
    return false;
  },
  GetClient: function() {
    return client;
  },
  Init: function( username, password, channels ) {
    channels = channels || [ username ];
    if( !Array.isArray( channels ) ) {
      throw new Error( "Channels is not an array" );
    }
    mainChannel = channels[ 0 ];
    var options = {
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
    client.on( 'message', function( channel, userstate, message, self ) {
      try {
        var user = userstate[ "display-name" ] || userstate[ "username" ] || username;
        var isBroadcaster = ( "#" + userstate[ "username" ] ) === channel;
        var isMod = userstate[ "mod" ];
        var isSubscriber = ( userstate[ "badges" ] && typeof userstate[ "badges" ].subscriber !== "undefined" ) || userstate[ "subscriber" ];
        var isVIP = ( userstate[ "badges" ] && userstate[ "badges" ].vip === "1" ) || false;
        var userId = userstate[ "user-id" ];
        var messageId = userstate[ "id" ];
        var roomId = userstate[ "room-id" ];
        var badges = userstate[ "badges" ];
        var userColor = userstate[ "color" ];
        var emotes = userstate[ "emotes" ];
        var isEmoteOnly = userstate[ "emote-only" ] || false;
        var messageType = userstate[ "message-type" ];
        var flags = {
          broadcaster: isBroadcaster,
          mod: isMod,
          subscriber: isSubscriber,
          vip: isVIP
        };
        var extra = {
          id: messageId,
          roomId: roomId,
          messageType: messageType,
          messageEmotes: emotes,
          isEmoteOnly: isEmoteOnly,
          userId: userId,
          username: userstate[ "username" ],
          displayName: userstate[ "display-name" ],
          userColor: userColor,
          userBadges: badges
        };
        if( !self && message[ 0 ] === "!" ) {
          // Message is a command
          var parts = message.split( / (.*)/ );
          var command = parts[ 0 ].slice( 1 ).toLowerCase();
          var msg = parts[ 1 ] || "";
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
        console.log( "Error:", error );
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
        console.log( "Error:", error );
      }
    });
    client.on( 'join', function( channel, username, self ) {
      comfyJS.onJoin( username, self );
    });
    client.on( 'part', function( channel, username, self ) {
      comfyJS.onPart( username, self );
    });
    client.on( 'hosted', function( channel, username, viewers, autohost ) {
      comfyJS.onHosted( username, viewers, autohost );
    });
    client.on( 'raided', function( channel, username, viewers ) {
      comfyJS.onRaid( username, viewers );
    });
    client.on( 'subscription', function( channel, username, method, message, userstate ) {
      comfyJS.onSub( username, method, message, userstate );
    });
    client.on( 'resub', function( channel, username, months, message, userstate, methods ) {
      var cumulativeMonths = ~~userstate[ 'msg-param-cumulative-months' ];
      comfyJS.onResub( username, months, message, cumulativeMonths );
    });
    client.on( 'cheer', function( channel, userstate, message ) {
      comfyJS.onCheer( userstate, message )
    });
    client.on( 'subgift', function( channel, username, streakMonths, recipient, methods, userstate ) {
      var senderCount = ~~userstate[ 'msg-param-sender-count' ];
      comfyJS.onSubGift( username, streakMonths, recipient, senderCount );
    });
    client.on( 'submysterygift', function( channel, username, numbOfSubs, methods, userstate ) {
      var senderCount = ~~userstate[ 'msg-param-sender-count' ];
      comfyJS.onSubMysterySubGift( username, numbOfSubs, senderCount );
    });
    client.on( 'giftpaidupgrade', function( channel, username, sender, userstate ) {
      comfyJS.onGiftSubContinue( username, sender, userstate );
    });
    client.on( 'connected', function( address, port ) {
      console.log( 'Connected:' + address + ':' + port );
    });
    client.on( 'reconnect', function() {
      console.log( 'Reconnecting' );
    });
    client.connect()
    .catch( function( error ) { console.log( "Error:", error ); } );
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
