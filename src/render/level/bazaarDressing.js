// Section-local scenery. The city and mesa silhouettes occupy different depths and leave the route visible.
const SCENERY = {
  S1: [
    ['city', 37, -.34, 55, 75, [1.18, 1.12, 1.35]], ['city', 158, -.34, 76, -71, [1.4, 1.42, 1.2]],
    ['city', 199, -.34, -35, 16, [1.25, 1.19, 1.15]], ['city', 221, -.36, 63, -35, [1.19, 1.29, 1.31]],
    ['ridge', 39, -2.2, -44, 20, [3.7, 2.22, 2.6]], ['ridge', 218, -1.32, 126, 47, [3.6, 2.08, 3]],
    ['ridge', 33, -2.10, 179, 14, [4.0, 1.8, 3.05]], ['ridge', 155, -2.1, 204, -31, [3.4, 2.15, 3]],
    ['shop', 79, .01, 62, 0, [1.3, .88, 1.08]], ['shop', 122, .01, 61, 180, [1.3, .92, 1.04]],
    ['tower', 71, 0, 73, 37, [1.23, 1.26, 1.25]], ['tower', 129, 0, 88, -9, [1.24, 1.13, 1.24]],
    ['tower', 201, 0, 6, 22, [1.31, 1.52, 1.31]], ['tower', 201, 0, 42, 27, [1.31, 1.46, 1.31]],
    ['archway', 100, 0, 99, 0, [1.77, .87, 1.14]], ['archway', 196, 0, 24, 90, [2.03, .83, 1.12]],
    ['lantern', 93.6, .012, 104], ['lantern', 106.4, .012, 104, 180],
    ['lantern', 82, .012, 54.8, 90], ['lantern', 118, .012, 54.8, -90],
    ['lantern', 158, .012, 5, 177], ['lantern', 158, .012, 44], ['lantern', 188, .012, 4, 180], ['lantern', 188, .012, 44],
    ['rug', 74, .021, 112, 12, .69], ['rug', 126, .021, 110, -19, .73], ['rug', 84, .021, 138, 83, .68],
    ['rug', 170, .021, 4, 90, 1.01], ['rug', 175, .021, 43.8, -90, 1.07],
    ['brazier', 67, .01, 105], ['brazier', 132, .01, 104], ['brazier', 143, .01, 15.4, 0, .74],
    ['beacon', 109.3, .012, 20.7, -8], ['beacon', 109.3, .012, 27.3, 90],
  ],
  S2: [
    ['ridge', 21, -.7, 31, 13, [2.52, 1.53, 2.1]], ['ridge', 88, -1.01, 15, 3, [3.17, 2.30, 2.35]],
    ['ridge', 149, -1.24, 24, -8, [3.2, 2.6, 2.4]], ['ridge', 206, -1.38, 3, 21, [3.4, 2.4, 2.55]],
    ['ridge', 34, -.72, 167, 198, [2.6, 1.76, 2.3]], ['ridge', 105, -1.18, 208, 169, [3.13, 2.16, 2.5]],
    ['ridge', 172, -1.22, 194, 167, [3.45, 2.52, 2.32]], ['ridge', 308, -.85, 50, -17, [2.61, 2.4, 2.8]],
    ['city', 298, -.23, 154, 158, [1.49, 1.42, 1.46]], ['city', 266, -.2, 12, 11, [1.37, 1.37, 1.24]],
    ['archway', 204, 0, 98, 90, [2.54, .96, 1.07]], ['archway', 260, 0, 98, 90, [2.54, .96, 1.07]],
    ['tower', 214, 0, 64, 34, 1.27], ['tower', 253, 0, 132, 187, 1.31],
    ['lantern', 209, .02, 72, 15], ['lantern', 209, .02, 122, 180],
    ['lantern', 255, .02, 73, 45], ['lantern', 255, .02, 122, 180],
    ['brazier', 151, .02, 111.8, 90, .89], ['brazier', 195, .02, 85.0, -90, .94],
    ['rug', 232, .022, 114, 90, 1.29], ['rug', 237, .022, 85, 90, .81],
  ],
  S3: [
    ['ridge', 0, -.71, 2, 17, [2.18, 2.62, 2.1]], ['ridge', 57, -.83, -8, -21, [3.04, 3.13, 2.36]],
    ['ridge', 121, -1.06, 6, 13, [2.55, 2.53, 2.32]], ['ridge', 182, -1.33, -11, 18, [3.21, 3.01, 2.33]],
    ['ridge', 22, -1.12, 159, 154, [2.89, 2.21, 2.31]], ['ridge', 83, -1.1, 173, 181, [2.78, 2.37, 2.4]],
    ['ridge', 156, -1.33, 179, 198, [3.4, 3.0, 2.27]], ['ridge', 236, -1.27, 150, 165, [3.1, 2.35, 2.32]],
    ['city', 240, -.31, 4, 38, [1.39, 1.41, 1.48]],
    ['tower', 198, 0, 53, 4, 1.10], ['tower', 224, 0, 107, 170, 1.21],
    ['lantern', 45, .02, 64, 20], ['lantern', 96, .02, 95, 150], ['lantern', 166, .02, 96, 190],
    ['beacon', 103, .02, 67, 0, .95], ['beacon', 141, .02, 93, 0, 1.10],
  ],
  SM: [
    ['city', 31, -.30, -22, 1, [1.46, 1.39, 1.42]], ['city', 83, -.3, -35, -16, [1.5, 1.59, 1.38]],
    ['city', 137, -.30, 37, -64, [1.43, 1.28, 1.21]], ['city', 151, -.31, 125, -62, [1.36, 1.43, 1.30]],
    ['city', 18, -.32, 144, 83, [1.51, 1.33, 1.43]], ['city', 16, -.35, 213, 80, [1.55, 1.40, 1.33]],
    ['ridge', 15, -1.25, 270, 9, [2.46, 1.64, 1.8]], ['ridge', 163, -1.38, 275, -12, [2.52, 1.62, 1.84]],
    ['archway', 90, 0, 214, 0, [2.29, 1.13, 1.10]], ['tower', 61, 0, 215.3, 180, 1.47],
    ['tower', 119, 0, 215.3, 167, 1.47],
    ['lantern', 57.5, .02, 171], ['lantern', 122.5, .02, 171],
    ['lantern', 53, .02, 199], ['lantern', 127, .02, 199, 180],
    ['lantern', 79, .02, 222], ['lantern', 101, .02, 222, 180],
    ['rug', 58.5, .021, 194, 23, 1.3], ['rug', 124.5, .021, 204, -18, 1.25],
    ['rug', 47, 4.47, 43.5, 89, 1.13],
  ],
  S4: [
    ['ridge', -50, -.61, 92, 70, [2.7, 2.3, 1.8]], ['ridge', 128, -.63, 105, -69, [2.45, 2.2, 2.1]],
    ['ridge', -15, -.79, 183, 13, [3.3, 2.45, 2.6]], ['ridge', 108, -.86, 194, -6, [3.0, 2.45, 2.55]],
    ['city', -30, -.29, 116, 70, [1.65, 1.58, 1.65]], ['city', 117, -.30, 118, -60, [1.55, 1.75, 1.63]],
    ['city', 44, -.3, 148, 180, [1.52, 1.57, 1.30]],
    ['archway', 40, 0, 41, 0, [2.55, 1.17, 1.12]], ['archway', 40, 0, 109, 180, [2.86, 1.34, 1.38]],
    ['tower', 18, 0, 104, 158, [1.28, 1.45, 1.28]], ['tower', 62, 0, 104, 190, [1.30, 1.45, 1.3]],
    ['ring_inlay', 40, .028, 70, 0, [1.28, 1, 1.28]], ['rug', 40, .034, 70, 0, 1.25],
    ['brazier', 16, .02, 46], ['brazier', 64, .02, 46], ['brazier', 16, .02, 100], ['brazier', 64, .02, 100],
    ['lantern', 14, .02, 62, 84, 1.18], ['lantern', 66, .02, 62, -84, 1.18],
    ['rug', 32, .016, 58, -17, .62], ['rug', 48, .016, 58, 18, .62],
  ],
};

