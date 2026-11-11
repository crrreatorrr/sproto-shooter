# Campaign dressing

How the campaign levels get their models, scenery and backdrops. All of it is render-side: the sim still
collides with the primitives in `src/data/levels`, and a model is stretched over the primitive it replaces.

## Where things live

| Part | Path |
|---|---|
| Which model replaces which primitive, and the scenery per level | `src/render/level/dressing.js` |
| Loading and caching | `src/render/level/kitModels.js` |
| Drawing | `src/render/level/levelView.js` |
| Cartoon kit source (one script builds every model) | `art/blender/scripts/build_cartoon_kit.py` |
| Concept sheets | `art/reference/l01/`, `art/reference/l02/` |
| Preview sheets | `art/blender/previews/cartoon_kit_sheet.png`, `fx_sheet.png` |

## The cartoon kit

Run from the repo root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python art/blender/scripts/build_cartoon_kit.py
```

It writes `public/assets/models/{props,projectiles,pickups,fx}/`. Models have vertex colours and no
textures, one mesh each, with the outline baked in as an inverted hull. Normals and colours are stored as
bytes. After a rebuild run `npm run assets` and check `npm run budgets`.

Concept art comes from higgsfield.ai with the Unlimited toggle on (see `docs/higgsfield-workflow-guide.md`).

## Sproto Duel assets

Copied from `sproto-duel` at commit `fd680a2`. That repo is read-only: copy from it, never edit it.

| Here | From `sproto-duel/public/assets` |
|---|---|
| `models/obstacles/*.glb` | `models/obstacles/` |
| `models/stages/{desert,grove,office}/` | `models/themes/{desert,grove,office}/` |
| `textures/stages/{desert,grove,office}/` | `textures/themes/{desert,grove,office}/` |

After copying, `npm run assets:optimize` resizes them. The new floor and stone textures were also cut to
512 px by hand, because the shipped size has 28 MB to fit in. `MEASURED.decodedBytes` in
`scripts/check-budgets.mjs` was raised for these on purpose.

## Dressing a level

- `fit`: one primitive id to one model.
- `groups`: several primitives to one model over their combined box.
- `rules`: a whole level by what a primitive is (id pattern, material, size). First match wins. L02 uses this.
- `decor`: scenery with no collision. Keep it off the walkable floor.
- `backdrop`: a loop of far scenery placed from the section's own bounds.
- `hide`: primitives that collide but are not drawn.
- `ground`: a city floor under a route that would otherwise float.

Mechanism models (barrels, chests, switches, shrines, racks, secrets, ammo) apply to every level.
