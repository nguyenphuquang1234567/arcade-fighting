# Moonlit Mountain Shrine

Generated arena for Shadow Dojo. Art route: built-in image_gen, using the Forge-generated geometry guide. The original sunset assets remain in assets/images.

Agent Sprite Forge is pinned in provenance.json. Applied tools: forge_doctor, scene_layout_guide, conform_background, validate_stage, extract_scene_lights. Original painting: source.png (1672×941). Runtime: background.webp (1280×720). Runtime lighting uses the extracted light-cookie with a subtle Phaser alpha tween; no generated video or parallax claim.

Design prompt: side-view anime fighting arena, moonlit mountain shrine, indigo/teal palette, large moon, recessed Japanese shrine roofs and warm lanterns, unobstructed full-width stone floor, no actors or text. Layout constraints are preserved in layout-contract.txt.

Runtime world stays 1280×720 and uses Phaser FIT. Idle sole line is y=652.4, within the painted floor from approximately y=576. Spawn x positions 360 and 920. Existing gameplay and collision rules are retained.

Verification: TypeScript/build passed; Forge conform QA pass; stage and lights QA remain needs-visual-review by design. All three layout renders and the light-detection overlay were visually inspected. Real An/Yuki training match checked at desktop and 844×390 landscape. This does not establish performance on a physical phone.

Doctor notes: resvg-py missing (optional codeart SVG path, unused); working path contains spaces (all paths quoted); no CLI/auth generation probes were requested because the built-in host image tool was used.

Preview: http://localhost:5190/?map-preview then XEM MAP · AN VS YUKI.
