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

## Pixel hurtbox masks

Current branch: `feat/polygon-hurtboxes`. The original rectangular game remains on `main`. Collision now tests per-frame occupied source pixels (row runs), using the same 512px frame, scale, facing and pose clock as rendering. There are 90 frame masks for Moon/Ember, including empty death masks. Running remains 5 FPS. Press **H** for yellow head, green torso, blue legs and red attack rectangles. Damage is unchanged across regions.

Masks are derived from sprite alpha plus anatomical inclusion seeds. Every selected pixel has nonzero source alpha, so the selected silhouette aligns exactly. **Semantic selection is still an approximation**: some clothing/hair/hand pixels or pixels adjacent to a sword can need manual correction. The seed masks are not a claim of fully reviewed, 100% anatomical segmentation.

Open **MASK EDITOR** or `/mask-editor.html` to select a character/action/frame, paint head/body/legs, or erase weapons/effects. The brush only paints nontransparent source pixels. Undo, reset, JSON import/export, and local saving are available. Saved edits apply to the game in other tabs on the same browser/origin. Export JSON for a durable backup; browser storage is not a repository asset.

`python3 scripts/build-hurtmasks.py` (Pillow) regenerates seed masks without altering sprite art. It does not overwrite browser edits. Generated contact sheets are `/tmp/moon-masks.jpg` and `/tmp/ember-masks.jpg`. `npm test` covers combat and pixel-mask contacts; `npm run build` builds both game and editor pages.

### Matched idle poses

Ronin remains the reference for idle. Ember now uses `idle-ronin.png`: two lowered-arm standing frames with Ronin's stance, keeping Ember's orange/red appearance. Both use 3 FPS with the same pose clock and 492px foot baseline. The old Ember `idle.png` remains available. Ember idle mask overrides use a new `idle-ronin` key to avoid applying old pose masks to the replacement artwork.

### Branch experiment: no arm hurtboxes

On `feat/polygon-hurtboxes`, the wide body/arm inclusion is clipped to the central torso. Extended punching arms are no longer hurtboxes; attack hitboxes remain active. Head and leg masks are retained, including raised kicking legs. Anatomical separation remains seed-based near the shoulder/torso boundary. The branch uses separate browser override storage (`dojo-hurtmask-overrides-no-arms`) so old arm-inclusive overrides from `main` cannot replace these masks. Manual editor painting can still expand a mask intentionally.

## Editable polygon branch

Branch `feat/editable-polygon-hurtboxes` switches runtime collision from source-pixel row masks to editable per-frame polygons. It starts from the masks on `feat/polygon-hurtboxes`; previous branches and mask files are preserved. Contours are simplified and tiny islands discarded, so polygons approximate the original pixel boundary. Holes and concave stance gaps remain excluded from collision.

Open `/polygon-editor.html` or **POLYGON EDITOR** in the game. Choose a character, action and frame, then a polygon and outer/hole ring. Drag a white vertex; double-click an edge to insert a vertex; Alt/Option-click a vertex to delete it. Add/delete polygons, assign head/body/legs, undo, reset to seed polygons, and copy the preceding frame. Invalid geometry cannot be saved.

- **Lưu trình duyệt** stores edits in `dojo-polygon-overrides-v1` and updates other game tabs at the same origin.
- **Lưu mã nguồn (dev)** also writes edits to `src/polygon-overrides.json` through a same-origin, loopback-only Vite development endpoint. This is disabled in production. Builds include these source edits; Git still needs commit/push separately.
- **Xuất/Nhập JSON** provides backups and transfer. Import accepts old mask JSON and converts it to polygon contours.
- **Chuyển mask đã lưu** converts existing mask edits saved in this browser; then choose a save action to apply them. It does not erase the old mask data.

Runtime precedence: browser polygon edits, source polygon edits, generated seed polygons. Frame edits are independent unless copied. Empty polygon lists intentionally remove hurtboxes from a frame. Death remains non-hittable.

`python3 scripts/build-polygons.py` regenerates seed polygons in `src/hurtpolygons.json` from committed masks and does not modify source/browser overrides. `npm test` verifies combat, mirroring, polygon holes, invalid edits and all seeded contours.
