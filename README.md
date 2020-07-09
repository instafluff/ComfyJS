# Comfy.JS
![npm](https://img.shields.io/npm/v/comfy.js?style=flat-square) ![GitHub](https://img.shields.io/github/license/instafluff/comfyjs?style=flat-square) [![](https://data.jsdelivr.com/v1/package/npm/comfy.js/badge)](https://www.jsdelivr.com/package/npm/comfy.js)

We built this Comfy Twitch Chat Module live on Twitch for Coding Cafe!

**Special Thanks:** *Comfy.JS is possible thanks to [tmi.js](https://tmijs.com/) maintained by [@AlcaDesign](https://github.com/AlcaDesign)*

**Comfy.JS** lets you integrate with Twitch chat for your Twitch channel ***SUPER EASILY*** in just a few lines of code. Here's a quick 3-min video on how to use it: (Click image to open video)

[![ComfyJS How-To Video](https://img.youtube.com/vi/oXpPwnUQCCk/hqdefault.jpg)](https://www.youtube.com/watch?v=oXpPwnUQCCk)

## Instafluff ##
> *Like these projects? The best way to support my open-source projects is by becoming a Comfy Sponsor on GitHub!*

> https://github.com/sponsors/instafluff

> *Come and hang out with us at the Comfiest Corner on Twitch!*

> https://twitch.tv/instafluff

## Instructions ##

#### Node
1. Install `comfy.js`
```
npm install comfy.js --save
```

2. Respond to !commands your channel
```javascript
var ComfyJS = require("comfy.js");
ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
  if( flags.broadcaster && command === "test" ) {
    console.log( "!test was typed in chat" );
  }
}
ComfyJS.Init( "MyTwitchChannel" );
```

#### Browser
1. Download and add `comfy.js` from the `dist` folder or include from the JSDelivr CDN:
```javascript
<script src="comfy.min.js"></script>
```
OR
```javascript
<script src="https://cdn.jsdelivr.net/npm/comfy.js@latest/dist/comfy.min.js"></script>
```

2. Respond to !commands your channel
```html
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/comfy.js@latest/dist/comfy.min.js"></script>
  </head>
  <body>
    <script type="text/javascript">
      ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
        if( flags.broadcaster && command === "test" ) {
          console.log( "!test was typed in chat" );
        }
      }
      ComfyJS.Init( "MyTwitchChannel" );
    </script>
  </body>
</html>
```

## Flags ##

Currently, the flags possible in `onCommand()` and `onChat()` are:

- broadcaster
- mod
- founder
- subscriber
- vip
- highlighted
- customReward

## Extra Parameter ##

Currently, the `extra` parameter for the `onCommand()` contains the following fields:

- id (the message message)
- channel
- roomId
- messageType
- messageEmotes
- isEmoteOnly
- userId
- username
- displayName
- userColor
- userBadges
- flags
- timestamp
- customRewardId (only works with custom channel rewards with required-text)

If the message is a command, the `extra` parameter will contain an additional field:

- sinceLastCommand

which contains the information on the time periods in `ms` since the last time any user, or the specific user, has used the same
command. This field can be convenient to be used for setting global cooldown or spamming filters. See examples below:

```javascript
ComfyJS.onChat = ( user, message, flags, self, extra ) => {
  if( flags.broadcaster && command === "test" ) {
    if( extra.sinceLastCommand.any < 100 ) {
      console.log(
        `The last '!test' command by any user was sent less than 100 ms ago`
      );            
    }

    if( extra.sinceLastCommand.user < 100 ) {
      console.log(
        `The last '!test' command by this specific user (as denoted by the 'user' parameter) was sent less than 100 ms ago`
      );            
    }
  }
}
```

## Reading Chat Messages ##

You can read chat messages by using the `onChat()` handler

```javascript
ComfyJS.onChat = ( user, message, flags, self, extra ) => {
  console.log( user, message );
}
```

## Sending Chat Messages ##

Sending Chat Messages can be done through `ComfyJS.Say( message )` but requires an OAUTH password when connecting to chat.

#### Securely adding your password
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
ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
  if( command === "test" ) {
    ComfyJS.Say( "replying to !test" );
  }
}
ComfyJS.Init( process.env.TWITCHUSER, process.env.OAUTH );
```

## Joining a Different Channel ##

You can join a different channel or groups of channels by specifying in the `Init()`

#### Joining a Single Channel

```javascript
ComfyJS.Init( "MyTwitchChannel", null, "ChannelToJoin" );
```

#### Joining Multiple Channels

```javascript
ComfyJS.Init( "MyTwitchChannel", null, [ "ChannelA", "ChannelB", "ChannelC" ] );
```

## Channel Point Reward Redemptions

Channel Point Reward Redemptions require extra Twitch OAuth permission scopes.
You can use this tool: [https://twitchapps.com/tokengen/](https://twitchapps.com/tokengen/)

Scopes: `channel:read:redemptions user:read:email chat:edit chat:read`

```javascript
ComfyJS.onReward = ( user, reward, cost, extra ) => {
  console.log( user + " redeemed " + reward + " for " + cost );
}
```

## Disconnecting from Server

You can disconnect from the server and all channels by using `Disconnect()`.

```javascript
ComfyJS.Disconnect();
```

## All Supported Events ##
 - **onCommand**`( user, command, message, flags, extra )`
    - Responds to "!" commands
 - **onChat**`( user, message, flags, self, extra )`
    - Responds to user chatting
 - **onWhisper**`( user, message, flags, self, extra )`
    - Responds to user whisper event
 - **onMessageDeleted**`( id, extra )`
    - Responds to chat message deleted
 - **onReward**`( user, reward, cost, message, extra )`
    - **REQUIRES EXTRA PERMISSION SCOPES**
    - Responds to Channel Point Redemptions
 - **onJoin**`( user, self, extra )`
    - Responds to user joining the chat
 - **onPart**`( user, self, extra )`
    - Responds to user leaving the chat
 - **onHosted**`( user, viewers, autohost, extra )`
    - Responds to channel being hosted
    - Requires being authorized as the broadcaster
 - **onRaid**`( user, viewers, extra )`
    - Responds to raid event
 - **onCheer**`( user, message, bits, flags, extra )`
    - Responds to user cheering
 - **onSub**`( user, message, subTierInfo, extra )`
    - Responds to user channel subscription
 - **onResub**`( user, message, streamMonths, cumulativeMonths, subTierInfo, extra )`
    - Responds to user channel subscription anniversary
 - **onSubGift**`( gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra )`
    - Responds to user gift subscription
 - **onSubMysteryGift**`( gifterUser, numbOfSubs, senderCount, subTierInfo, extra )`
    - Responds to user sending gift subscriptions
 - **onGiftSubContinue**`( user, sender, extra )`
    - Responds to user continuing gift subscription
 - **onConnected**`( address, port, isFirstConnect )`
    - Responds when connecting to the Twitch chat.
 - **onReconnect**`( reconnectCount )`
    - Responds when attempting to reconnect to the Twitch chat.
 - **onError**`( error )`
    - Hook for Errors

## Credits ##
Thank you to all the participants of this project!

**Instafluff, Instafriend, Neo_TA, ChatTranslator, fydo, That_MS_Gamer, MrRayKoma, Amarogine, HunWalk, simrose4u, sparky_pugwash, soggycoffee, blackdawn1980, BooobieTrap, lizardqueen, TastyGamers101, MalForTheWin, SourBeers, Stay_Hydrated_Bot, codeaurora, DutchGamer46, TheHungerService, BungalowGlow, koralina_211, TominationTime, itsDeke, fd_god92, SushiDay, FlyToto_, Docpinecone, katori15, ScrtSolstice, QeraiX, superravemonster, Jwh1o1, Deitypotato, Stobie, Chlapicek99, tehWokes, SuperChihuahua, FranC312, FuriousFur, Moopaloo, CreativeBuilds, donaldwm, Zorchenhimer, Grognardian, ravavyr, Chibigirl24, DR4G0N_S4MUR41, PokemoHero, rekaj3773, cunavrito, TheGeekGeneration, DevMerlin, julieee22, malfunct, blazeninja3, pookiepew, xxMiabellexx, Rlchibi**

Thank you to everyone that helped in turning Comfy.JS into a browser module!

**Instafluff, Instafriend, ChatTranslator, Gilokk0, qbotv3, That_MS_Gamer, KitAnnLIVE, simrose4u, MacabreMan2, LuRiMer313, sparky_pugwash, AbbyFabby, sethorizer, julieee22, Numb3rY, Jwh1o1, baileydale, kevkab, Stay_Hydrated_Bot, DrJavaSaurus, stresstest, BungalowGlow, Dr_Zero, NiteCrawla, fd_god92, DrEriksen, codeheir, Talk2meGooseman, sneelps, cottonsmiles, DutchGamer46, LilyHazel, Kyoslilmonster, guthron, DragosNox, sciondragons, HonestDanGames, Xynal, MerlinLeWizard, FablesGames, BrainoidGames, donaldwm, Gharrotey, RIKACHET, HeyOhKei, DevMerlin, CrimsonKnightZero, ellie_pop, ItsNaomiArt, SomaPills, TheSabbyLife, bktdakid31, IsaisChannel, thegooseofwild, itsDeke, bubblesandunicorns, jellydance, MalForTheWin, Chibigirl24, Pearcington, RikuRinku, rockysenpai24, DEAD_P1XL, codeaurora, EndlessMoonfall, fromtheannex, Optik_Nerve, qerwtr546, REAZNxxx, GoonPontoon, JesseSkinner, roberttables, pookiepew, Lannonbr, SoG_Cuicui, Deitypotato, shalomhanukkahbneishimon, UpmostKek, xeiu, skatesubzero, kingswerv, K1ng440, kaisuke, kinbiko, malfunct, BooobieTrap, Kara_Kim**

Thanks to everyone who joined in on adding Twitch PubSub support for Channel Point Reward Redemptions to Comfy.JS!

**Instafluff, Instafriend, informathemusic, aRandomTim, shadesofpixie, That_MS_Gamer, ToeNeeHee, httpJunkie, ryanchetty_1, calguru, chrislocality, Atanerah, rekaj3773, moshiko777, fizhes, AnnaCodes, Smokestormx, TheGeekGeneration, SavenaV, KotaKlan, rosebutterfly24, Simpathey, Spationaute, DjDesidera, JupiterZky, judybelle1, Shaezonai, shineslove, airsickmammal, walaber, jellydance, LilyHazel, PainArtist, Nickloop_TTV, VerbatimStudios, silversurfer1989, BellaTriXrbsa, holloway87, Asherroth86, Tiwesday, not_your_point, JenDevelops, tenaciousw, Cuicui_off, stevis5, aranhawaii, DevMerlin, wabes1, jeckle, opti_21, sparky_pugwash, tommunist_64, DutchGamer46, DoctorArgus, simrose4u, DreamGardenPanda, onelineofme, stuyksoft, Simployed, JustinZedly, Rhedone, DrMikachu, Gurkenkater, MrDemonWolf, saltipretzelz, MerlinLeWizard, Kurokirisu, Juscekame, FuriousFur, andresurrego, MissNightcrawler, karatewump, DrillsKibo, florinpop17, Axell99Design, Ahmed_Riad_1, Keegan_GDiegen, PortaalGaming, mjewl, cheppy4444dude, Soccerdude4444, klforthwind, penguinian, 10TenArt, Atndesign, DNIStream, LoveSudoNimh, prosto_artem27, lucasnramos, A_Ninja_For_Jesus_Bruh, RedChrisMS, Lineyatronic, Totte292, A_Gold_Fish, ShiDotMoe, tbdgamer, MatthewDGroves, dota2attitude, mistersyntax, SekaCakes, llamakid29, CryptoCoyote, MurdocTurner, JeanValjean80, walpolea, Jessi8712, butschibuuuu, Cmiley6, TheFlamingWings, hehe24h, cryogen_sw, DrJavaSaurus, rota22_, julieee22, bronick16, ScrtSolstice, ghostlupo86, wake_the_beast, williamcameron2, GizmoPugLife, OG24com**
