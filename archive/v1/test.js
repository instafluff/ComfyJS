require('dotenv').config();
var ComfyJS = require("./app");
ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
  console.log( "onCommand:", command, user, message, flags, extra );
  if( command == "say" ) {
    ComfyJS.Say( "test reply" );
  }
}
ComfyJS.onChat = ( user, message, flags, self, extra ) => {
  console.log( "onChat:", user, message, flags, self, extra );
}
ComfyJS.onWhisper = ( user, message, flags, self, extra ) => {
  console.log( "onWhisper:", user, message, flags, self, extra );
}
ComfyJS.onReward = ( user, reward, cost, extra ) => {
  console.log( "onReward:", user, reward, cost, extra );
}
ComfyJS.onHypeTrain = ( type, level, progress, goal, total, timeRemainingInMS, extra ) => {
  console.log( "onHypeTrain:", type, level, progress, goal, total, timeRemainingInMS, extra );
}
ComfyJS.onShoutout = ( channelDisplayName, viewerCount, timeRemainingInMS, extra ) => {
  console.log( "onShoutout:", channelDisplayName, viewerCount, timeRemainingInMS, extra );
}
ComfyJS.onPoll = ( type, title, choices, votes, timeRemainingInMS, extra ) => {
  console.log( "onPoll:", type, title, choices, votes, timeRemainingInMS, extra );
}
ComfyJS.onPrediction = ( type, title, outcomes, topPredictors, timeRemainingInMS, extra ) => {
  console.log( "onPrediction:", type, title, outcomes, topPredictors, timeRemainingInMS, extra );
}
ComfyJS.Init( process.env.TWITCHUSER, process.env.OAUTH );
