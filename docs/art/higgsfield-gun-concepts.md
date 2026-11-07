# Higgsfield brief: gun concept art (8 guns + 8 part sheets)

What this produces: concept art only. Four gun types × two manufacturers = **8 gun concepts**, plus **8 part sheets** (one per gun) whose parts fit that gun exactly.

Rule that everything below protects: **within a gun type, both manufacturers share the exact same structure** (silhouette, proportions, where every part attaches). **Between manufacturers, only the look changes** (materials, colours, surface detail, decoration).

Game reference: types and parts come from `src/data/guns.js`. The concepts are visual only; gun stats and mechanics don't change.

---

## 0. Manufacturers used

The game has four manufacturers. These two are the furthest apart visually, so they're the ones drawn:

| Manufacturer | In-game colour | Personality |
|---|---|---|
| **Ol' Reliable** | `#a8794a` (tan/wood) | Realistic, classic, trustworthy. Walnut wood, blued steel, brass, leather wrap. Heavy-but-elegant, hand-made feel. |
| **Gloop Labs** | `#9b59ff` (purple) | Fun sci-fi lab tech. Glossy white and lavender polymer, glass tubes of glowing green goo, rounded edges, rubber seals, lab-equipment hazard decals. |

To use different manufacturers (Blastco: chunky red industrial steel; Zippity: sleek neon-green racing polymer), swap in their style block from §2. Everything else stays the same.

---

## 1. Settings for every image

| Setting | Value |
|---|---|
| Model | **Nano Banana 2.1** (`nano_banana_2_1`): follows image references closely, so the structure stays locked |
| Resolution | `2k` for finals (`1k` while exploring) |
| Thinking level | `high` (better at following "keep exactly, change only" instructions) |
| Aspect ratio | Guns: MG and Shotgun `16:9`; Sniper and Bazooka `21:9`. Part sheets: `1:1` |
| Seed | Write down the seed of every image you keep and reuse it for retries of the same image |
| Web/image search | Off |

