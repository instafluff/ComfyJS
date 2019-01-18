var TwitchJS = require( "twitch-js" );

var channel = "";
var client = null;
var comfyJS = {
  onCommand: function( command, user, flags ) {
    console.log( "onCommand default handler" );
  },
  Say: function( message ) {
    if( client ) {
      client.say( channel, message );
    }
  },
  Init: function( username, password = null ) {
    channel = "#" + username;
    const options = {
      channels: [ channel ],
      identity: {
        username: username,
        password: password
      },
    };

    client = new TwitchJS.client( options );
    client.on( 'chat', ( channel, userstate, message, self ) => {
      if( message.match( /^!*/ ) ) {
        let user = userstate[ "display-name" ] || userstate[ "username" ];
        let isBroadcaster = ( "#" + userstate[ "username" ] ) == channel;
        let isMod = userstate[ "mod" ];
        let parts = message.split( " " );
        let command = parts[ 0 ];
        let text = message.replace( command, "" ).trim();
        comfyJS.onCommand( user, command, text, {
          broadcaster: isBroadcaster,
          mod: isMod
        });
      }
    });
    client.connect();
  }
};

module.exports = comfyJS;
