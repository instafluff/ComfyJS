# ComfyJS v2 Backward-Compatibility Contract

ComfyJS v2 is allowed to add capabilities, but it must not require an existing v1 integration to change code.

This document defines the release gate. A checklist is not evidence by itself: each gate should be executable or backed by a recorded live differential run.

## Compatibility rule

The released v1 public surface is frozen:

- existing method names remain available
- existing synchronous return behavior remains available where callers could observe it
- existing callback names, argument order, and legacy payloads remain stable
- browser global, CommonJS, and ESM/package entry points remain supported
- new information is exposed additively through new methods/callbacks, not by mutating a legacy contract

`Init()` therefore remains the v1 fire-and-forget API. v2 adds `InitAsync()` for callers that want to await connection readiness.

For EventSub, legacy named callbacks remain compatibility APIs. v2 additionally exposes `onEventSub(type, event, version)` and `SubscribeEventSub(type, version, condition)` so Twitch can add subscription types without requiring a ComfyJS release.

## Automated release gates

Every pull request runs on Node 20, 22, and 24 and must pass:

1. TypeScript typecheck
2. deterministic parser/unit tests
3. captured real-IRC regression tests
4. v1 compatibility-contract tests
5. modern EventSub extension tests
6. ESM, CommonJS, and browser bundle builds
7. npm package-content verification

The compatibility tests should be expanded whenever a production regression or old integration pattern is discovered. A regression is not considered fixed until a test reproduces it.

## Live differential gate

Run the released v1 library and the candidate v2 build side by side against the same Twitch channel:

```bash
npm ci
npm run build
python3 -m http.server 8080
```

Then open:

`http://localhost:8080/examples/differential-live.html`

The harness loads released `comfy.js@1.1.30` in one isolated iframe and the local candidate bundle in another. Both connect to the same channel. Public callbacks are correlated by Twitch message/event identity where possible and their complete serialized argument arrays are compared.

OAuth is optional. Anonymous mode is enough for IRC chat coverage. An OAuth token is needed to exercise authenticated/EventSub behavior. The harness does not persist the token.

### Minimum live matrix before release

Record a zero-unexplained-difference run covering as many of these as Twitch makes practical:

- regular chat
- subscriber/mod/VIP chat
- `!command`
- `@mention !command`
- `/me` action
- highlighted message
- channel-points message
- cheer
- join / part
- timeout / ban / deleted message
- sub / resub
- gift sub / mystery gift / gift continuation
- raid
- room-state changes
- reward redemption
- poll
- prediction
- hype train
- shoutout
- whisper
- reconnect

Some events cannot be forced cheaply on demand. For those, retain real captured payloads as deterministic fixtures and accumulate live samples over time.

## Candidate-release process

Do not publish v2 directly over `latest`.

1. Merge compatibility work into `v2` only after CI is green.
2. Publish a prerelease such as `2.0.0-rc.1` under the npm `next` tag.
3. Run existing ComfyJS examples and representative real projects against that exact package artifact.
4. Run the live differential matrix from the packaged candidate, not only from source.
5. Leave the release candidate available long enough for opt-in community testing.
6. Promote the exact tested artifact/version to the stable release only after there are no unexplained compatibility differences.

## What “perfect backward compatibility” means here

No finite test suite can mathematically prove compatibility for every possible JavaScript program, especially for users that reached through `GetClient()` into undocumented `tmi.js` internals. The release standard is therefore:

- every documented v1 contract is executable as a regression test
- known real-world usage patterns are represented
- real Twitch traffic is differentially compared to the released v1 implementation
- package/runtime surfaces are smoke-tested
- any remaining escape-hatch differences are explicitly documented before stable release

`GetClient()` is the main area that deserves special scrutiny because v1 exposed the underlying `tmi.js` client. Projects using undocumented tmi internals through that escape hatch need to be collected and tested before calling v2 fully compatible.
