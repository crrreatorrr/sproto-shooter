# Grok Bot: concept art for every Sproto Shooter asset

Copy this whole file to Grok Bot. Every prompt is complete and ready to paste. Nothing needs filling in.

---

## Instructions for Grok Bot

You are making **concept art only** (2D images, no 3D models) for **Sproto Shooter**, a wacky first-person looter-shooter. Repo: `crrreatorrr/sproto-shooter`.

**Rules:**
1. **Make exactly one image per asset.** No alternatives or extra variations. If an image fails its check, replace it with one regeneration.
2. **Go in order.** Steps 1–3 depend on each other: masters → guns → part sheets. Steps 4–10 can run in any order after that.
3. **Prompts that say "Reference image" must have that image attached** (image-to-image or edit mode). This keeps shapes locked. Never run them as text-only.
4. **Save every image** at the path given under its prompt, as PNG, at least 2048 px on the long side.
5. **Repo workflow:** create branch `grok/concept-art` from the latest `main`, commit the images, open a pull request. Never push to `main`.
6. **When you finish,** post a list of every file plus any image that needed a regeneration and why.

**The Sproto (the game's hero character).** Reference image: `art/reference/sproto_reference.png`.
- Round head split vertically down the middle: left half royal blue, right half bright yellow.
- A crown of spiky blue quills around the back and sides of the head, like a hedgehog.
- Half-closed, sleepy, smug eyes with heavy eyelids; a round red clown nose; wide glossy red lips in a cheeky smirk.
- Blue skin on the hands.

Keep this face and head exactly whenever a Sproto appears.

**Overall look of the game:** realistic yet playful 3D. Stylized realism like a premium looter-shooter: believable materials and mechanical detail, chunky slightly exaggerated proportions, readable silhouettes, high-end game concept art quality.

---

## Step 1: gun structure masters (4 images, text-only)

These are plain grey blueprints that lock each gun type's shape. Both manufacturers' versions in step 2 are drawn over them. All positions are measured from the rear (left) end, where the gun's total length is 100 units.

### 1.1 Machine Gun master
> Orthographic right side view concept of a compact full-auto machine gun for a video game, muzzle pointing right, perfectly level, no perspective. NEUTRAL STRUCTURE MASTER: uniform matte mid-grey clay material, no colours, no decals, no wood, no glow, only clean hard-surface shapes so the silhouette and part layout are easy to read. Exact layout, measured from the rear (left) end where total length is 100 units: total height about 38 units. Fixed solid stock from 0 to 22, top flush with the receiver. Boxy receiver from 22 to 62, height 16, with a full-length top picatinny rail from 26 to 60. Pistol grip under the receiver at 40 to 48, raked back 15 degrees, length 18. Straight box magazine at 50 to 58 hanging down 20 units with a slight forward curve. Handguard from 62 to 82, slightly slimmer than the receiver. Barrel collar ring at 82, barrel from 82 to 100 with a short muzzle device from 95 to 100. Small low-profile iron sight on the rail at 30 to 36. Every part clearly separate and readable. Gun fills 80% of the image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/guns/masters/mg_master.png`.

### 1.2 Shotgun master
> Orthographic right side view concept of a pump-action double-barrel shotgun for a video game, muzzle pointing right, perfectly level, no perspective. NEUTRAL STRUCTURE MASTER: uniform matte mid-grey clay material, no colours, no decals, no wood, no glow, only clean hard-surface shapes so the silhouette and part layout are easy to read. Exact layout, measured from the rear (left) end where total length is 100 units: total height about 30 units. Stock from 0 to 28 with a 6 degree downward drop. Receiver from 28 to 55, height 15, with a short top rail from 32 to 52. Pistol grip at 40 to 47, raked back 18 degrees, length 16. Side shell holder on the receiver side at 34 to 48 holding four shells. Two barrels stacked one above the other, starting at a shared barrel collar ring at 55 and ending at 100. A tube magazine under the lower barrel from 55 to 90. Pump fore-end wrapped around the tube magazine from 60 to 78. Bead sight at 97 on the top barrel. Every part clearly separate and readable. Gun fills 80% of the image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/guns/masters/shotgun_master.png`.

### 1.3 Sniper master
> Orthographic right side view concept of a long bolt-action sniper rifle for a video game, muzzle pointing right, perfectly level, no perspective. NEUTRAL STRUCTURE MASTER: uniform matte mid-grey clay material, no colours, no decals, no wood, no glow, only clean hard-surface shapes so the silhouette and part layout are easy to read. Exact layout, measured from the rear (left) end where total length is 100 units: total height about 26 units including the scope. Thumbhole stock with a raised cheek rest from 0 to 32, the thumbhole grip formed at 34 to 40. Slim receiver from 32 to 56, height 10, with a bolt handle sticking out at 50 and a top rail from 34 to 58. Small box magazine at 44 to 52 hanging down 9 units. Slim handguard from 56 to 72 with a folded bipod underneath at 68 to 72. Barrel collar ring at 72, long thin barrel from 72 to 100 with a muzzle brake from 96 to 100. Long scope mounted on the rail from 38 to 58, raised 6 units above the receiver. Every part clearly separate and readable. Gun fills 80% of the image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 21:9.

Save as `art/concepts/guns/masters/sniper_master.png`.

### 1.4 Bazooka master
> Orthographic right side view concept of a shoulder-fired rocket launcher bazooka for a video game, muzzle pointing right, perfectly level, no perspective. NEUTRAL STRUCTURE MASTER: uniform matte mid-grey clay material, no colours, no decals, no wood, no glow, only clean hard-surface shapes so the silhouette and part layout are easy to read. Exact layout, measured from the rear (left) end where total length is 100 units: total height about 30 units. One straight main tube from 0 to 100, diameter 14 units, with a slightly flared rear exhaust from 0 to 6. Rocket loader breech box on top of the rear tube from 10 to 24. Padded shoulder rest under the tube at 28 to 36. Rear grip with trigger assembly under the tube at 40 to 48, length 18. Front grip under the tube at 62 to 68. Top rail on the tube from 40 to 60 with a flip-up ladder sight at 48 to 54. Collar ring at 82; the front section from 82 to 100 is a separate muzzle shroud. Every part clearly separate and readable. Gun fills 80% of the image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 21:9.

Save as `art/concepts/guns/masters/bazooka_master.png`.

**Check for each master:** use a ruler or grid. Every part sits within 3 units of the stated positions.

---

## Step 2: manufacturer guns (8 images; the matching master is the reference)

The two manufacturers share the exact structure of each master and differ only in looks.

- **Ol' Reliable** (realistic, classic): walnut wood, blued steel, brass, leather.
- **Gloop Labs** (playful lab tech): white and lavender polymer, glowing green goo tubes, purple metal.

**Check for every gun:** lay it over its master at 50% opacity. The outline and every part line up (within about 3% of length). Both versions of a type must read as the same gun model made by two different brands.

### 2.1 Machine Gun, Ol' Reliable
Reference image: `art/concepts/guns/masters/mg_master.png`
> Restyle the reference image into a finished machine gun concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (stock, receiver, top rail, grip, magazine, handguard, barrel collar, barrel, muzzle device, iron sight), the grip angle, the camera, scale and framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, engravings and small surface details. Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail, chunky readable silhouette, high-end game concept quality. Manufacturer style Ol' Reliable: classic frontier craftsmanship, oiled dark walnut wood stock and handguard with visible grain, deep blued steel receiver and barrel with light edge wear, polished brass rings, rivets and trigger guard, stitched tan leather wrap on the grip, engraved scrollwork on the flat steel receiver plate, a round brass maker's medallion with a horseshoe symbol. Warm palette of walnut brown, gunmetal blue-black, brass gold and tan leather #a8794a. Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/guns/mg_reliable.png`.

### 2.2 Machine Gun, Gloop Labs
Reference image: `art/concepts/guns/masters/mg_master.png`
> Restyle the reference image into a finished machine gun concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (stock, receiver, top rail, grip, magazine, handguard, barrel collar, barrel, muzzle device, iron sight), the grip angle, the camera, scale and framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, decals and small surface details. Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail, chunky readable silhouette, high-end game concept quality. Manufacturer style Gloop Labs: playful sci-fi laboratory tech, glossy white and lavender polymer shells with softly rounded edges, a translucent glass tube of glowing lime-green goo set into the side of the receiver, the magazine as a clear canister of bubbling green goo, purple anodized metal barrel and rail #9b59ff, black rubber grip pads and seals, small hazard-stripe decals and a bubbling-flask symbol, tiny green indicator LEDs. Cool palette of white, lavender, purple and toxic lime-green glow. Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/guns/mg_gloop.png`.

### 2.3 Shotgun, Ol' Reliable
Reference image: `art/concepts/guns/masters/shotgun_master.png`
> Restyle the reference image into a finished double-barrel pump shotgun concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (stock, receiver, top rail, grip, side shell holder, both stacked barrels, barrel collar, tube magazine, pump fore-end, bead sight), the grip angle, the camera, scale and framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, engravings and small surface details. Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail, chunky readable silhouette, high-end game concept quality. Manufacturer style Ol' Reliable: classic frontier craftsmanship, oiled dark walnut wood stock and pump with visible grain and checkering, deep blued steel receiver and barrels with light edge wear, polished brass shells in a leather side holder, brass rings and rivets, engraved scrollwork on the receiver, a round brass maker's medallion with a horseshoe symbol. Warm palette of walnut brown, gunmetal blue-black, brass gold and tan leather #a8794a. Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/guns/shotgun_reliable.png`.

### 2.4 Shotgun, Gloop Labs
Reference image: `art/concepts/guns/masters/shotgun_master.png`
> Restyle the reference image into a finished double-barrel pump shotgun concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (stock, receiver, top rail, grip, side shell holder, both stacked barrels, barrel collar, tube magazine, pump fore-end, bead sight), the grip angle, the camera, scale and framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, decals and small surface details. Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail, chunky readable silhouette, high-end game concept quality. Manufacturer style Gloop Labs: playful sci-fi laboratory tech, glossy white and lavender polymer shells with softly rounded edges, the tube magazine as a clear glass tube of glowing lime-green goo, translucent goo-filled shells in the side holder, purple anodized metal barrels #9b59ff, black rubber pump grip and seals, small hazard-stripe decals and a bubbling-flask symbol, tiny green indicator LEDs. Cool palette of white, lavender, purple and toxic lime-green glow. Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/guns/shotgun_gloop.png`.

### 2.5 Sniper, Ol' Reliable
Reference image: `art/concepts/guns/masters/sniper_master.png`
> Restyle the reference image into a finished bolt-action sniper rifle concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (thumbhole stock, cheek rest, receiver, bolt handle, top rail, box magazine, handguard, folded bipod, barrel collar, barrel, muzzle brake, long scope), the camera, scale and framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, engravings and small surface details. Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail, chunky readable silhouette, high-end game concept quality. Manufacturer style Ol' Reliable: classic frontier craftsmanship, oiled dark walnut thumbhole stock with visible grain and a stitched tan leather cheek pad, deep blued steel receiver and barrel with light edge wear, a polished brass-bodied scope with brass end caps, brass bolt knob, engraved scrollwork on the receiver, a round brass maker's medallion with a horseshoe symbol. Warm palette of walnut brown, gunmetal blue-black, brass gold and tan leather #a8794a. Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 21:9.

Save as `art/concepts/guns/sniper_reliable.png`.

### 2.6 Sniper, Gloop Labs
Reference image: `art/concepts/guns/masters/sniper_master.png`
> Restyle the reference image into a finished bolt-action sniper rifle concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (thumbhole stock, cheek rest, receiver, bolt handle, top rail, box magazine, handguard, folded bipod, barrel collar, barrel, muzzle brake, long scope), the camera, scale and framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, decals and small surface details. Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail, chunky readable silhouette, high-end game concept quality. Manufacturer style Gloop Labs: playful sci-fi laboratory tech, glossy white and lavender polymer stock with softly rounded edges, a scope with a lime-green glowing lens and a glass goo vial along its body, the box magazine as a small clear goo canister, purple anodized metal barrel #9b59ff, black rubber cheek pad and seals, small hazard-stripe decals and a bubbling-flask symbol, tiny green indicator LEDs. Cool palette of white, lavender, purple and toxic lime-green glow. Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 21:9.

Save as `art/concepts/guns/sniper_gloop.png`.

### 2.7 Bazooka, Ol' Reliable
Reference image: `art/concepts/guns/masters/bazooka_master.png`
> Restyle the reference image into a finished rocket launcher bazooka concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (main tube, flared rear exhaust, rocket loader box, shoulder rest, rear grip and trigger, front grip, top rail, ladder sight, collar ring, muzzle shroud), the camera, scale and framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, engravings and small surface details. Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail, chunky readable silhouette, high-end game concept quality. Manufacturer style Ol' Reliable: classic frontier craftsmanship, a blued steel tube wrapped with three polished brass bands, an oiled walnut wood shoulder rest and grips with visible grain, a riveted steel loader box with a brass latch, a stitched tan leather pad on the shoulder rest, engraved scrollwork on the loader box, a round brass maker's medallion with a horseshoe symbol. Warm palette of walnut brown, gunmetal blue-black, brass gold and tan leather #a8794a. Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 21:9.

Save as `art/concepts/guns/bazooka_reliable.png`.

### 2.8 Bazooka, Gloop Labs
Reference image: `art/concepts/guns/masters/bazooka_master.png`
> Restyle the reference image into a finished rocket launcher bazooka concept. KEEP EXACTLY from the reference: the outline, total length and height, the position and size of every part (main tube, flared rear exhaust, rocket loader box, shoulder rest, rear grip and trigger, front grip, top rail, ladder sight, collar ring, muzzle shroud), the camera, scale and framing. The silhouette must overlay the reference perfectly. CHANGE ONLY materials, colours, surface panels, decals and small surface details. Realistic yet video-game-fun weapon concept art, stylized realism like a premium looter-shooter, believable materials and mechanical detail, chunky readable silhouette, high-end game concept quality. Manufacturer style Gloop Labs: playful sci-fi laboratory tech, a glossy white and lavender polymer tube with softly rounded edges, a clear window along the tube showing a glowing lime-green goo rocket inside, a loader box shaped like a lab canister with a glass dome, purple anodized metal rail and collar #9b59ff, black rubber grips and shoulder pad, small hazard-stripe decals and a bubbling-flask symbol, tiny green indicator LEDs. Cool palette of white, lavender, purple and toxic lime-green glow. Orthographic right side view, muzzle pointing right, level, no perspective, gun fills 80% of image width, centred. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no hands, no text, no letters, no numbers, no watermark. Aspect ratio 21:9.

Save as `art/concepts/guns/bazooka_gloop.png`.

---

## Step 3: part sheets (8 images; reference 1 is the finished gun, reference 2 is its master)

Every sheet uses the same layout:
- **4 rows**, top to bottom: barrels, grips, magazines, optics.
- **4 columns**, left to right: the part exactly as it is on the gun, then three alternatives.
- Everything is at the same scale as the gun, so any part swaps on without resizing.
- In each row the attachment face sits on one shared line, and every part uses the identical mount.

**Check for every sheet:**
- Cut out column 1 and lay it on the gun: it matches the gun's parts exactly.
- Every alternative's mount is the same size as column 1's.

### 3.1 Machine Gun parts, Ol' Reliable
Reference image 1: `art/concepts/guns/mg_reliable.png` · Reference image 2: `art/concepts/guns/masters/mg_master.png`
> Create a weapon parts sheet for the machine gun in reference image 1. Use the exact manufacturer style, materials, colours and detail of reference image 1, and the exact attachment points of reference image 2. Layout: a 4 by 4 grid. Row 1 barrels: column 1 the original barrel with muzzle device exactly as on the gun; column 2 a long barrel 35% longer; column 3 a short barrel 40% shorter; column 4 a ported barrel of the original length with rows of vent ports and a large compensator. Row 2 pistol grips: column 1 the original grip; column 2 an ergonomic grip with sculpted finger grooves; column 3 a slim angled quickdraw grip with a speed loop; column 4 a thick heavy grip with a palm shelf. Row 3 magazines: column 1 the original box magazine; column 2 a round drum magazine; column 3 a shorter quick-swap magazine with a pull tab; column 4 a magazine of the original size with a window showing a glowing elemental core. Row 4 optics: column 1 the original iron sight; column 2 a compact red dot sight with a glowing red dot; column 3 a long scope with a large front lens; column 4 a medium scope decorated with a four-leaf clover lucky charm. Every part in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface as the original part: the same barrel collar diameter, the same grip mount, the same magazine-well top, the same rail foot. Parts evenly spaced, not touching. Realistic yet video-game-fun, stylized realism like a premium looter-shooter, Ol' Reliable walnut wood, blued steel, brass and tan leather. Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 1:1.

Save as `art/concepts/guns/parts/mg_reliable_parts.png`.

### 3.2 Machine Gun parts, Gloop Labs
Reference image 1: `art/concepts/guns/mg_gloop.png` · Reference image 2: `art/concepts/guns/masters/mg_master.png`
> Create a weapon parts sheet for the machine gun in reference image 1. Use the exact manufacturer style, materials, colours and detail of reference image 1, and the exact attachment points of reference image 2. Layout: a 4 by 4 grid. Row 1 barrels: column 1 the original barrel with muzzle device exactly as on the gun; column 2 a long barrel 35% longer; column 3 a short barrel 40% shorter; column 4 a ported barrel of the original length with rows of vent ports and a large compensator. Row 2 pistol grips: column 1 the original grip; column 2 an ergonomic grip with sculpted finger grooves; column 3 a slim angled quickdraw grip with a speed loop; column 4 a thick heavy grip with a palm shelf. Row 3 magazines: column 1 the original goo canister magazine; column 2 a round drum magazine; column 3 a shorter quick-swap magazine with a pull tab; column 4 a magazine of the original size with a window showing a glowing elemental core. Row 4 optics: column 1 the original iron sight; column 2 a compact red dot sight with a glowing red dot; column 3 a long scope with a large front lens; column 4 a medium scope decorated with a four-leaf clover lucky charm. Every part in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface as the original part: the same barrel collar diameter, the same grip mount, the same magazine-well top, the same rail foot. Parts evenly spaced, not touching. Realistic yet video-game-fun, stylized realism like a premium looter-shooter, Gloop Labs white and lavender polymer, purple metal #9b59ff, glowing lime-green goo. Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 1:1.

Save as `art/concepts/guns/parts/mg_gloop_parts.png`.

### 3.3 Shotgun parts, Ol' Reliable
Reference image 1: `art/concepts/guns/shotgun_reliable.png` · Reference image 2: `art/concepts/guns/masters/shotgun_master.png`
> Create a weapon parts sheet for the double-barrel shotgun in reference image 1. Use the exact manufacturer style, materials, colours and detail of reference image 1, and the exact attachment points of reference image 2. Layout: a 4 by 4 grid. Row 1 double barrels (both stacked barrels change together, always attached at the same collar): column 1 the original double barrels exactly as on the gun; column 2 long double barrels 35% longer; column 3 sawn-off short double barrels 40% shorter; column 4 ported double barrels of the original length with vent ports and a flared compensator. Row 2 pistol grips: column 1 the original grip; column 2 an ergonomic grip with sculpted finger grooves; column 3 a slim angled quickdraw grip with a speed loop; column 4 a thick heavy grip with a palm shelf. Row 3 side shell holders: column 1 the original four-shell side holder; column 2 a rotary shell drum; column 3 a quick speed-loader strip; column 4 a holder of glowing elemental shells. Row 4 optics: column 1 the original bead sight; column 2 a compact red dot sight with a glowing red dot; column 3 a long scope with a large front lens; column 4 a medium scope decorated with a four-leaf clover lucky charm. Every part in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface as the original part. Parts evenly spaced, not touching. Realistic yet video-game-fun, stylized realism like a premium looter-shooter, Ol' Reliable walnut wood, blued steel, brass and tan leather. Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 1:1.

Save as `art/concepts/guns/parts/shotgun_reliable_parts.png`.

### 3.4 Shotgun parts, Gloop Labs
Reference image 1: `art/concepts/guns/shotgun_gloop.png` · Reference image 2: `art/concepts/guns/masters/shotgun_master.png`
> Create a weapon parts sheet for the double-barrel shotgun in reference image 1. Use the exact manufacturer style, materials, colours and detail of reference image 1, and the exact attachment points of reference image 2. Layout: a 4 by 4 grid. Row 1 double barrels (both stacked barrels change together, always attached at the same collar): column 1 the original double barrels exactly as on the gun; column 2 long double barrels 35% longer; column 3 sawn-off short double barrels 40% shorter; column 4 ported double barrels of the original length with vent ports and a flared compensator. Row 2 pistol grips: column 1 the original grip; column 2 an ergonomic grip with sculpted finger grooves; column 3 a slim angled quickdraw grip with a speed loop; column 4 a thick heavy grip with a palm shelf. Row 3 side shell holders: column 1 the original side holder of goo shells; column 2 a rotary shell drum; column 3 a quick speed-loader strip; column 4 a holder of glowing elemental shells. Row 4 optics: column 1 the original bead sight; column 2 a compact red dot sight with a glowing red dot; column 3 a long scope with a large front lens; column 4 a medium scope decorated with a four-leaf clover lucky charm. Every part in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface as the original part. Parts evenly spaced, not touching. Realistic yet video-game-fun, stylized realism like a premium looter-shooter, Gloop Labs white and lavender polymer, purple metal #9b59ff, glowing lime-green goo. Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 1:1.

Save as `art/concepts/guns/parts/shotgun_gloop_parts.png`.

### 3.5 Sniper parts, Ol' Reliable
Reference image 1: `art/concepts/guns/sniper_reliable.png` · Reference image 2: `art/concepts/guns/masters/sniper_master.png`
> Create a weapon parts sheet for the sniper rifle in reference image 1. Use the exact manufacturer style, materials, colours and detail of reference image 1, and the exact attachment points of reference image 2. Layout: a 4 by 4 grid. Row 1 barrels: column 1 the original long barrel with muzzle brake exactly as on the gun; column 2 an extra-long barrel 35% longer; column 3 a short barrel 40% shorter; column 4 a ported barrel of the original length with rows of vent ports and a large compensator. Row 2 thumbhole grip sections: column 1 the original thumbhole grip; column 2 an ergonomic grip with sculpted finger grooves; column 3 a slim angled quickdraw grip; column 4 a thick heavy grip with a palm shelf. Row 3 magazines: column 1 the original small box magazine; column 2 a round drum magazine; column 3 a shorter quick-swap magazine with a pull tab; column 4 a magazine of the original size with a window showing a glowing elemental core. Row 4 optics: column 1 the original long scope; column 2 a compact red dot sight with a glowing red dot; column 3 a variable scope with adjustment turrets and a longer sunshade; column 4 a medium scope decorated with a four-leaf clover lucky charm. Every part in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface as the original part. Parts evenly spaced, not touching. Realistic yet video-game-fun, stylized realism like a premium looter-shooter, Ol' Reliable walnut wood, blued steel, brass and tan leather. Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 1:1.

Save as `art/concepts/guns/parts/sniper_reliable_parts.png`.

### 3.6 Sniper parts, Gloop Labs
Reference image 1: `art/concepts/guns/sniper_gloop.png` · Reference image 2: `art/concepts/guns/masters/sniper_master.png`
> Create a weapon parts sheet for the sniper rifle in reference image 1. Use the exact manufacturer style, materials, colours and detail of reference image 1, and the exact attachment points of reference image 2. Layout: a 4 by 4 grid. Row 1 barrels: column 1 the original long barrel with muzzle brake exactly as on the gun; column 2 an extra-long barrel 35% longer; column 3 a short barrel 40% shorter; column 4 a ported barrel of the original length with rows of vent ports and a large compensator. Row 2 thumbhole grip sections: column 1 the original thumbhole grip; column 2 an ergonomic grip with sculpted finger grooves; column 3 a slim angled quickdraw grip; column 4 a thick heavy grip with a palm shelf. Row 3 magazines: column 1 the original goo canister magazine; column 2 a round drum magazine; column 3 a shorter quick-swap magazine with a pull tab; column 4 a magazine of the original size with a window showing a glowing elemental core. Row 4 optics: column 1 the original long scope with green lens; column 2 a compact red dot sight with a glowing red dot; column 3 a variable scope with adjustment turrets and a longer sunshade; column 4 a medium scope decorated with a four-leaf clover lucky charm. Every part in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface as the original part. Parts evenly spaced, not touching. Realistic yet video-game-fun, stylized realism like a premium looter-shooter, Gloop Labs white and lavender polymer, purple metal #9b59ff, glowing lime-green goo. Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 1:1.

Save as `art/concepts/guns/parts/sniper_gloop_parts.png`.

### 3.7 Bazooka parts, Ol' Reliable
Reference image 1: `art/concepts/guns/bazooka_reliable.png` · Reference image 2: `art/concepts/guns/masters/bazooka_master.png`
> Create a weapon parts sheet for the bazooka in reference image 1. Use the exact manufacturer style, materials, colours and detail of reference image 1, and the exact attachment points of reference image 2. Layout: a 4 by 4 grid. Row 1 muzzle shrouds (attached at the collar ring): column 1 the original muzzle shroud exactly as on the gun; column 2 an extended blast shield 35% longer; column 3 a stubby shroud 40% shorter; column 4 a vented blast cone of the original length. Row 2 rear grip and trigger assemblies: column 1 the original; column 2 an ergonomic grip with sculpted finger grooves; column 3 a slim angled quickdraw grip; column 4 a thick heavy grip with a palm shelf. Row 3 rocket loader boxes: column 1 the original loader box; column 2 a three-rocket rotary cylinder; column 3 an open quick-feed tray; column 4 a loader with a window showing a glowing elemental rocket. Row 4 optics: column 1 the original flip-up ladder sight; column 2 a compact red dot sight with a glowing red dot; column 3 a long scope with a large front lens; column 4 a medium scope decorated with a four-leaf clover lucky charm. Every part in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface as the original part. Parts evenly spaced, not touching. Realistic yet video-game-fun, stylized realism like a premium looter-shooter, Ol' Reliable walnut wood, blued steel, brass and tan leather. Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 1:1.

Save as `art/concepts/guns/parts/bazooka_reliable_parts.png`.

### 3.8 Bazooka parts, Gloop Labs
Reference image 1: `art/concepts/guns/bazooka_gloop.png` · Reference image 2: `art/concepts/guns/masters/bazooka_master.png`
> Create a weapon parts sheet for the bazooka in reference image 1. Use the exact manufacturer style, materials, colours and detail of reference image 1, and the exact attachment points of reference image 2. Layout: a 4 by 4 grid. Row 1 muzzle shrouds (attached at the collar ring): column 1 the original muzzle shroud exactly as on the gun; column 2 an extended blast shield 35% longer; column 3 a stubby shroud 40% shorter; column 4 a vented blast cone of the original length. Row 2 rear grip and trigger assemblies: column 1 the original; column 2 an ergonomic grip with sculpted finger grooves; column 3 a slim angled quickdraw grip; column 4 a thick heavy grip with a palm shelf. Row 3 rocket loader boxes: column 1 the original canister loader; column 2 a three-rocket rotary cylinder; column 3 an open quick-feed tray; column 4 a loader with a window showing a glowing elemental rocket. Row 4 optics: column 1 the original flip-up ladder sight; column 2 a compact red dot sight with a glowing red dot; column 3 a long scope with a large front lens; column 4 a medium scope decorated with a four-leaf clover lucky charm. Every part in orthographic right side view at exactly the same scale as the gun in reference image 1, so it fits that gun without resizing. In each row the attachment face sits on one shared vertical line, and every alternative uses the identical mounting interface as the original part. Parts evenly spaced, not touching. Realistic yet video-game-fun, stylized realism like a premium looter-shooter, Gloop Labs white and lavender polymer, purple metal #9b59ff, glowing lime-green goo. Light grey #D9D9D9 background with a faint square grid, soft even studio light, no shadow, no hands, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 1:1.

Save as `art/concepts/guns/parts/bazooka_gloop_parts.png`.

---

## Step 4: player character (1 image; reference `art/reference/sproto_reference.png`)

### 4.1 Sproto player in armour, T-pose sheet
Reference image: `art/reference/sproto_reference.png`
> Full-body character concept sheet of the Sproto from the reference image as the hero of a first-person looter-shooter, standing in a strict T-pose: arms straight out to the sides at shoulder height, palms facing down, fingers together, legs straight and slightly apart, facing the camera. Show two views side by side at identical scale: front view on the left and back view on the right. KEEP THE HEAD EXACTLY like the reference: a round head split vertically down the middle into royal blue on the left half and bright yellow on the right half, a crown of spiky blue quills around the back and sides of the head, half-closed sleepy smug eyes with heavy eyelids, a round red clown nose, wide glossy red lips in a cheeky smirk, blue skin. Replace the robe with interesting, distinctive looter-shooter armour: a chunky segmented chest plate in cobalt blue with a bright yellow stripe down one side to echo the split face, a big round red emblem on the chest shaped like the clown nose; layered shoulder pauldrons with ticket-shaped rivets; a utility belt with ammo pouches, a hanging golden ticket and a small goo vial; armoured forearm bracers with a small wrist screen; reinforced knee guards; heavy tactical boots with yellow soles; thick armoured gloves in blue and yellow with padded knuckles and a red dot on the back of each hand, detailed enough to read well in first person; a compact backpack with a small antenna and a holster rack on the back, visible in the back view. Realistic yet playful 3D style: stylized realism, believable materials (painted metal, rubber, fabric, leather), chunky slightly exaggerated proportions, readable silhouette, premium game character concept quality. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no weapon in hand, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/characters/sproto_player_tpose.png`.

**Check:** the head matches the reference; it's a T-pose; front and back views are at the same scale; both gloves are fully visible.

---

## Step 5: Weapon Box (1 image)

### 5.1 Weapon Box crafting station
> Concept art of the Weapon Box, a crafting station in a wacky looter-shooter arena where players build guns from scrap. A chunky waist-high workbench crate about 1.6 metres wide: a teal-painted riveted steel body with a yellow hinged lid that opens upward, a glowing teal workbench surface on top with holographic gun-part outlines, side compartments overflowing with scrap metal, springs, purple goo jars and armour plates, a little robotic arm with a welding tip, and a glowing ring light around the base. Show it as a three-quarter front view with the lid open on the left and a straight front view with the lid closed on the right, at the same scale. Realistic yet playful 3D style: stylized realism, believable painted metal, chunky readable silhouette, premium game prop concept quality. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no people, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/props/weapon_box.png`.

---

## Step 6: pickups (2 images)

### 6.1 Health, mana and ammo pickups
> Game pickup concept sheet: eight floating collectible items in a 4 by 2 grid, each in a three-quarter view at a similar size, evenly spaced. Top row: a small red health orb (a glossy red sphere with a white cross inside and a soft glow); a large health orb (a bigger red sphere with a golden ring orbiting it and a blue shield shimmer); a mana orb (a glowing blue-violet sphere with swirling magical sparks); a medkit (a chunky white and red first-aid case with a blue handle). Bottom row: a bullet ammo box (a yellow metal box with brass bullet tips peeking out); a shotgun shell box (an orange box with red shells); a sniper ammo box (a cyan box with long sleek rounds); a rocket ammo crate (a purple crate with two small rockets). Each ammo box uses its colour clearly so it reads at a distance. Realistic yet playful 3D style: stylized realism, believable materials, chunky readable shapes, premium game item concept quality. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 2:1.

Save as `art/concepts/pickups/vitals_ammo.png`.

### 6.2 Crafting resources and tickets
> Game pickup concept sheet: seven floating collectible items in one row plus one hero item, three-quarter views, similar size, evenly spaced. Scrap (a small pile of bent grey metal plates, bolts and a gear); springs (a bundle of bright pink coiled springs); goo (a glass jar of glowing lime-green goo with bubbles); plating (a stack of blue-steel armour plates with rivets); a Boss Core (a glowing red crystal heart inside a black-and-gold mechanical cage); a Mana Crystal (a sharp glowing purple crystal cluster); a golden Ticket (a shiny gold carnival ticket with punched edges and a blue-and-yellow star symbol). Above them, larger, a spinning gold ticket coin shown front-on with a blue-and-yellow split face symbol. Realistic yet playful 3D style: stylized realism, believable materials, chunky readable shapes, premium game item concept quality. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no text, no letters, no numbers, no labels, no watermark. Aspect ratio 2:1.

Save as `art/concepts/pickups/resources_tickets.png`.

---

## Step 7: enemy add-ons (1 image)

These attach to the existing Sproto Duel enemy models. Draw only the props, no characters.

### 7.1 Enemy add-on props
> Prop concept sheet for enemy accessories in a wacky looter-shooter, four items in a row, each shown in a front view and a side view, same scale. 1) A propeller beanie for flying minions: a pink knit beanie with a yellow spinning propeller and a little motor hub on top, a chin strap. 2) A riot shield worn by a heavy bitcoin-themed brute: a tall curved blue-steel shield with a large gold bitcoin-style coin emblem (abstract circle and stripes, no letters), scratched edges and a viewing slit. 3) A back battery pack worn by the same brute: a chunky glowing yellow battery with exposed coils and a bright weak-spot core, clearly meant to be shot. 4) An elite crown: a small gold crown with red gems that floats above an elite enemy's head with a soft glow. Realistic yet playful 3D style: stylized realism, believable materials, chunky readable silhouettes, premium game prop concept quality. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no characters, no text, no letters, no numbers, no watermark. Aspect ratio 2:1.

