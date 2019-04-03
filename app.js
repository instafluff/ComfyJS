// Comfy.JS v@VERSION
var tmi = require( "tmi.js" );

var mainChannel = "";
var client = null;
var comfyJS = {
  version: function() {
    return "@VERSION";
  },
  onCommand: function( user, command, message, flags ) {
    console.log( "onCommand default handler" );
  },
  onChat: function( user, message, flags, self ) {
    console.log( "onChat default handler" );
  },
  onWhisper: function( user, message, flags, self ) {
    console.log( "onWhisper default handler" );
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
    client.on( 'message', function ( channel, userstate, message, self ) {
      try {
        var user = userstate[ "display-name" ] || userstate[ "username" ] || username;
        var isBroadcaster = ( "#" + userstate[ "username" ] ) === channel;
        var isMod = userstate[ "mod" ];
        var isSubscriber = ( userstate[ "badges" ] && typeof userstate[ "badges" ].subscriber !== "undefined" ) || userstate[ "subscriber" ];
        var isVIP = ( userstate[ "badges" ] && userstate[ "badges" ].vip === "1" ) || false;
        var messageType = userstate[ "message-type" ];
        var flags = {
          broadcaster: isBroadcaster,
          mod: isMod,
          subscriber: isSubscriber,
          vip: isVIP
        };
        if( !self && message[ 0 ] === "!" ) {
          // Message is a command
          var parts = message.split( / (.*)/ );
          var command = parts[ 0 ].slice( 1 ).toLowerCase();
          var msg = parts[ 1 ] || "";
          comfyJS.onCommand( user, command, msg, flags );
        }
        else {
          if( messageType === "action" || messageType === "chat" ) {
            comfyJS.onChat( user, message, flags, self );
          }
          else if( messageType === "whisper" ) {
            comfyJS.onWhisper( user, message, flags, self );
          }
        }
      }
      catch( error ) {
        console.log( "Error:", error );
      }
    });
    client.on( 'connected', function ( address, port ) { console.log( "Connected: " + address + ":" + port ) } );
    client.on( 'reconnect', function () { console.log( 'Reconnecting' ) } );
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
