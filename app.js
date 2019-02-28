var tmi = require( "tmi.js" );

var channel = "";
var client = null;
var comfyJS = {
  onCommand: function( user, command, message, flags ) {
    console.log( "onCommand default handler" );
  },
  onChat: function( user, message, flags ) {
    console.log( "onChat default handler" );
  },
  Say: function( message ) {
    if( client ) {
      client.say( channel, message );
      return true;
    }
    return false;
  },
  Init: function( username, password ) {
    channel = username;
    var options = password ? {
      connection: {
        reconnect: true,
        secure: true
      },
      channels: [ channel ],
      identity: {
        username: username,
        password: password
      },
    } : {
      connection: {
        reconnect: true,
        secure: true
      },
      channels: [ channel ]
    };

    client = new tmi.client( options );
    client.on( 'chat', function ( channel, userstate, message, self ) {
      try {
        var user = userstate[ "display-name" ] || userstate[ "username" ];
        var isBroadcaster = ( "#" + userstate[ "username" ] ) == channel;
        var isMod = userstate[ "mod" ];
        var isSubscriber = userstate[ "subscriber" ];
        var isVIP = userstate[ "badges" ] && userstate[ "badges" ].vip;
        if( message.match( /^\!/ ) ) {
          // Message is a command
          var parts = message.split(/ (.*)/);
          comfyJS.onCommand( user, parts[ 0 ].substring( 1 ).toLowerCase(), parts[ 1 ] || "", {
            broadcaster: isBroadcaster,
            mod: isMod,
            subscriber: isSubscriber,
            vip: isVIP
          });
        }
        else {
          comfyJS.onChat( user, message, {
            broadcaster: isBroadcaster,
            mod: isMod,
            subscriber: isSubscriber,
            vip: isVIP
          });
        }
      }
      catch( error ) {
        console.log( "Error:", error );
      }
    });
    client.on( 'connected', function ( address, port ) { console.log( "Connected: " + address + ":" + port ) } );
    client.on( 'reconnect', function () { console.log( 'Reconnecting' ) } );
    client.connect();
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