Save as `art/concepts/props/enemy_addons.png`.

---

## Step 8: mini Sproto ally (1 image; reference `art/reference/sproto_reference.png`)

### 8.1 Mini Sproto buddy
Reference image: `art/reference/sproto_reference.png`
> Character concept sheet of a mini Sproto buddy, a tiny knee-high companion summoned by the player's Sproto Swarm spell. KEEP THE FACE AND HEAD exactly like the Sproto in the reference: a round head split vertically into royal blue and bright yellow halves, spiky blue quills, sleepy smug eyes, a red clown nose and wide red smirking lips. The head is huge compared to a small round body. It wears a tiny pink party hat and a little cobalt-blue chest plate with a yellow stripe, and holds a toy-sized goo blaster. Front view, side view and back view side by side at the same scale, standing straight. Realistic yet playful 3D style: stylized realism, believable materials, chunky cute proportions, premium game character concept quality. Plain flat light grey background #D9D9D9, soft even studio light, no shadow, no floor, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/characters/mini_sproto.png`.

---

## Step 9: projectiles and effects (2 images)

### 9.1 Projectiles
> Projectile concept sheet for a wacky looter-shooter, eight projectiles in a 4 by 2 grid, each shown flying to the right with a short motion trail, same scale reference. 1) a gold bitcoin-style coin bullet spinning edge-on (abstract coin pattern, no letters); 2) a tiny pink pellet with a short pink trail; 3) a purple magic orb with a swirling core; 4) a homing hot-pink tax bolt shaped like a crumpled glowing receipt; 5) a lime-green goo bolt that drips; 6) a chunky rocket with fins and a fiery exhaust; 7) a yellow rubber duck bullet mid-bounce; 8) an oversized white mega bullet with a glowing shockwave ring. Realistic yet playful 3D style, stylized realism, bright readable colours that pop against dark backgrounds. Plain flat dark grey background #2A2A2A so glows read, no shadow, no text, no letters, no numbers, no watermark. Aspect ratio 2:1.

