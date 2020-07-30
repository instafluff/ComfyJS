require('dotenv').config();
var ComfyJS = require("./app");
ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
  console.log( command, user, message, flags, extra );
  if( command == "say" ) {
    ComfyJS.Say( "test reply" );
  }
}
ComfyJS.onChat = ( user, message, flags, self, extra ) => {
  console.log( user, message, flags, self, extra );
}
ComfyJS.onReward = ( user, reward, cost, extra ) => {
  console.log( user, reward, cost, extra );
}
ComfyJS.Init( process.env.TWITCHUSER, process.env.OAUTH );
