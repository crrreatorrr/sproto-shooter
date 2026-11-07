# Sproto Shooter: Campaign Level Designs (part C): the 10 levels

Engine and system specs are in `C-campaign-levels.md` (referenced as **C §x**). Bosses are in
`C-bosses-sproto-duel.md` (**B §x**). This file is what each level contains and why.

Distances are design targets. The level author picks exact coordinates, keeps the
proportions, and proves them with the map export (C §4.4).

---

## 0. The campaign: *The Great Sproto Audit*

The Bitcoin Tax Empire is auditing the world. Five Sproto Duel bosses run it: Sahil the
RugMaster's bazaar, the Pump & Dump Duo's Blockchain Void, Broccoli Head's LA Vape Cabal,
Glowie's Government Office, and at the top, Tinubu the Unshackled Demon in his Hellfire
Caldera. You're a Sproto commando dropped into Los Angeles with one machine gun and a bad
attitude. Each boss you beat teaches you their spell. The tone stays wacky: midgets party
until they see you, Obamas count bitcoins, and every checkpoint says BONK.

| # | Level | Duel stage | Tier | Par | Ends with | Jetpack |
|---|---|---|---|---|---|---|
| L1 | Sproto Landing | `city` Los Angeles (dusk) | 1 | 10 min | Big Obama at the gate | — |
| L2 | The Grand Bazaar | `desert` | 2 | 18 min | **Boss: Sahil** | — |
| L3 | The Vegetable Grove | `grove` | 3 | 18 min | Preview: Broccoli Head *Sprout* (flees) | — |
| L4 | The Blockchain Void | `void` | 4 | 18 min | **Boss: Bitcoin Obama & The Midget** | Found in level (first time) |
| L5 | Frostspire Black Site | `glacier` | 5 | 18 min | Vault hold under Glowie's Drone Strikes (preview) | — |
| L6 | Vape Cabal Skyline | `city` Los Angeles (night, rain) | 6 | 22 min | **Boss: Broccoli Head** | Yes (rooftops) |
| L7 | Hellfire Underworks | `volcano` (industrial interior) | 7 | 16 min | Meltdown escape | — |
| L8 | Government Office | `office` | 8 | 18 min | **Boss: Glowie** | — |
| L9 | Moonlit Ruins | `moonlit` | 9 | 28 min | Big Obama twins + preview: Tinubu *Emi Lokan* opens the Caldera | Optional |
| L10 | Hellfire Caldera | `volcano` | 10 | 30 min | **Final boss: Tinubu**, then a jetpack escape | Yes (from the escape) |

All 8 Sproto Duel stages appear. City and volcano appear twice, each time with a different
lighting preset and a very different layout (open streets vs night rooftops; factory
interior vs open volcano).

### 0.1 Sections and transitions: how the levels stay vast

Every level is split into **sections** (C §3.19). Only the current section is loaded; the
next one preloads near the end of the current one. Between sections there's a **seamless**
connector (corridor, elevator, tunnel, canyon pass) or a **placeholder cutscene / flight**
card that hides the load. Open fields use terrain tile streaming inside a section, so they
can be up to 1.2 km across. **The section sizes here supersede the single "Size" in each
level header below** (those describe the core play space).

| Level | Sections (largest footprint) → transition | Total travel |
|---|---|---|
| L1 | S1 Drop Zone + Alley (300 × 120) → *seamless: mall revolving doors* → S2 Mall + Parking Spiral (120 × 100 × 30) → *seamless: sky bridge* → S3 Gate Plaza (200 × 200) | ~0.9 km (tutorial) |
| L2 | S1 Souk Alleys (250 × 250) → *cutscene "Into the Dunes"* → S2 Dune Sea (terrain 900 × 600) → *seamless: canyon pass* → S3 Canyon Rim + Rooftop Market (500 × 300) → *cutscene: boss card "The Grand Bazaar"* → S4 Bazaar Gate + Sahil arena (150 × 150) | ~2 km |
| L3 | S1 Crop Fields (terrain 800 × 600) → *seamless: hedge gate* → S2 Hedge Maze + Vine Bridges (350 × 300) → *seamless: greenhouse airlock* → S3 Greenhouses (150 × 80) → *cutscene "Something Smells Green"* → S4 The Patch (120 × 120) | ~1.8 km |
| L4 | S1 Genesis Block + Candle Forest (sky 700 × 700 × 250) → *flight: riding a liquidity stream* → S2 Mine Field + Ledger Hub (700 × 400 × 200) → *cutscene: boss card "The Blockchain Void"* → S3 Exchange arena | ~2 km |
| L5 | S1 Snowfield (terrain 1000 × 700) → *seamless: fortress gate* → S2 Bunkers + Courtyard (300 × 250) → *seamless: freight lift* → S3 Frost Halls + Vault (200 × 150 × 30) | ~1.6 km |
| L6 | S1 Freeway (1200 × 150 linear) → *seamless: off-ramp* → S2 Catwalks + Crane Yard (300 × 300 × 120) → *seamless: fly into the canyon* → S3 Rain Canyon + Helipad (800 × 200 × 150) → *cutscene: boss card "Los Angeles"* → S4 Streets arena | ~2.5 km |
| L7 | S1 Shafts + Sorting Hall (200 × 150) → *seamless: cart station* → S2 Mine Cart Run (900 m rail) → *seamless: station platform* → S3 Furnace Gallery + Reactor Ring (200 × 200) → *cutscene "MELTDOWN"* → S4 Escape (600 m) | ~2 km |
| L8 | S1 Lobby + Cubicle Farm (F0-F1) → *seamless: elevator* → S2 Vault + Atrium (F2-F4) → *seamless: elevator* → S3 Server + Executive floors (F5-F6) → *cutscene: boss card "Government Office"* → S4 Roof arena. Each floor ~200 × 150 | ~1.2 km (vertical) |
| L9 | **Hub:** S0 Ruin Plains (terrain 1200 × 1200: camp, Colonnade Ridge, Sunken Amphitheatre) ⇄ *cutscene "Descent"* ⇄ S1 Catacombs (interior; return allowed via `sectionMemory`); after 3 captures → *cutscene "The Moon Gate"* → S2 Moon Gate arena | ~3 km |
| L10 | S1 Ridge Trail + Bridge Chain (600 × 300 × 80) → *seamless: lava tube* → S2 Geyser Fields + Rim Descent (terrain 800 × 800) → *cutscene: boss card "Hellfire Caldera"* → S3 Caldera arena → *cutscene "ERUPTION"* → S4 Escape (sky 300 × 300 × 300 + 600 m flight) | ~2.5 km |

