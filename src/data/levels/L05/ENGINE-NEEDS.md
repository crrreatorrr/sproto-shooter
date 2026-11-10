# L05 engine needs

Main is merged through #87. Seed 1, god mode, `enemyHpMult` 0.08, the same
aim loop as `tests/levels/campaign.test.js`, clears Frostspire at tick
20534, inside the 24000 tick cap. The Auditor stays in the courtyard and
the boss bar uses its name.

## Still open, and not required for this clear

1. **Heightfield (#86).** Terrain still does not collide or draw. `S1-ground`
   and `S2-ground` stay on `section.terrain`. `S1-floor` and `S2-floor` are
   the slabs the clear walks.
2. **Boulders.** Spheres still do not collide.
3. **Crack-ice.** The crack bands stay solid.
4. **Decoy.** `SPELL_IDS` has no Decoy. The shrine still names Cardboard
   Sproto. The bot never casts.
5. **Alpha's second lunge.** The elite in Final Notice is still one lunge
   and a 2.5 m patch.

Campaign fingerprint on this main is `9ec1c6ea`. PvP fingerprint
`17d87c54` and golden `6545ca0a` are untouched.
