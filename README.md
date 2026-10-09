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

Combat now uses sprite-space rectangular hitboxes and hurtboxes from `src/geometry.ts`, transformed with the same origin, 0.6 scale, facing and jump offset as the sprites. Body boxes change with stance; punch, kick, sword and slide have separate attack regions and active windows. Collision is checked throughout the active window and each attack can damage each opponent once. Contacts are resolved together so simultaneous strikes can trade. Slide's contact pose is held through its active window.

Press H or click H / HITBOXES to show green body hurtboxes and red active attack hitboxes. `npm test` runs 20 combat checks covering directions, range, height, guard, recovery, posture, single-hit behavior and simultaneous attacks.

## Polygon hurtboxes

Branch `feat/polygon-hurtboxes` preserves the previous game on `main`. Both fighters now have per-frame anatomical polygon hurtboxes: head, torso, and separate thigh/shin/foot polygons for each leg. These are authored approximations of the sprite anatomy, not exact alpha contours. Weapons, sword trails, and decorative cloth are excluded. All rendered frames use the same pose clock as collision geometry; running remains 5 FPS.

Press **H**: yellow = head, green = torso, blue = legs, red = active attack hitbox. Rectangle attacks are clipped against the actual hurt polygons; empty space inside a polygon bounding box does not count. Existing damage values remain unchanged for all regions.

Validation: `npm test` covers attack windows, guard/trades, airborne/slide postures, polygon clipping and mirroring, and pose coverage for both fighters. `npm run build` checks TypeScript and production bundling.
