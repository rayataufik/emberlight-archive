# Emberlight Archive

A lantern-lit top-down stealth game — a complete, original entry for make.fun's
["Make the best stealth game"](https://make.fun/bounty/best-stealth-game-20261121-1759) bounty.

Slip past the night watch in a lantern-lit archive: take every golden seal, then
reach the green exit unseen. Guards patrol with vision cones — crates and shelves
block their sight, shadows hide you, lantern light and running give you away.

## Play it

Serve `game/` over HTTP (ES modules need it — opening the file directly will not work):

```sh
cd game && python3 -m http.server 8000
```

Then open http://localhost:8000 — WASD to move, Shift to sneak, M to mute, R to restart.

## The game

- 3 levels: The Reading Room, The Stacks, The Vault
- Guards with raycast vision cones, patrol → suspicious → alert → search states
- Detection meter, sneak mode, walk noise, shadow and lantern-light modifiers
- WebAudio-synthesized sounds — no audio files, no network requests
- 4 screenshots in `screenshots/` (cover, alert, exit, title)

Built with vanilla JavaScript and canvas. `main.ts` is the make.fun hand-in program
that copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
