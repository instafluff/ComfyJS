var u = (e, n, t) => {
  if (!n.has(e))
    throw TypeError("Cannot " + t);
};
var c = (e, n, t) => (u(e, n, "read from private field"), t ? t.call(e) : n.get(e)), p = (e, n, t) => {
  if (n.has(e))
    throw TypeError("Cannot add the same private member more than once");
  n instanceof WeakSet ? n.add(e) : n.set(e, t);
}, S = (e, n, t, o) => (u(e, n, "write to private field"), o ? o.call(e, t) : n.set(e, t), t);
function C(e, n) {
  const t = e.indexOf(" ", n);
  return {
    component: e.slice(n + 1, t),
    nextIndex: t + 1
  };
}
function T(e) {
  let n = {
    raw: e,
    tags: {},
    source: null,
    command: null,
    parameters: null
  }, t = 0;
  if (e.charAt(0) === "@") {
    const { component: o, nextIndex: r } = C(e, 0);
    for (const a of o.split(";")) {
      const l = a.split("=");
      n.tags[l[0]] = l[1];
    }
    t = r;
  }
  if (e.charAt(t) === ":") {
    const { component: o, nextIndex: r } = C(e, t);
    n.source = o, t = r;
  }
  if (t < e.length) {
    const o = e.slice(t).trim(), r = o.indexOf(":");
    n.command = o.slice(0, r < 0 ? void 0 : r).trim();
    const a = e.indexOf(":", t);
    a >= 0 && (n.parameters = e.slice(a + 1));
  }
  return n;
}
const b = global.WebSocket || require("ws"), w = "wss://irc-ws.chat.twitch.tv:443";
var s, m, f;
class E {
  constructor(n, t, o, r) {
    p(this, m);
    p(this, s, void 0);
    this.debug = !!r, (typeof o == "string" || o instanceof String) && (o = [o]), this.channels = o || [n], S(this, s, new b(w, ["irc"])), c(this, s).onopen = (a) => {
      if (c(this, s).send("CAP REQ :twitch.tv/tags twitch.tv/commands"), t)
        c(this, s).send(`PASS ${t}`), c(this, s).send(`NICK ${c(this, m, f)}`);
      else {
        const l = `justinfan${Math.floor(Math.random() * 99998999 + 1e3)}`, h = "INSTAFLUFF";
        c(this, s).send(`PASS ${h}`), c(this, s).send(`NICK ${l}`), c(this, s).send(`JOIN #${c(this, m, f)}`);
      }
    }, c(this, s).onmessage = (a) => {
      var h;
      console.log("PROCESSING:", a.data);
      const l = a.data.trim().split(`\r
`);
      for (const g of l) {
        const d = T(g);
        if (d.command) {
          const i = (h = d.command) == null ? void 0 : h.split(" ");
          switch (i[0]) {
            case "JOIN":
            case "PART":
            case "NOTICE":
            case "CLEARCHAT":
            case "HOSTTARGET":
            case "PRIVMSG":
              console.log("Channel:", i[1], d.parameters);
              break;
            case "PING":
              break;
            case "CAP":
              console.log("capabilities", i[1]);
              break;
            case "GLOBALUSERSTATE":
              console.log("Global User State");
              break;
            case "USERSTATE":
            case "ROOMSTATE":
              console.log("Channel:", i[1], d.parameters);
              break;
            case "RECONNECT":
              console.log("The Twitch IRC server is about to terminate the connection for maintenance.");
              break;
            case "421":
              return console.log(`Unsupported IRC command: ${i[2]}`), null;
            case "001":
              console.log("Channel:", i[1], d.parameters);
              break;
            case "002":
            case "003":
            case "004":
            case "353":
            case "366":
            case "372":
            case "375":
            case "376":
              console.log(`numeric message: ${i[0]}`);
              break;
            default:
              console.debug("Unsupported command", i[0]);
              break;
          }
        }
      }
    }, c(this, s).onerror = (a) => {
      console.log("ERROR", a);
    }, c(this, s).onclose = (a) => {
      console.log("CLOSE", a);
    };
  }
  get version() {
    return "@VERSION";
  }
}
s = new WeakMap(), m = new WeakSet(), f = function() {
  return this.channels[0];
};
const I = "instafluff", R = void 0;
new E(I, R);
//# sourceMappingURL=comfy.min.mjs.map