Save as `art/concepts/vfx/projectiles.png`.

### 9.2 Elements, spells and explosions
> Visual-effects concept sheet for a wacky looter-shooter, eight effects in a 4 by 2 grid. Top row elements and impacts: 1) fire burn on a target: licking orange flames and embers; 2) shock: crackling cyan electric arcs jumping between points; 3) goo slow: sticky dripping lime-green goo splats and bubbles; 4) a weak-spot critical hit: a yellow comic-style starburst flash with confetti, no letters. Bottom row spells and explosions: 5) Chain Zap: a forked cyan lightning bolt chaining across three points; 6) Mana Shield: a translucent violet hexagon bubble; 7) Meteor Bonk: a flaming rock falling onto a glowing red target circle; 8) a rocket explosion: an orange fireball with smoke, sparks and colourful confetti. Realistic yet playful 3D style, stylized realism, bold readable shapes and colours. Plain flat dark grey background #2A2A2A so glows read, no text, no letters, no numbers, no watermark. Aspect ratio 2:1.

Save as `art/concepts/vfx/effects.png`.

---

## Step 10: UI icons, logo and key art (4 images)

### 10.1 Spell and skill icons
> Game UI icon sheet: nine square icons in a row of five and a row of four, each a rounded square badge with a bold symbol, consistent style, same size, readable at 48 pixels. Top row spells: Goo Bolt (a lime-green goo blob flying), Chain Zap (a forked cyan lightning bolt), Sproto Swarm (three tiny blue-and-yellow Sproto heads), Mana Shield (a violet hexagon shield), Meteor Bonk (a flaming meteor). Bottom row skills: Health (a red heart with a shield outline), Gunslinger (a gold crosshair over a revolver cylinder), Magic (a purple crystal orb), Crafting (a teal hammer and wrench crossed). Realistic yet playful 3D icon style, glossy, subtle bevel and inner glow, strong silhouettes. Plain flat light grey background #D9D9D9, evenly spaced, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/ui/icons_spells_skills.png`.

