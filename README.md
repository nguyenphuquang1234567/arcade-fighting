# Shadow Dojo

A Phaser + TypeScript fighting game built from the new ImageGen character sprite sheets (Moon Ronin and Ember Brawler), sunset temple, courtyard, hit effect, and music.

Run `npm install`, then `npm run dev`. Build with `npm run build`; serve `dist` with any static server.

- Player 1: A/D move, W jump, S guard, J punch, K kick, L sword, U slide.
- Player 2 (local mode): arrow keys move/jump/guard, 1 punch, 2 kick, 3 sword, 0 slide.
- Escape pauses. Sound button enables music and synthesized hit sounds.
- First to two rounds wins. Each round lasts 60 seconds. Attacks consume stamina; guarding reduces damage and consumes stamina.

`src/combat.ts` owns gameplay rules and AI. `src/main.ts` handles sprites, input, sound, and HUD. Original assets stay in `assets`; Vite copies them into the production build.

New sprites live in `assets/characters/moon` and `assets/characters/ember`. Generation prompts: `output/characters/prompts.md`. Source sheets have 20 poses; normalized game frames are 512×512 with shared scale and foot baseline. Original fighters are archived in `archived-assets/original-fighters` and no longer loaded or shipped.

Running now uses `run-v2.png`: eight unique frames per character at 5 FPS (1.6 seconds per cycle). Other action animations retain their existing frames. Generation prompts and transparent previews are in `output/characters/run-v2-prompts.md` and `output/characters/*-run-v2-preview.png`.

Punch, kick and sword each use ten frames for both characters (`attack-v2.png`, `kick-v2.png`, `sword_attack-v2.png`). Contact is frame 5; animation frames follow simulation time, so the existing attack durations and damage stay in sync. Running remains 8 frames at 5 FPS. Generation prompts are saved in `output/characters/combat-v2-prompts.md`.

Current sword attack: both existing fighters share a six-frame overhead-to-lunge slash with colored crescent trails (`sword_attack-six.png`). Moon uses cyan, Ember uses orange. Frame 3 is contact, and the existing .8-second duration is preserved. Prompts: `output/characters/slash-six-prompts.md`; animated comparison: `output/characters/slash-six-comparison.gif`.

## Capsule hurtboxes

The game uses saved capsule layouts in `src/capsule-overrides.json` for both fighters. Source coordinates follow sprite scale, facing, jump height and animation frame. Capsules use smooth sampled contours for rectangle attack collision; legacy pixel masks and polygon editors have been removed.

Open `/capsule-preview.html` to select each frame, add/delete capsules, drag them, and change width or rotation. Yellow capsules mark the head, green capsules mark the body. **Lưu mã nguồn (dev)** saves to the project through a loopback-only Vite endpoint. Commit/push separately to publish edits. Press H in the game to view actual hurtboxes and red active attack boxes.

Run `npm test` for combat and capsule checks; `npm run build` builds the game and capsule editor. Run animation plays at 10 FPS; sword duration is 0.7 seconds and slide is 0.5 seconds.