**Placeholder cutscene cards** use what exists now: stage sky textures, Sproto Duel boss
portraits and stage concept art (`ui/bosses/<id>.png`, `<id>_stage2/3.png`), plus 1-4 story
lines. Example lines:
- L2 "Into the Dunes": *"The souk was the easy part." / "Sahil's caravan route crosses the Dune Sea."*
- L4 flight: *"Bitcoin Obama pumps the price. The Midget dumps it. You ride the chart."*
- L7 "MELTDOWN": *"Reactors at 300%." / "Tinubu calls this 'a controlled burn.' Run."*
- L10 "ERUPTION": *"The Demon is down. The volcano disagrees." / "Fly."*
Real cinematics can replace any card later by swapping the render-only `cutscene` data.

---

## 1. Variety matrix

### 1.1 Space types per level (C §1.3)

| Level | field | corridor | ledge | interior | arena | vertical | sky | rail | hold |
|---|---|---|---|---|---|---|---|---|---|
| L1 Landing | ● | ● | | ● | ● | ● | | | ● |
| L2 Bazaar | ● | ● | ● | | ● | ● | | ● (carpets) | |
| L3 Grove | ● | ● (hedge maze) | ● | ● | ● | | | | ● |
| L4 Void | | | ● | | ● | | ● | ● (blocks) | |
| L5 Black Site | ● | | | ● | ● | ● | | | ● |
| L6 Skyline | | ● | | | ● | ● | ● | ● (cranes) | ● |
| L7 Underworks | | ● | | ● | ● | | | ● (cart) | |
| L8 Office | | ● (cubicles) | | ● | ● | ● | | ● (lifts) | ● |
| L9 Moonlit | ● | ● (catacombs) | ● | ● | ● | ● | (●) | | ● |
| L10 Caldera | ● | ● | ● | | ● | ● | ● | | |

### 1.2 Enemy introductions (teach → test → twist)