### 10.2 Resource, element and gun-type icons
> Game UI icon sheet: fifteen small square icons in three rows of five, each a rounded square badge with a bold symbol, consistent style, same size, readable at 32 pixels. Row 1 resources: scrap (a gear and bolt), springs (a pink coil spring), goo (a green goo jar), plating (a blue armour plate), Boss Core (a red caged crystal heart). Row 2: Mana Crystal (a purple crystal), golden ticket (a gold carnival ticket), fire element (an orange flame), shock element (a cyan lightning bolt), goo element (a green droplet). Row 3 gun types and medkit: machine gun silhouette, double-barrel shotgun silhouette, sniper rifle silhouette, bazooka silhouette, medkit (a red cross case). Realistic yet playful 3D icon style, glossy, subtle bevel and inner glow, strong silhouettes. Plain flat light grey background #D9D9D9, evenly spaced, no text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/ui/icons_resources_elements_guns.png`.

### 10.3 Logo
> Game logo concept for "SPROTO SHOOTER". The words SPROTO SHOOTER in chunky bold arcade letters, slightly tilted, SPROTO in bright yellow with a dark magenta drop shadow and SHOOTER in hot pink below it. A small Sproto head peeks over the letters (round head split royal blue and bright yellow, spiky blue quills, sleepy smug eyes, red clown nose, red smirking lips), holding a goo-dripping machine gun barrel that points out of the logo. Confetti and a few gold tickets burst behind it. Realistic yet playful 3D lettering with glossy bevels. Centred on a plain flat dark purple background #1A1030, no other text, no watermark. Aspect ratio 16:9.

