# Comfy.JS
We built this Comfy Twitch Chat Module live on Twitch for Coding Cafe!

## Instafluff ##
> *Come and hang out with us at the Comfiest Corner on Twitch!*

> https://twitch.tv/instafluff

> https://twitter.com/instafluffTV

## Instructions ##

1. Install `comfy.js`
```
npm install comfy.js --save
```
2. Respond to !commands your channel
```javascript
var ComfyJS = require("comfy.js");
ComfyJS.onCommand = ( user, command, message, flags ) => {
  if( command == "test" ) {
    console.log( "!test was typed in chat" );
  }
}
ComfyJS.Init( "MyTwitchChannel" );
```

## Sending Chat Messages ##

Sending Chat Messages can be done through `ComfyJS.Say()` but requires an OAUTH password when connecting to chat.

1. Get a Twitch Chat OAuth Password Token - [http://twitchapps.com/tmi/](http://twitchapps.com/tmi/)
2. Install `dotenv`
```
npm install dotenv --save
```
3. Create a file named `.env` that looks like this:
```javascript
TWITCHUSER=[YOUR-USERNAME-HERE]
OAUTH=[YOUR-OAUTH-PASS HERE] # e.g. OAUTH=oauth:kjh12bn1hsj78445234
```
4. Initialize with the Username and OAUTH password
```javascript
var ComfyJS = require("comfy.js");
ComfyJS.onCommand = ( user, command, message, flags ) => {
  if( command == "test" ) {
    ComfyJS.Say( "replying to !test" );
  }
}
ComfyJS.Init( process.env.TWITCHUSER, process.env.OAUTH );
```

## Credits ##
Thank you too all the participants of this project!

**Instafluff, Instafriend, Neo_TA, ChatTranslator, fydo, That_MS_Gamer, MrRayKoma, Amarogine, HunWalk, simrose4u, sparky_pugwash, soggycoffee, blackdawn1980, BooobieTrap, lizardqueen, TastyGamers101, MalForTheWin, SourBeers, Stay_Hydrated_Bot, codeaurora, DutchGamer46, TheHungerService, BungalowGlow, koralina_211, TominationTime, itsDeke, fd_god92, SushiDay, FlyToto_, Docpinecone, katori15, ScrtSolstice, QeraiX, superravemonster, Jwh1o1, Deitypotato, Stobie, Chlapicek99, tehWokes, SuperChihuahua, FranC312, FuriousFur, Moopaloo, CreativeBuilds, donaldwm, Zorchenhimer, Grognardian, ravavyr, Chibigirl24, DR4G0N_S4MUR41, PokemoHero, rekaj3773, cunavrito, TheGeekGeneration, DevMerlin, julieee22, malfunct, blazeninja3, pookiepew, xxMiabellexx, Rlchibi**
