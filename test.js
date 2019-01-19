require('dotenv').config();
var ComfyJS = require("./app");
ComfyJS.onCommand = ( user, command, message, flags ) => {
  console.log( command, user, message, flags );
  if( command == "say" ) {
    ComfyJS.Say( "test reply" );
  }
}
ComfyJS.Init( process.env.TWITCHUSER, process.env.OAUTH );