Save as `art/concepts/ui/logo.png`.

**Check:** the words are spelled exactly "SPROTO SHOOTER". This is the only image allowed to contain text.

### 10.4 Key art
Reference image: `art/reference/sproto_reference.png`
> Cinematic key art for the wacky first-person looter-shooter Sproto Shooter. In the foreground, the Sproto hero from the reference (round head split royal blue and bright yellow, spiky blue quills, sleepy smug eyes, red clown nose, red smirking lips) in chunky cobalt-blue and yellow armour, firing a walnut-and-brass machine gun with a big muzzle flash, gold bullet casings flying. Behind, a circular arena at sunset over a stylized Los Angeles skyline with palm trees, swarms of small charging enemies in blue coats and top hats, a few flying with propeller beanies, gold bitcoin-style coins whizzing past, and a giant boss silhouette looming in the haze. Confetti explosions and floating gold tickets everywhere. Realistic yet playful 3D style, stylized realism, dramatic warm rim light and bloom, premium game key art quality. No text, no letters, no numbers, no watermark. Aspect ratio 16:9.

Save as `art/concepts/keyart/key_art.png`.

---

## Final checklist (reply with this ticked)

- [ ] 34 images saved at the exact paths above (4 masters, 8 guns, 8 part sheets, 1 player, 1 Weapon Box, 2 pickups, 1 enemy add-ons, 1 mini Sproto, 2 VFX, 4 UI/logo/key art).
- [ ] One image per asset; any regeneration listed with its reason.
- [ ] Each manufacturer gun overlays its master; both brands of a type read as the same model.
- [ ] Column 1 of each part sheet matches its gun's parts; alternatives use the same mounts.
- [ ] Sproto face matches `art/reference/sproto_reference.png` in the player, mini Sproto, logo and key art.
- [ ] No text in any image except the logo.
- [ ] Branch `grok/concept-art` pushed and a pull request opened against `main`.
