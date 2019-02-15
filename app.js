var TwitchJS = require( "twitch-js" );

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
  Init: function( username, password = null ) {
    channel = "#" + username;
    const options = {
      channels: [ channel ],
      ...password && { identity: {
        username: username,
        password: password
      } },
    };

    client = new TwitchJS.client( options );
    client.on( 'chat', ( channel, userstate, message, self ) => {
      try {
        let user = userstate[ "display-name" ] || userstate[ "username" ];
        let isBroadcaster = ( "#" + userstate[ "username" ] ) == channel;
        let isMod = userstate[ "mod" ];
        let isSubscriber = userstate[ "subscriber" ];
        let isVIP = userstate[ "badges" ] && userstate[ "badges" ].vip;
        if( message.match( /^\!/ ) ) {
          // Message is a command
          let parts = message.split(/ (.*)/);
          comfyJS.onCommand( user, parts[ 0 ].substring( 1 ).toLowerCase(), parts[ 1 ] || "", {
            ...isBroadcaster && { broadcaster: isBroadcaster },
            ...isMod && { mod: isMod },
            ...isSubscriber && { subscriber: isSubscriber },
            ...isVIP && { vip: isVIP }
          });
        }
        else {
          comfyJS.onChat( user, message, {
            ...isBroadcaster && { broadcaster: isBroadcaster },
            ...isMod && { mod: isMod },
            ...isSubscriber && { subscriber: isSubscriber },
            ...isVIP && { vip: isVIP }
          });
        }
      }
      catch( error ) {
        console.log( "Error:", error );
      }
    });
    client.on( 'connected', ( address, port ) => console.log( `Connected: ${ address }:${ port }` ) );
    client.on( 'reconnect', () => console.log( 'Reconnecting' ) );
    client.connect();
  }
};

module.exports = comfyJS;