export function bazaarPlacements(section, prims) {
  const [ox, oy, oz] = section.origin;
  const out = [];
  const add = (model, x, y, z, yaw = 0, scale = 1, replace) =>
    out.push({ model: `bazaar2_${model}`, at: [ox+x, oy+y, oz+z], yaw, scale, replace });
  for (const item of SCENERY[section.id] || []) add(...item);
  if (section.id === 'S1') {
    const roof = prims.get('s1-canopy');
    if (roof) {
      add('canopy', roof.at[0] - ox, roof.at[1] - oy - .17, roof.at[2] - oz, 0,
        [roof.size[0] / 10.8, 1.63, roof.size[2] / 8.02], [roof.id]);
    }
  }
  if (section.id === 'SM') {
    for (const id of ['sm-r1', 'sm-r2', 'sm-r3', 'sm-m1', 'sm-m2', 'sm-h1', 'sm-f1']) {
      const slab = prims.get(id);
      if (!slab) continue;
      const [w, , d] = slab.size;
      const h = slab.at[1] - oy - .24;
      const inset = id === 'sm-f1' ? .10 : .18;
      // Edge piers meet the decks from below while leaving the street and optional rooftop route open.
      for (const side of [-1, 1]) {
        const x = id === 'sm-m2' && side === 1 ? 78 : slab.at[0] - ox + side*w*.37;
        add('support', x, 0, slab.at[2] - oz - d*inset, 0, [1.36, h, 1.36]);
        add('support', x, 0, slab.at[2] - oz + d*inset, 180, [1.36, h, 1.36]);
      }
    }
    const roof = prims.get('sm-minaret');
    if (roof) add('tower', roof.at[0] - ox, roof.at[1] - oy, roof.at[2] - oz, 0,
      [1.60, 1.45, 1.60], ['sm-minaret', 'sm-minaret-cap']);
  }
  if (section.id === 'S4') {
    const largeArch = out.find(p => p.model === 'bazaar2_archway' && p.at[2] > oz + 100);
    largeArch.replace = ['s4-balcony', 's4-balcony-roof'];
    for (const p of out.filter(p => p.model === 'bazaar2_rug' && p.at[2] === oz + 70)) p.replace = ['s4-rug'];
  }
  return out;
}

const COURTYARD_PAVING = {
  S1: [173, 24, 42, 62],
  S2: [232, 98, 54, 56],
  SM: [90, 186, 86, 46],
  S4: [40, 70, 56, 56],
};

export function bazaarPaving(section) {
  const dimensions = COURTYARD_PAVING[section.id];
  if (!dimensions) return [];
  const [x, z, width, depth] = dimensions;
  const [ox, oy, oz] = section.origin;
  return [{ kind: 'box', mat: 'stone', at: [ox + x, oy - .017, oz + z], size: [width, .05, depth] }];
}