**Camera and layout rules (put these in every prompt; they're already in the templates below):**
- Exact **orthographic right side view**, muzzle pointing **right**, gun level and horizontal, no perspective, no tilt.
- Gun centred, filling **80% of the image width**, same vertical centre line every time.
- Plain **flat light grey background `#D9D9D9`**, soft even studio light, no cast shadow, no floor.
- No hands, no people, no text, no letters, no numbers, no watermark, no logos with lettering (abstract symbols only).
- One gun per image (except part sheets).

These rules matter later: the images can be stacked over each other to check they match, and they work as clean inputs for image-to-3D.

---

## 2. Style blocks (paste the whole block where the prompt says `[STYLE]`)

**Shared style (always included):**
> Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail with slightly exaggerated chunky proportions, readable silhouette, clean hard-surface design, high-end game asset concept sheet quality.

**Ol' Reliable:**
> Manufacturer style "Ol' Reliable": classic frontier craftsmanship. Oiled dark walnut wood furniture with visible grain, deep blued steel with light edge wear, polished brass accents (rings, rivets, trigger guard), stitched brown leather wraps, engraved scrollwork on flat steel plates, round brass maker's medallion with a simple horseshoe symbol. Warm palette: walnut brown, gunmetal blue-black, brass gold, tan leather (#a8794a). Feels trustworthy, heavy, hand-made, timeless.

**Gloop Labs:**
> Manufacturer style "Gloop Labs": playful sci-fi laboratory tech. Glossy white and lavender polymer shells with rounded edges, translucent glass tubes and vials full of glowing lime-green goo, purple anodized metal (#9b59ff), black rubber seals and grip pads, small hazard-stripe decals and a bubbling-flask symbol (no letters), tiny indicator LEDs. Cool palette: white, lavender, purple, toxic lime-green glow. Feels experimental, bubbly, slightly unstable.

**What the style may change:** materials, colours, surface panels, engravings, decals, small greebles, edge shape (bevelled vs rounded), glow elements laid **on** existing parts.
**What the style must never change:** overall length and height, outline, number and position of parts, barrel length/diameter, grip angle and position, magazine position and size, optic rail position, stock shape.

---

## 3. Structure specs per gun type (the part of each design that is locked)

Measurements are in **units of the gun's total length = 100**. Measure from the rear (left) end. These fix where each part attaches so every part on the sheets fits.

### Machine Gun (MG): full-auto, compact assault style
- Total length 100, height (top of optic rail to bottom of magazine) ~38.
- **Stock:** 0–22, fixed, solid, top flush with receiver top.
- **Receiver:** 22–62, boxy, height 16. Full-length **top rail** 26–60 (optic mount).
- **Pistol grip:** under receiver at 40–48, raked back 15°, length 18.
- **Magazine well:** 50–58, straight box magazine hanging down 20, slight forward curve.
- **Handguard:** 62–82, slightly slimmer than receiver.
- **Barrel:** exits handguard at 82, ends at 100, with a short muzzle device 95–100. **Barrel collar** (where barrel parts attach) at 82.
- Stock optic: small low-profile iron sight on the rail at 30–36.

### Shotgun: pump-action, double-barrel-wacky
- Total length 100, height ~30.
- **Stock:** 0–28, angled drop of 6°.
- **Receiver:** 28–55, height 15, short **top rail** 32–52.
- **Pistol grip:** 40–47, raked 18°, length 16.
- **Magazine:** tube magazine under the barrels, 55–90, plus a side shell holder on the receiver at 34–48 (this is the "mag" slot).
- **Pump/fore-end:** 60–78, wraps the magazine tube.
- **Barrels:** **two side-by-side barrels** stacked vertically in side view (top + bottom), exit at 55, end at 100. **Barrel collar** at 55.
- Stock optic: bead sight on the barrel end at 97.

### Sniper: bolt-action, long range
- Total length 100, height ~26 (with scope).
- **Stock:** 0–32, thumbhole stock with a cheek rest.
- **Receiver:** 32–56, slim, height 10, **bolt handle** sticking out at 50. **Top rail** 34–58.
- **Pistol grip:** formed in the thumbhole, 34–40.
- **Magazine:** small box magazine at 44–52, hanging down 9.
- **Handguard:** 56–72, slim, with a folded bipod underneath at 68–72.
- **Barrel:** long and thin, exits at 72, ends at 100. **Barrel collar** at 72; muzzle brake 96–100.
- Stock optic: long scope on the rail, 38–58, raised 6 above the receiver.

### Bazooka: shoulder-fired rocket launcher
- Total length 100, height ~30.
- **Main tube:** one straight cylinder 0–100, diameter 14, slightly flared rear exhaust 0–6.
- **Rear grip + trigger assembly:** under the tube at 40–48, length 18.
- **Front grip:** under the tube at 62–68.
- **Shoulder rest:** padded block under the tube at 28–36.
- **Rocket loader (the "mag" slot):** a breech box on top/rear of the tube at 10–24.
- **Top rail:** 40–60, on top of the tube.
- **Muzzle ("barrel" slot):** the front section 82–100 is a separate **muzzle shroud**. **Barrel collar** at 82.
- Stock optic: flip-up ladder sight on the rail at 48–54.

---

## 4. Workflow

Total: **4 masters + 8 guns + 8 part sheets = 20 final images.**

### Step A: structure masters (4 images, text-only)

Make a plain grey "blueprint" gun per type with no manufacturer style. This is the shape both manufacturers must follow.

Prompt template:
> Orthographic right side view concept of a [TYPE NAME] for a video game, muzzle pointing right, perfectly level, no perspective. NEUTRAL STRUCTURE MASTER: uniform matte mid-grey clay material, no colours, no decals, no wood, no glow, only clean hard-surface shapes so the silhouette and part layout are easy to read. Exact layout, measured from the rear (left) where total length is 100 units: [PASTE THE TYPE'S STRUCTURE SPEC FROM §3]. Every part is clearly separate and readable: stock, receiver, grip, magazine, handguard, barrel, optic. Gun fills 80% of the image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark.

- Generate 3 candidates per type, pick the one that best matches the spec.
- **Approval check:** with a ruler or grid overlay, the part positions sit within ±3 units of the spec.
- Save as `concepts/guns/masters/<type>_master.png` and note the seed.

### Step B: manufacturer guns (8 images, image-to-image)

For each type, run twice (Ol' Reliable, Gloop Labs) with **the approved master as the only image reference** (`image_references`).

Prompt template:
> Restyle the reference image into a finished [TYPE NAME] concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (stock, receiver, grip, magazine, handguard, barrel, barrel collar, optic and rail), the grip angle, the camera, the scale and the framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, engravings, decals and small surface details. [STYLE: Shared style] [STYLE: manufacturer block] Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark.

- Generate 3 candidates, pick one.
- **Approval check (overlay test):** stack the result over the master at 50% opacity. The outlines must line up; any part moved or resized by more than ~3% of length means reject and regenerate with the same seed and an extra line: *"The previous attempt moved the [part]; keep it exactly where it is in the reference."*
- **Pair check:** put the two manufacturers' versions of the same type side by side. They must read as the **same gun model from two different brands**, never as two different guns.
- Save as `concepts/guns/<type>_<manufacturer>.png` (e.g. `mg_reliable.png`, `mg_gloop.png`).

### Step C: part sheets (8 images, image-to-image)

One sheet per gun from Step B. References: **the finished gun from Step B first, the master second.**

Sheet layout (same for every sheet):
- `1:1` image, light grey `#D9D9D9` background with a faint square grid.
- **4 rows, top to bottom:** Barrels, Grips, Magazines, Optics.
- **4 columns, left to right:** Stock part (exactly as on the gun), then the 3 alternatives in the order below.
- Every part drawn in **the same orthographic right side view and at the same scale as the gun**, so it can be swapped onto the gun without resizing.
- Each part's **attachment face sits on one shared vertical line per row** (barrels: collar face at the left; grips and magazines: top mounting face at the top; optics: rail base at the bottom), so the mount interface is identical across the row.

Alternative parts (from `src/data/guns.js`):

| Row | Stock (column 1) | Column 2 | Column 3 | Column 4 |
|---|---|---|---|---|
| Barrel | as on gun | **Long barrel**: 35% longer, same collar | **Short barrel**: 40% shorter, same collar | **Ported barrel**: same length, rows of vent ports and a big compensator |
| Grip | as on gun | **Ergo grip**: sculpted finger grooves | **Quickdraw grip**: slim, angled, with a speed loop | **Heavy grip**: thick, with a palm shelf |
| Magazine | as on gun | **Drum mag**: round drum, same well size | **Quick mag**: shorter, with a pull tab | **Spicy mag**: same size with a glowing element core window |
| Optic | as on gun | **Red dot**: compact tube with a glowing dot | **Long scope**: long, large objective lens | **Lucky scope**: medium scope with a lucky-charm motif (four-leaf clover symbol) |

Type-specific adjustments to the table:
- **Shotgun:** barrel parts are **double barrels** (both barrels change together). The magazine row shows the **side shell holder** variants (drum = rotary shell drum, quick = speed loader strip, spicy = glowing elemental shells).
- **Sniper:** the stock optic is the long scope, so its column 3 becomes **Variable scope** (adjustable turrets, longer sunshade).
- **Bazooka:** the barrel row is the **muzzle shroud** (long = extended blast shield, short = stubby, ported = vented blast cone). The magazine row is the **rocket loader box** (drum = 3-rocket rotary cylinder, quick = open quick-feed tray, spicy = loader with a glowing element window). The grip row is the **rear grip + trigger assembly**.

Prompt template:
> Create a parts sheet for the gun in reference image 1. Use the exact manufacturer style, materials, colours and level of detail of reference image 1, and the exact attachment points of reference image 2. Layout: 4 rows (top to bottom: barrels, grips, magazines, optics) and 4 columns (left to right: the original part exactly as it appears on the gun, then three alternatives). [PASTE THE TYPE'S ROW CONTENTS FROM THE TABLE ABOVE, WITH ITS TYPE-SPECIFIC ADJUSTMENTS]. Every part is drawn in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row, the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface (same collar diameter, same rail foot, same magazine-well top, same grip mount) as the original part. Parts are evenly spaced and do not touch. [STYLE: Shared style] [STYLE: manufacturer block] Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark.

- Generate 2 candidates, pick one.
- **Approval check (fit test):** cut out the column-1 parts and overlay them on the gun from Step B. They must match its parts in size and shape. Then check that each alternative's mount face is the same size as the original's.
- Save as `concepts/guns/parts/<type>_<manufacturer>_parts.png`.

---

## 5. Order, approvals and credit budget

Run in this order: **A (all 4) → approve → B (all 8) → approve → C (all 8)**. Never start Step B for a type before its master is approved, and never start Step C for a gun before it is approved.

| Step | Final images | Candidates each | Generations |
|---|---|---|---|
| A: masters | 4 | 3 | 12 |
| B: guns | 8 | 3 | 24 |
| C: part sheets | 8 | 2 | 16 |
| **Total** | **20** | | **~52** |

The Sproto Duel guide (`docs/higgsfield-workflow-guide.md`) puts concept images generated through MCP from a chat at about 1 credit each, so this costs **about 50–60 credits** including a few retries. It's **free** on higgsfield.ai with the Unlimited toggle on for Nano Banana. Run Higgsfield's live price check before the first paid step, because 2k may cost more than the guide's figure.

## 6. Rejection checklist (any "no" means regenerate)

- [ ] Orthographic side view, muzzle right, level, centred, 80% width?
- [ ] Plain `#D9D9D9` background, no shadow, no text, no hands?
- [ ] (Guns) Overlays its master within ~3% on every part?
- [ ] (Guns) Both manufacturers of a type read as the same model in two brands?
- [ ] (Guns) Manufacturer is obvious at a glance from materials and colour alone?
- [ ] (Sheets) Column 1 matches the gun's real parts in size and shape?
- [ ] (Sheets) Every alternative uses the same mount interface as column 1?
- [ ] (Sheets) Same scale as the gun, parts not touching, 4×4 grid intact?