| Level | New enemies (taught alone first) | Returning mix highlight |
|---|---|---|
| L1 | Midget, Bitcoin Obama, Flying Midget, Big Bitcoin Obama (finale) | — |
| L2 | **Boom Midget**, **Riot Midget**, **Hex Acolyte** (Sahil's rug acolytes) | Riot phalanx + Obamas behind it |
| L3 | **Floret Sprout** (Broccoli's), **Sewer Midget** (pops out of veggie mounds), **Midget Daycare** nest | Sprout mortars + burrowers in a hedge maze |
| L4 | **Bitbug** flocks, **Jet Obama**, **Balloon Midget** | Mines drifting through Jet Obama dogfights |
| L5 | **Glowie Agent** squads, **Audit Sniper**, **Bitcoin Mining Rig** turret | Snipers + turrets across a snowfield |
| L6 | — (combined arms on the ground and in the air) | Boom Midgets in traffic, Jet Obamas between towers |
| L7 | **Mini Tinubu** charger | Chargers in conveyor halls next to crushers |
| L8 | — (Agents everywhere, using cover indoors) | Agents + Acolyte shields + Riot corridors |
| L9 | — (every type; elites; roaming patrols) | Big Obama twins |
| L10 | — (everything; Tinubu Imps = elite Mini Tinubus) | All roles at once |

### 1.3 Mechanism introductions

| Level | New mechanisms | Power-up introduced |
|---|---|---|
| L1 | Doors, switches, explosive barrels, lift, weapon racks, checkpoints, hold zone | — |
| L2 | Quicksand (`slow` zone), sand geysers (launch), **flying-carpet movers**, clothesline ziplines, void rescue (canyon), depot | Overshield |
| L3 | Mushroom jump pads, collapsing vine bridges, toxic runoff pools, greenhouse doors, burrow mounds | Turbo |
| L4 | **Jetpack**, fuel pads, updrafts, wind, sliding exchange blocks, energy "chain" bridges, gravity wells | Infinite Fuel |
| L5 | Generators + shield gate, ice slick, cold zones, blizzard visibility, emplacement (Captured Mining Rig), cracking ice | — |
| L6 | Bus lanes (crushing movers), crane hooks (movers), rooftop ziplines, rain | — |
| L7 | Conveyors, crushers, **mine cart rail ride**, rising-lava escape | — |
| L8 | **Security laser grids**, elevators, keycard doors, pneumatic-tube ziplines, sprinkler slick floors, dark server rooms | — |
| L9 | **Moon-gate portals**, lunar shrine low-gravity zones, rotating stone rings, crumbling floors, capture zones (non-linear) | Sproto Camo |
| L10 | Remix of all + collapsing debris + jetpack escape | — |

### 1.4 Golden Bonks (secrets → campaign modifiers)

One hidden Golden Bonk per level (Halo-skull style). Each unlocks a toggleable modifier for
replays. None changes gun stats (ground rule 1).

| Level | Modifier | Effect |
|---|---|---|
| L1 | Big Head Mode | All enemies get the big-head effect (reuses the existing legendary perk's `bigHeadT`) |
| L2 | Confetti Everything | Every kill pops confetti; drops show as presents |
| L3 | Floor Is Lava | Standing still on the ground for > 3 s burns 5 dps |
| L4 | Moon Boots | Gravity ×0.6 everywhere |
| L5 | Tax Season | Enemies +25% HP, tickets ×2 |
| L6 | Duck Hunt | Enemy projectiles render as rubber ducks |
| L7 | Lights Out | All levels use the `dark` look; the motion tracker is off |
| L8 | Red Tape | Boss powers recharge ×0.8 (harder); boss drops ×2 |
| L9 | Swarm Surge | +50% fodder per squad (still capped by `maxAlive`) |
| L10 | Iron Sproto | Death restarts the level; tickets ×3 |

### 1.5 World weapon plan (C §3.11: basic guns only)

| Level | MG | Shotgun | Sniper | Bazooka |
|---|---|---|---|---|
| L1 | start gun | E2 alley | — | — |
| L2 | — | E1 souk alleys | E3 canyon rim | E5 before Sahil |
| L3 | E2 hedge maze | E2 hedge maze | E1 fields | E4 nests |
| L4 | E2 vs bitbugs | — | E3 mine field | E4 before the duo |
| L5 | — | E4 frost halls | E1 snowfield cache | E1 cache (turrets) |
| L6 | E3 vs bitbugs | E1 traffic jam | E3 crane cab | E4 nests / E5 boss |
| L7 | — | E1 shafts | E3 cart ride | E5 reactor ring |
| L8 | E1 lobby | E2 cubicle farm | E4 atrium | E6 before Glowie |
| L9 | camp cache | A catacombs standee | camp cache, B ridge standee | camp cache |
| L10 | E1 cache | E1 cache | E1 cache | E1 cache + E4 depot rack |

---

## 2. Level template (every level file follows it)

Each level section below gives: **header** (stage, lighting, size, tier, par, jetpack),
**concept**, **ASCII map**, **encounters** (space, enemies, mechanisms, weapons, objective,
teach/test/twist), **checkpoints and depots**, **set piece and vista**, **secret**,
**bot route notes** and an optional **art wishlist** (never blocking).

Enemy counts are totals per encounter at Normal difficulty; `maxAlive` caps what's alive at once.

---

## L1: Sproto Landing (`city`, Los Angeles at dusk)

| Size | Tier | Par | Jetpack | Enemies (approx.) |
|---|---|---|---|---|
| 240 × 160 m, 25 m vertical | 1 | 10 min | No | 55 |

**Concept.** The tutorial that doesn't feel like one. You land in an LA street at sunset and
learn cover, world weapons, doors and switches, verticality, and finally a heavy. Every
encounter teaches exactly one thing.

```
 N ↑                                  [E5 GATE PLAZA]  ← big gate (exit)
                                   .-------------------.
  [E4 PARKING SPIRAL] ===jump down=|   fountain   ⌂   |
     ⟲ 3 decks + lift              '-------------------'
          |                                 ↑
  [E3 MALL OF SPROTO] (2 floors) -----------'
          |
  [E2 ALLEY]  4 m wide, 70 m ═══════
          |
  [E1 DROP ZONE] boulevard 30 m × 80 m   ◉ drop pod start
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Teaches |
|---|---|---|---|---|---|---|
| E1 Drop Zone | field (boulevard with wrecked cars, planters) | 5 Midgets partying round a burning food truck (`placed`, idle), 2 Obamas behind a barricade | 2 fire barrels by the party | Start MG; ammo crate | clearAll | Perception and sneak shots; cover against bitcoin bursts; barrels |
| E2 Alley Cat | corridor (4 m × 70 m, dumpsters, fire-escape catwalk) | 8 Midgets from the far end (`door`), then 4 from behind (`hidden`, +6 s) | Fire-escape ramp to a catwalk (high-ground option) | **Shotgun rack** at the entrance | clearAll | Swarms in narrow spaces; the motion tracker; 360° awareness |
| E3 Mall of Sproto | interior (50 × 40 m, 2 floors, escalator ramps, glass rails) | 4 Obamas on the mezzanine, 6 Midgets | First **switch** (security desk, hold 1.5 s) opens the exit **door**; shock barrels near the Obamas | — | switch | Verticality, interacting, doors |
| E4 Parking Spiral | vertical (3-deck spiral ramp 40 × 40 m) | 10 Midgets pouring down the ramps; 2 Flying Midgets on the roof | **Lift** shortcut (deck 2 → roof), the first mover | — | reach roof | Fighting uphill; movers; air enemies (lightly) |
| E5 Gate Plaza | arena + hold (70 m plaza, fountain, statues, planters) | Hold the gate switch zone 20 s: 2 waves of 5 Midgets, 4 Obamas, 2 Flying Midgets. Then the gate opens and **Big Obama** walks out (2 s intro) | Hold zone; 4 barrels; a statue to circle round | Ammo crate | hold → kill Big Obama → reach gate | Holding a zone; the heavy's back battery |

**Checkpoints:** after E1, E2 entrance, after E3, roof of E4, after the hold.
**Set piece / vista:** a giant inflatable Tinubu balloon drifts over downtown; a hillside sign reads SPROTOWOOD.
**Secret (Big Head Mode):** on top of the E1 billboard: car roof → awning → double jump.
**Bot route:** E1 clear → alley → mall switch → spiral (take the lift) → jump down → hold → Big Obama → gate.

---

## L2: The Grand Bazaar (`desert`, Sahil's market city) → **Boss: Sahil**

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 380 × 260 m (dunes + canyon + town) | 2 | 18 min | No | 85 + boss |

**Concept.** A desert market town on a canyon edge. Narrow souk alleys, then open dunes with
quicksand, then rooftops and a canyon rim. Sahil's rug acolytes shield his guards. Carpets
fly around as moving platforms, a wacky nod to the RugMaster.

```
          dunes (heightfield) ~~~ quicksand ~~~ sand geysers
   [E2 DUNE SEA]  ←───── 150 m open ─────→  [E3 CANYON RIM] ═ carpet movers over the canyon
        ↑                                          |
   [E1 SOUK ALLEYS]  maze 3-5 m wide                 ↓
        ↑                                   [E4 ROOFTOP MARKET] clotheslines
   start: caravan camp                              ↓
                                             [E5 BAZAAR GATE] → [BOSS: SAHIL, bazaar arena + fire ring]
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Teaches |
|---|---|---|---|---|---|---|
| E1 Souk Alleys | corridor maze (3-5 m alleys, stalls, awnings, carpets hanging) | 4 **Riot Midgets** advancing in a line through the main alley, 10 Midgets from side alleys (`door`), 2 Obamas on balconies | Explosive pots (barrels with goo/fire); side alleys = flank routes | **Shotgun rack** (stall) | clearAll | Riot shields → flank through side alleys |
| E2 Dune Sea | field (150 m dunes, ruins for cover) | 6 **Boom Midgets** charging over dune crests (beeping), 4 Obamas in ruins, 8 Midgets | **Quicksand** (`slow` ×0.5 zone; enemies avoid it on nav); **sand geysers** as launchers onto high ruins | Ammo cache in ruins | reach canyon rim | Boom Midgets in the open; reading terrain |
| E3 Canyon Rim | ledge (rim path 4 m wide over a 60 m canyon) | 4 Obamas on far-side ledges, 2 **Hex Acolytes** shielding them (`shieldBuff`), 3 Flying Midgets | **Flying-carpet movers** loop across the canyon (ride to cross; fall → void rescue) | **Sniper rack** at the rim (why: far ledges) | clearAll | Acolytes = priority target; riding movers under fire |
| E4 Rooftop Market | vertical (flat roofs at 3 heights, clothesline ziplines, awnings) | Riot ×3, Boom ×4, Obamas ×4, Acolyte ×1, Midgets ×10 | **Ziplines** (clotheslines), jump pads (rug catapults) | **Overshield** on the highest roof | reach gate | Fighting across rooftops |
| E5 Bazaar Gate | arena-lite (gate square) | Drop-in waves: 12 Midgets, 4 Boom, 2 Riot | Depot (Weapon Box + shop + ammo) after the wave; the gate closes behind you | **Bazooka rack** (why: boss) | clearAll → enter boss arena | Breather + depot before the boss |
| **BOSS** | arena (Duel `bazaar` layout, 28 m fire ring) | **Sahil, the RugMaster** (B §3.1): 3 stages, Carpet Sweep / Bazaar Rain / Magic Carpet Drop, Rug Barrage; Quicksand pools, Oasis spring, Sand Geysers vents | Fire ring; arena shifts | — | boss | First Duel boss: learn the stage/power rhythm. Reward: **Magic Carpet** |

**Checkpoints:** after E1, mid dunes, rim start, after E4, before the boss.
**Vista:** a sandstorm wall over the dunes; a giant Sahil statue holding a rolled rug.
**Secret (Confetti Everything):** inside a hanging carpet roll in E1, reached from an awning.
**Art wishlist:** carpet mover skin, stall awnings (procedural first).

---

## L3: The Vegetable Grove (`grove`, Twilight Grove) → preview: Broccoli Head *Sprout*

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 400 × 300 m | 3 | 18 min | No | 95 |

**Concept.** A twilight farm-forest where Broccoli Head's cabal grows its "product". Open
crop fields, a hedge maze, vine bridges over a toxic creek, and a greenhouse complex. Fireflies,
giant vegetables, mushroom bounce pads. At the end Broccoli Head himself shows up in stage 1,
fights briefly, then flees to LA: the first rival beat.

```
  [E1 CROP FIELDS] 160 m open, giant cabbages = cover, scarecrow towers
          ↓
  [E2 HEDGE MAZE] 2.5-4 m corridors, 60×60 m       [E3 VINE BRIDGES] over toxic runoff creek
          ↓────────────────────────────────────────→      ↓
                                           [E4 GREENHOUSES] 3 glass halls, nests inside
                                                          ↓
                                           [E5 THE PATCH] arena: Broccoli Head (Sprout)
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Teaches |
|---|---|---|---|---|---|---|
| E1 Crop Fields | field (giant cabbages, pumpkins, tractor wrecks, scarecrow towers) | 4 **Floret Sprouts** behind cabbages lobbing mini mortars, Obamas ×4 on scarecrow towers, Midgets ×8 | Mushroom **jump pads** onto towers | **Sniper rack** (tractor) | clearAll | Artillery: keep moving, flush them out |
| E2 Hedge Maze | corridor (2.5-4 m hedges, 60 × 60 m, 3 entrances) | **Sewer Midgets** ×10 popping out of veggie mounds (`burrow`, dust telegraph), Riot ×2 in long straights, Sprouts ×2 at the centre gazebo | Burrow mounds | **Shotgun + MG racks** at the entrances | reach the gazebo switch | Burrowers: watch the dust |
| E3 Vine Bridges | ledge (3 vine bridges over a toxic creek) | Flying Midgets ×5, Boom ×3 rushing across, Acolyte ×1 on the far bank | **Collapsing vine bridge** (the 2nd one), **toxic runoff** pools (12 dps zone) | — | reach far bank | Positioning on bridges |
| E4 Greenhouses | interior (3 connected glass halls, 30 × 20 m each, catwalks) | 3 **Midget Daycare** nests (one per hall), Sprouts ×3, Midgets streaming from nests, Obamas ×3 on catwalks | Greenhouse doors open as each nest dies; sprinkler slick floors | **Bazooka cache** in a potting shed (why: nests) | destroy 3 nests | Spawner priority |
| E5 The Patch | arena (40 m veggie patch, Duel-style low cover) | **Broccoli Head, stage 1 *Sprout*** (B §3.3: bolts + **Floret Mortar** only), plus 6 Midgets | At 50% of his bar he triggers the Hotbox (preview of stage 2), escapes on a vape cloud (cinematic), and the patch floods with Sprouts ×4 | **Turbo** power-up | survive → reach the exit truck | Preview of the L6 boss; teaches barrage dodging |

**Checkpoints:** after E1, maze centre, far bank, after each nest, before E5.
**Vista:** giant fireflies; a broccoli-shaped water tower; a twilight moon.
**Secret (Floor Is Lava):** at the top of a giant beanstalk climbed via mushroom pads.
**Bot route:** must handle burrow emergences (aim at burrow points when `burrowWarn` fires).

---

## L4: The Blockchain Void (`void`) → **Boss: Bitcoin Obama & The Midget**

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 500 × 500 × 200 m (floating) | 4 | 18 min | `'pickup'` in E1 | 80 + duo |

**Concept.** The first jetpack level: a floating exchange in the void. Giant candlestick
towers, chained blocks, sliding blocks on rails, black-hole wells. You get the jetpack early
and learn air combat against bitbugs, Jet Obamas and balloon mines. Then you face the Pump &
Dump Duo, whose Midget flies in his last stage.

```
      ▮ candle towers (green/red, 20-60 m)        ▮
  [E1 GENESIS BLOCK] start island ─ jetpack pedestal
        ↓ (chain bridges, sliding blocks)
  [E2 CANDLE FOREST] fly between towers, updrafts
        ↓
  [E3 MINE FIELD] canyon of floating blocks, balloon mines, gravity well
        ↓
  [E4 LEDGER HUB] depot island
        ↓
  [BOSS: OBAMA & MIDGET] Duel `exchange` arena on a big floating platform + fire ring
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Teaches |
|---|---|---|---|---|---|---|
| E1 Genesis Block | sky tutorial (start island, 3 hops of 12/16/20 m) | Flying Midgets ×3 | **Jetpack pickup**, **fuel pads**, energy **chain bridges** (switch-toggled) | — | reach E2 | Thrust, hover, fuel; "HOLD SPACE" signs |
| E2 Candle Forest | sky (candlestick towers, **updrafts** from "pump" vents) | **Bitbug** flocks: 1×6, then 2×8 | Updrafts; **sliding blocks** on rails as moving cover | **MG rack** on a candle top (why: bitbugs) | clearAll | Flocks; MG sweeps |
| E3 Mine Field | sky (300 m canyon of floating blocks) | 20 **Balloon Midgets** drifting (`placed`), **Jet Obamas** ×4 behind them, then ×2 more | **Gravity well** (pulls toward a void hole), **wind** lanes | **Sniper rack** (why: shoot mines from range, Jet Obamas) | clearAll | Chain mines into Jet Obamas; fight at their altitude |
| E4 Ledger Hub | arena-lite (a big island with a hub) | Drop-in: Riot ×3, Obamas ×4, Acolyte ×1, Bitbugs ×8 | **Depot**; **Infinite Fuel** power-up | **Bazooka rack** (why: duo) | clearAll | Ground + air mix; then a breather |
| **BOSS** | arena (Duel `exchange` layout on a floating platform, 2 blocks sliding on rails, fire ring) | **Bitcoin Obama & The Midget** (B §3.2): double fight, separate bars; Green Candles / Shill Calls / Liquidation; Tantrum Stomp / To the Moon / Pig Rain; the Midget flies in stage 3; Liquidation Pits, Airdrop, Gas Fees | Fire ring, sliding blocks, arena shifts; jetpack allowed (ceiling 12 m inside the ring) | — | both bosses | Double fight priorities (drop Obama first). Reward: **Pump It** |

**Checkpoints:** after the jetpack tutorial, E2 end, mid canyon, hub, before the boss.
**Vista:** the void aurora; an endless blockchain of glowing cubes; the price-chart sky.
**Secret (Moon Boots):** inside a hollow red candle, entered from the top.
**Bot route:** uses `jet` steps along authored air waypoints; the jet controller holds altitude ±1 m.

---

## L5: Frostspire Black Site (`glacier`) → vault hold under Glowie's Drone Strikes

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 420 × 300 m | 5 | 18 min | No | 115 |

**Concept.** Halo's "storm the fortress". A government black site in the glacier. An open
snowfield approach under sniper and turret fire, two generator bunkers to drop the shield
gate, a courtyard, multi-floor halls with lifts, then a vault hold. Glowie isn't here in
person: his **Drone Strikes** (B §3.4 power, as a level hazard) rain on you during the hold.
That's the setup for L8.

```
   [E5 VAULT] ← [E4 FROST HALLS] (3 floors, lifts)
        ↑               ↑
   [E3 COURTYARD] ← shield gate ← [E2 BUNKER L] [E2 BUNKER R]
        ↑
   ════ fortress wall: 2 Mining Rigs, 2 sniper towers ════
   [E1 SNOWFIELD] 250 m: left trench | centre rocks | right frozen lake (slick, cracking)
   start: crashed supply crate (cache)
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Teaches |
|---|---|---|---|---|---|---|
| E1 Snowfield | field (250 m heightfield; 3 routes) | 2 **Mining Rig** turrets on the wall (engage < 90 m), 2 **Audit Snipers** on towers (laser telegraph), 2 patrols of 3 Obamas, 8 Midgets idle in trenches | **Blizzard** every 90 s (visibility 40 m for 20 s, and perception range shrinks to match), **ice slick** lake, **cracking ice** tiles | **Cache: sniper + bazooka** (why: towers, turrets) | reach the wall | Choosing a route; counter-sniping; blizzard cover |
| E2 Wall Breach | interior ×2 (two bunkers, 15 × 10 m) | Left: Riot ×3, Midgets ×6. Right: **Glowie Agents** ×4 (squad with a flashbang), Boom ×3 | **Generator targets** (500 hp each) drop the shield gate | Ammo crates | destroy 2 generators | Agents use cover; look away from the flashbang |
| E3 Courtyard | arena/vertical (60 × 60 m, 2 levels of walkways) | Acolyte ×1 shielding Obamas ×4 + **Big Obama**; then drop pods: Midgets ×12, Boom ×4 | **Captured Mining Rig emplacement** on the wall (mount it for the drop-pod wave) | — | clearAll | Emplacement fun |
| E4 Frost Halls | interior (3 floors, corridors, library, armory) | Riot phalanx ×4 in a corridor, Agents ×6 room-clearing, Acolyte ×1 + Obamas ×3 in the library | **Lifts** between floors; ice-slick corridor | **Shotgun rack** + depot in the armory | reach the vault | Interior room clearing |
| E5 Vault Hold | hold (40 × 40 m vault, roof hatches) | Hold 45 s while the vault drill runs: hatch drop-ins of Midgets, Agents, Boom, Riot, then an elite Big Obama | **Glowie's Drone Strike** (strike power: reticle tracks you 1.8 s, locks 0.75 s) every 14 s from above, as a hazard | Ammo crates | hold → exit | Moving while holding; preview of Glowie |

**Checkpoints:** cache, wall base, after each generator, courtyard end, armory, before the hold.
**Vista:** aurora; a giant ice-carved Glowie face on the mountain, sunglasses glowing.
**Secret (Tax Season):** an ice cave under the frozen lake, through a cracked tile.

---

## L6: Vape Cabal Skyline (`city`, LA at night in the rain) → **Boss: Broccoli Head**

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 450 × 300 × 120 m | 6 | 22 min | Yes (from E3) | 110 + boss |

**Concept.** Back to LA, now at night in neon rain, to finish Broccoli Head. A freeway traffic
jam on the ground, then up the skyscrapers by jetpack, crane yards and rooftops, then down
into his `streets` arena under the freeway columns with drifting vape clouds.

```
  [E1 TRAFFIC JAM] freeway, 3 lanes + bus lane ═══ 150 m
        ↓ jump pads up the off-ramp
  [E2 BILLBOARD CATWALKS] 10 m up, 2 m wide
        ↓ jetpack pickup (vending machine "JETPACK 0 T")
  [E3 CRANE YARD] skyscraper skeleton, crane hooks (movers)
        ↓
  [E4 RAIN CANYON] fly a 25 m-wide street canyon between towers, 40 m up
        ↓
  [E5 HELIPAD] depot + nests → drop to street
        ↓
  [BOSS: BROCCOLI HEAD] Duel `streets` arena under the freeway + fire ring
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Teaches/twists |
|---|---|---|---|---|---|---|
| E1 Traffic Jam | corridor-of-cars (30 m × 150 m) | Boom ×6 hidden among cars (beeping), Riot ×3, Obamas ×3 on a stalled truck, Midgets ×10 | **Bus lane**: buses (movers, crush 40) every 7 s both ways; ride a bus as moving cover to flank | **Shotgun rack** (toll booth) | clearAll | Twist: Boom Midgets in clutter; movers as tools |
| E2 Billboard Catwalks | ledge/vertical (catwalks 2 m wide, 10 m up) | Flying Midgets ×4, Boom ×3 running along the catwalks, Sprouts ×2 on billboards | Jump pads between billboards; a fall lands on the road (not death) | — | reach the jetpack | Positioning at height |
| E3 Crane Yard | vertical/rail (girder floors, 2 tower cranes) | Jet Obamas ×3, Obamas ×4 on girders, Agents ×3 | **Jetpack** (vending machine), **crane-hook movers**, fuel pads | **Sniper rack** on the crane cab; **MG rack** (why: bitbugs in E4) | clearAll | Ground + air verticality |
| E4 Rain Canyon | sky (fly 300 m between skyscrapers) | Jet Obamas ×4, Bitbug flocks ×2, Flying Midgets ×6, from windows (`hidden` spawners on facades) | Updrafts at intersections, balcony fuel pads, neon signs as obstacles | — | reach the helipad | Air combat in a corridor |
| E5 Helipad | hold (40 × 40 m roof) | 2 **Daycare nests** dropped by drop pods, Boom ×4, Riot ×2, Bitbugs ×8 | Depot; drop zipline to the street | **Bazooka rack** (why: nests + boss) | destroy nests → zipline down | Spawners on a roof |
| **BOSS** | arena (Duel `streets` layout: freeway columns, cars, food truck, dumpsters, bus stop, planters, **drifting vape clouds**) | **Broccoli Head** (B §3.3): all 3 stages this time; Floret Mortar / Hotbox / Big Exhale, Floret Spray; Toxic Runoff, Fire Hydrant, Sewer Steam | Fire ring; vape clouds block sight both ways | — | boss | Cone knockback near cars; clouds as cover. Reward: **Vape Cloud** |

**Checkpoints:** E1 middle, catwalk start, jetpack, crane top, canyon middle, helipad, before the boss.
**Vista:** neon rain, the freeway ribbon to the horizon, a giant vape-cloud blimp.
**Secret (Duck Hunt):** the top of the highest antenna (jetpack ceiling challenge).

---

## L7: Hellfire Underworks (`volcano`, industrial interior)

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 260 × 260 m, multi-level, dark | 7 | 16 min | No (low ceilings) | 110 |

**Concept.** The narrowest level: Tinubu's bitcoin-mining foundry under the volcano. Tight
shafts, conveyor halls with crushers, a mine-cart ride over a lava lake, a reactor ring, then
a meltdown escape with rising lava. **Mini Tinubus** (his imps) debut. Their knockback near
lava and crushers is the level's danger.

```
  [E1 INTAKE SHAFTS] 3 m corridors, grates ─→ [E2 SORTING HALL] conveyors → crushers
                                                    ↓
                     [E3 MINE CART RUN] 350 m rail over a lava lake
                                                    ↓
                                   [E4 FURNACE GALLERY] ─→ [E5 REACTOR RING] 3 tiers
                                                                  ↓
                                         [E6 MELTDOWN ESCAPE] 120 s, rising lava, back to the surface
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Teaches/twists |
|---|---|---|---|---|---|---|
| E1 Intake Shafts | corridor (3 m shafts, `dark` zone, alarm lights) | Sewer Midgets 1 → 4 → 8 from floor grates at a T-junction | Darkness (motion tracker matters) | **Shotgun rack** | reach the hall | Burrowers return in the dark |
| E2 Sorting Hall | interior (70 × 40 m) | Obamas ×5 on gantries, Midgets ×10 carried toward you on conveyors, Boom ×3 | **Conveyors** toward **crushers** at both ends (1 s warning lights) | Ammo crate | switch (stop the line) | Hazards that are also cover |
| E3 Mine Cart Run | rail (350 m track through tunnels and over a lava lake) | Obamas ×6 on side ledges, Audit Snipers ×2, Flying Midgets ×6 chasing | **Rail cart** (soft lock), jump-over barriers with red telegraph, a timed gate | **Sniper rack** on the cart | reach the station | Shooting while carried |
| E4 Furnace Gallery | corridor/interior (40 × 60 m, molten channels) | **Mini Tinubu** intro: 1 alone down a straight (side alcoves to dodge; stunned on the wall = belly), then 2 + Midgets ×8 | Lava channels (knockback danger), pillars tagged `chargeStop` | Depot after | clearAll | Teach the charger: make it hit pillars |
| E5 Reactor Ring | arena (50 m circular, 3 tiers, central reactor) | Sewer Midgets from grates, Obamas on tiers, Boom ×4, Mini Tinubu ×2, Big Obama ×1 | Overload 3 reactor switches (hold 3 s, `fragile`) on different tiers | **Bazooka cache** (why: Big Obama) | 3 switches | Multitasking under pressure |
| E6 Meltdown Escape | escape (300 m of collapsing tunnels and catwalks) | Boom ×6 blocking, Mini Tinubu ×1 in a tunnel | **Rising lava** 120 s timer, collapsing bridges, stalled crushers, jump pads | — | escape | Movement mastery (sprint, slide, dash) |

**Checkpoints:** E1 end, E2 end, cart start, E4 end, before each reactor switch, escape start (the escape restarts at its start).
**Vista:** the furnace heart (giant glowing core with a Tinubu face); the surface volcano at the exit.
**Secret (Lights Out):** shoot a target on the tunnel wall during the cart ride and the Golden Bonk drops onto the cart.

---

## L8: Government Office (`office`) → **Boss: Glowie**

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 160 × 120 m footprint, 6 floors + roof | 8 | 18 min | No | 120 + boss |

**Concept.** Glowie's tower, a Halo-grade interior level. A lobby firefight, a cubicle farm
maze, security laser vaults, an atrium you climb by lifts and ramps, a dark server floor, then
Glowie in his cubicle arena on the top floor. **Agent** squads use cover everywhere.

```
  ROOF ── [BOSS: GLOWIE] Duel `cubicles` arena + fire ring
  F6   [E6 EXECUTIVE FLOOR] depot, keycard door
  F5   [E5 SERVER FLOOR] dark, lasers, cold aisles
  F3-4 [E4 ATRIUM] open 5-storey void: bridges, lifts, ramps
  F2   [E3 SECURITY VAULT] laser grids
  F1   [E2 CUBICLE FARM] 2.5 m aisles, 60 × 40 m
  F0   [E1 LOBBY] reception, metal detectors, glass
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Teaches/twists |
|---|---|---|---|---|---|---|
| E1 Lobby | interior (50 × 30 m, 2-storey glass) | Agents ×4 (one flashbang), Riot ×3 at metal detectors, Midgets ×6 | Revolving doors (rotating movers); a reception switch | **MG rack** (security desk) | switch → lifts open | Agents' cover use |
| E2 Cubicle Farm | corridor (cubicle maze, 2.5 m aisles, low walls 1.35 m) | Midgets ×14 swarming over cubicles, Boom ×4 in aisles, Agents ×3 on the manager's mezzanine, Acolyte ×1 | Copy-machine explosive barrels; low walls you can jump over | **Shotgun rack** (break room) | reach the stairwell | Swarm in a maze; vertical sightlines over low walls |
| E3 Security Vault | interior (40 × 30 m) | Riot ×4, Agents ×4 | **Laser grids** on timers (30 damage + knockback, 0.6 s flicker); **keycard** switch | — | switch → vault door | Timing under fire |
| E4 Atrium | vertical (open 5-storey atrium; bridges, balconies) | Snipers ×2 across the atrium, Agents ×6 on balconies, Flying Midgets ×6 in the void, Big Obama ×1 on a bridge | **Elevators** (movers), **pneumatic-tube ziplines** between floors, sprinkler slick floors | **Sniper rack** | reach F5 | Vertical interior combat |
| E5 Server Floor | interior/corridor (dark cold aisles between server racks) | Sewer Midgets from floor tiles, Agents ×4, Acolyte ×2, Mini Tinubu ×1 | Darkness, lasers, cooling vents (wind) | — | clearAll | Darkness + motion tracker |
| E6 Executive Floor | interior (offices, boardroom) | Elite Agents ×4, Riot ×2 | **Depot**; keycard door to the roof arena | **Bazooka rack** (why: boss) | enter arena | Breather |
| **BOSS** | arena (Duel `cubicles` grid on the top floor, fire ring) | **Glowie** (B §3.4): Drone Strike / **Flashbang (look away!)** / Suppressing Fire; Burst Fire → Full Auto; Live Wires, Water Cooler, Server Meltdown | Fire ring; low cubicle walls (1.35 m) block bolts but not the sweep: jump it | — | boss | First-person flashbangs. Reward: **Lock-On** |

**Checkpoints:** lobby end, mid farm, vault, each atrium floor, server floor end, executive floor.
**Vista:** through the windows: LA skyline and the void rift growing on the horizon.
**Secret (Red Tape):** in the CEO's private bathroom, behind a breakable mirror.

---

## L9: Moonlit Ruins (`moonlit`) → Big Obama twins + preview: Tinubu *Emi Lokan*

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 600 × 600 m heightfield | 9 | 28 min | Optional (updraft shrines; found at camp) | 150 (dormancy-managed) |

**Concept.** The big open battlefield, and non-linear. Ancient moonlit ruins on rolling hills.
Capture **three outposts in any order** (Halo territories), each with a different style, while
roaming patrols cross the map. Moon-gate portals link the ruins. When all three are taken, the
Moon Gate opens: Big Obama twins guard it, and Tinubu in stage 1 *Emi Lokan* appears through the
portal, casts a few Hellfire Pillars, laughs, and opens the way to the Caldera.

```
            [OUTPOST B: COLONNADE RIDGE] towers, snipers, turrets
                       /         \
   [START CAMP] —— roaming patrols —— [OUTPOST C: SUNKEN AMPHITHEATRE] arena, rotating stone rings
   cache: all 4      \         /
                [OUTPOST A: CATACOMBS] underground corridors, burrowers
                       ↓ (all 3 captured)
                 [MOON GATE] arena → Tinubu preview → exit portal
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Twists |
|---|---|---|---|---|---|---|
| Camp | field (start) | — | Depot; jetpack pedestal (optional) | **Cache: MG, shotgun, sniper, bazooka** | choose | Freedom to pick an approach |
| A Catacombs | corridor/interior (3-6 m tunnels under the ruins, crypt chamber) | Sewer Midgets, Riot phalanxes, Mini Tinubu ×2, Acolyte ×1 | Darkness, crumbling floors (crackTiles) into lower tunnels | Shotgun standee | capture (20 s, contested) | Close quarters |
| B Colonnade Ridge | vertical/field (ridge with 3 towers, a colonnade) | Audit Snipers ×4 relocating between towers, Mining Rigs ×2, Agents ×6 | **Sproto Camo** power-up lets you sneak up; jump pads | Sniper standee | capture | Long-range duels or stealth |
| C Sunken Amphitheatre | arena (70 m bowl) | Jet Obamas ×4, Bitbug flocks, Balloon Midgets over the bowl, Obamas ×6 on terraces, Acolytes ×2 | **Rotating stone rings** (rotators), **lunar shrine low-g zones** (gravity ×0.4) | — | capture | Low-g dogfights |
| Patrols | field | 3 roaming mixed squads (Obamas + Midgets + Acolyte / Agents), nav patrol routes between outposts | **Moon-gate portals** linking ruins (enemies use them too) | — | — | The world feels alive |
| Moon Gate | arena (70 m stone circle) | **Big Obama twins** (elite, bonded: when one dies the other enrages: speed ×1.4, burst ×1.5), Acolytes ×2, drop pods | — | Ammo | kill twins → Tinubu preview (cinematic: *Emi Lokan* casts Hellfire Pillars as scripted hazards for 20 s, then opens the portal) | Survive the pillars → enter the portal |

**Checkpoints:** on each capture, at camp after each capture, before the gate.
**Vista:** a giant moon low over the ruins; the Caldera's red glow through the Moon Gate.
**Secret (Swarm Surge):** the top of the tallest ruin spire, reached via a shrine updraft.
**Perf:** the biggest map. Requires chunk culling (C §3.15), dormancy (C §3.8) and a baked nav grid if the build exceeds 120 ms.

---

## L10: Hellfire Caldera (`volcano`) → **Final boss: Tinubu**, then the jetpack escape

| Size | Tier | Par | Jetpack | Enemies |
|---|---|---|---|---|
| 450 × 400 m, 80 m vertical | 10 | 30 min | Given for the escape | 140 + boss |

**Concept.** The finale climbs and descends an open volcano. A ridge trail with snipers
across a chasm, collapsing bridges over lava, geyser fields, a spiral rim descent, then
Tinubu in his Duel `caldera` arena, the hardest fight in the game. Then the volcano blows, and
you jetpack out through falling debris.

```
  [E1 RIDGE TRAIL] 3 m ledge, chasm 70 m, snipers opposite
        ↓
  [E2 BRIDGE CHAIN] 3 bridges over lava (2nd collapses)
        ↓
  [E3 GEYSER FIELDS] 100 × 80 m lava plain, rock islands
        ↓
  [E4 RIM DESCENT] spiral path, 3 loops, enemies above and below; depot at the bottom
        ↓
  [BOSS: TINUBU] Duel `caldera` arena (ruins, rocks, lava pools) + fire ring
        ↓
  [E6 ERUPTION ESCAPE] 90 s jetpack ascent through falling debris to the drop ship
```

| # | Space | Enemies | Mechanisms | Weapons | Objective | Twists |
|---|---|---|---|---|---|---|
| E1 Ridge Trail | ledge (3 m × 150 m) | Audit Snipers ×3 across the chasm, Midget drop-ins ×10 behind boulders, Agents ×3 | Fall → lava → void rescue | **Cache: all 4** at the start | clearAll | Snipers + knockback danger |
| E2 Bridge Chain | ledge (3 rope bridges, 30 m each) | Flying Midgets ×5, Boom ×4 rushing across, Jet Obamas ×2 | **Collapsing bridge** (2nd), **geysers** below | — | far side | Everything you know, on a bridge |
| E3 Geyser Fields | field (lava plain, rock islands) | Obamas ×5 on high islands, Floret Sprouts ×3, **Tinubu Imps** (elite Mini Tinubus) ×3, Boom ×4, Midgets ×10 | **Geysers** launch you to islands; lava channels | **Overshield** on a high island | clearAll | Chargers + lava + geysers |
| E4 Rim Descent | vertical (spiral path, 6 m wide, 3 loops) | Midgets ×12 from caves, Obamas ×4 firing across the caldera, Acolytes ×2, Agents ×4 | Caves (door spawners); depot at the bottom | **Bazooka rack** (depot) | reach the arena | Enemies above and below |
| **BOSS** | arena (Duel `caldera` layout: basalt outcrops, broken columns, lava pools, fire ring) | **Tinubu, the Unshackled Demon** (B §3.5): Hellfire Pillars / Infection (mana drain) / Inferno Rings / Meteor Rain; Hellfire → Inferno volleys; Magma Fissures, Hot Spring, Eruptions | Fire ring; caldera lava pools | — | boss | The final exam. Reward: **Hellfire Breath** |
| E6 Eruption Escape | sky escape (200 m vertical shaft, then a 400 m flight to the drop ship) | Bitbugs, Balloon Midgets, Jet Obamas ×4 | **Jetpack granted**, falling debris (movers), updrafts, fuel pads on debris; 90 s timer | — | escape | Victory lap under pressure → credits |

**Checkpoints:** ridge start, after E1, after the bridges, mid fields, rim top, depot, before the boss, escape start.
**Vista:** the erupting cone; the fire ring glowing below as you descend; the sky turning red.
**Secret (Iron Sproto):** a lava-tube side cave on the rim descent, behind a breakable wall.
**After credits:** unlock Legendary difficulty and the level-select modifier menu.

---

## 3. Notes for level authors

- **Build order inside a level PR:** blockout with `kit.js` (no props) → validator green →
  map export → encounters → bot route green → weapons and mechanisms → props and lighting →
  screenshots → tuning pass.
- **Never** let an encounter rely on one exact spot. Every encounter needs ≥ 2 ways to approach
  and ≥ 3 pieces of cover in the first 15 m.
- **Readability:** Halo uses a light at every door and lit paths forward. Use the level's
  `neon`/emissive material to mark the critical path subtly (`critPath` tag; the validator
  checks one exists from each checkpoint).
- **Pacing check:** the validator report prints the intensity estimate per encounter
  (enemies × role weights). No two encounters above 0.8 in a row without a breather.
- If an encounter feels flat, change the **space** or the **mix** before adding more enemies.
