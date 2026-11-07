# ChatGPT prompt: concept art

Paste the prompt below into a new ChatGPT chat. For assets marked **(ref)**, attach a screenshot of that character's current in-game model in the same message (take it from the game's Sandbox mode or `dev/model-viewer.html`). Send `next` to get each following image. Save each one as `art/concepts/<id>.png` in the repo, then Claude reviews them (plan section 6.4).

```text
You are the concept artist for "Sproto Shooter", a wacky first-person co-op looter-shooter. I need one
concept image per asset, one image per reply.

STYLE (apply to every image)
- Stylized comic-3D look: chunky readable shapes, bold silhouettes, clean cel-like shading with soft 3D
  volume, thick confident outlines, saturated colors, playful and fun. Think toy-like 3D animation crossed
  with a bold comic book.
- Enemies can be menacing: sharp angles, glowing eyes, aggressive poses, while staying fun.
- Plain pure white background. No floor, no scenery, no frame, no shadows beyond a soft contact shadow.
- No text of any kind: no letters, numbers, logos, labels, speech bubbles or watermarks.
- One single subject, centered, fully in frame, nothing cropped.
- Heads and weak points must read clearly at a glance (they are headshot targets in the game).
- When I attach a reference image, keep that character's design, colors and proportions and only change
  the pose or add the described effect. Don't make it a realistic depiction of any real person.

TWO KINDS OF IMAGE
- ACTION: a dynamic pose showing the attack's telegraph moment (the wind-up), 3/4 view, with the attack's
  effect drawn in the same style.
- MODEL SHEET: the full body in a neutral A-pose, front three-quarter view, even lighting, no effects, no
  motion blur, limbs clear of the body. These go to an image-to-3D tool, so keep it clean.

ASSETS (id: kind: description)
1  midget_pounce: ACTION (ref): the small swarm runner crouched low, about to leap, claws out, eyes locked forward.
2  midget_latch: ACTION (ref): the same runner mid-air with arms and legs spread wide, mouth open, about to grab on.
3  flying_midget_dive: ACTION (ref): the flying runner with a propeller beanie, tipping into a steep dive, red speed trail behind.
4  beanie_bomb: MODEL SHEET: a propeller beanie turned into a bomb, fuse lit, spinning blades, slightly cracked.
5  coin_gunner_ricochet: ACTION (ref): the suited coin-shooting gunner flicking a big glowing gold coin sideways with a trick-shot grin.
6  coin_mine: MODEL SHEET: a large spinning gold coin standing on its edge, with glowing ring segments and small spikes, armed and menacing.
7  big_gunner_shield_charge: ACTION (ref): the heavy armored gunner leaning into a charge behind a huge riot shield, a glowing battery pack on his back.
8  big_gunner_battery: MODEL SHEET: the heavy gunner's back battery pack alone, overcharging, crackling with blue-white energy, clearly a weak point.
9  mega_boss_grab: ACTION (ref): the giant physical boss reaching forward with one huge open hand to grab, the other fist raised, glowing weak spot on the head.
10 hex_boss_tether: ACTION (ref): the floating caster boss casting two crackling purple tether beams outward from his hands, an orbiting glowing weak orb beside him.
11 jade_dragon_gust: ACTION: a jade-green dragon rearing up, wings spread wide mid-flap blasting a visible gust, tail coiling for a spin, glowing head weak spot.
12 blue_monster_boulder: ACTION (ref): a giant blue monster lifting a huge cracked boulder overhead with both arms, about to throw.
13 sproto_beast_roar: ACTION (ref): a huge purple beast leaning forward in a massive roar, visible shockwave rings from its mouth, glowing chest weak spot.
14 boulder: MODEL SHEET: the thrown boulder alone, cracked rock with glowing blue fissures.
15 headshot_burst: ACTION: a comic impact effect for a headshot: a starburst with confetti, stars and a cartoon "bonk" shape, no letters.
16 weakpoint_glow: ACTION: a pulsing weak-point marker effect: a glowing ring with target segments around a bright core.
17 player2_sproto: MODEL SHEET (ref): the player character redesigned as Player 2 with a different main color and a small visual accessory, same body and proportions.
18 revive_beacon: MODEL SHEET: a small cheerful revive beacon prop, a capsule with a heart-shaped light and an antenna, that pops up above a downed player.
19 revive_effect: ACTION: a healing revive burst: rising green and gold sparkles, a soft ring and little hearts.
20 dive_impact: ACTION: a ground impact effect for a dive bomb: a cracked dust crater burst with flying debris.

Start with asset 1. After each image, wait. When I write "next", make the next asset in the list.
If I write "redo", make the same asset again following the style more closely.
```
