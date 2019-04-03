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
    client.on( 'connected', function( address, port ) { console.log( "Connected: " + address + ":" + port ) } );
    client.on( 'reconnect', function() { console.log( 'Reconnecting' ) } );
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
