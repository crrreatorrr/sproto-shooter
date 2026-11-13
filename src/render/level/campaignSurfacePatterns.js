// The shader projects in metres so patterns keep their scale across differently sized meshes.
export const SURFACE_GLSL = /* glsl */ `
  varying vec3 vCampaignSurface;
  uniform float campaignSurfaceTime;
  uniform float campaignSurfaceKind;
  float surfacePixel;

  float surfaceHash(vec2 p) {
    vec3 h = fract(vec3(p.xyx) * vec3(.1031, .11369, .13787));
    h += dot(h, h.yzx + 19.19);
    return fract((h.x + h.y) * h.z);
  }

  float surfaceNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3. - 2. * f);
    return mix(mix(surfaceHash(i), surfaceHash(i + vec2(1., 0.)), f.x),
      mix(surfaceHash(i + vec2(0., 1.)), surfaceHash(i + vec2(1.)), f.x), f.y);
  }

  // Continuous piecewise-linear noise keeps the fractures angular.
  float surfaceFacets(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = surfaceHash(i), b = surfaceHash(i + vec2(1., 0.));
    float c = surfaceHash(i + vec2(0., 1.)), d = surfaceHash(i + vec2(1.));
    return f.x + f.y < 1. ? a + (b - a) * f.x + (c - a) * f.y
      : d + (c - d) * (1. - f.x) + (b - d) * (1. - f.y);
  }

  float surfaceLine(float x, float period, float width) {
    float d = abs(fract(x / period + .5) - .5) * period;
    float edge = max(.003, surfacePixel * .72);
    return (1. - smoothstep(width, width + edge, d))
      * (1. - smoothstep(period * .07, period * .32, surfacePixel));
  }

  float surfaceStamp(float distance, float width) {
    float edge = max(.005, surfacePixel * .72);
    return (1. - smoothstep(width, width + edge, abs(distance)))
      * (1. - smoothstep(.17, .67, surfacePixel));
  }

  // Seams, a narrow bevel highlight, and low-contrast colour variation between tiles.
  float surfaceBlocks(vec2 p, vec2 size, float stagger, float depth) {
    p.x += mod(floor(p.y / size.y), 2.) * size.x * stagger;
    float seam = max(surfaceLine(p.x, size.x, .023), surfaceLine(p.y, size.y, .019));
    float lip = max(surfaceLine(p.x - .063, size.x, .014), surfaceLine(p.y - .054, size.y, .014));
    float slab = surfaceHash(floor(p / size));
    return .94 + slab * .18 - seam * depth + lip * .07;
  }

  float surfaceGrain(vec2 p, vec2 stretch) {
    float wide = surfaceNoise(p * stretch);
    float detail = 1. - smoothstep(.08, .32, surfacePixel);
    return .84 + wide * .25 + (surfaceNoise(p * 6.6) - .48) * .13 * detail;
  }
`;

// Each body returns a diffuse multiplier. The separate gleam is an optional emissive accent.
export const CAMPAIGN_SURFACE_PATTERNS = {
  L01: /* glsl */ `
    float grain = surfaceGrain(p, vec2(.28, .38));
    if (ground) {
      if (campaignSurfaceKind == 7.) {
        float tile = surfaceBlocks(p, vec2(1.48, 1.48), 0., .23);
        vec2 q = abs(fract((p + vec2(.74)) / 2.96) - .5);
        float inlay = surfaceStamp((q.x + q.y - .22) * 2.96, .045);
        return vec3(.99, 1.04, 1.07) * grain * tile - vec3(.17, .10, .062) * inlay;
      }
      if (campaignSurfaceKind == 6.) {
        float tar = surfaceLine(p.x + .42 * surfaceNoise(p * .44), 9., .047);
        float repairs = surfaceBlocks(p, vec2(11.2, 5.2), .53, .23);
        float grit = surfaceNoise(p * 17.) * (1. - smoothstep(.022, .11, surfacePixel));
        return vec3(.94, .99, 1.065) * grain * (repairs - .17 * tar + .13 * grit);
      }
      float slabs = surfaceBlocks(p, vec2(3.2, 2.9), .5, .28);
      return vec3(1.04, .995, .98) * grain * slabs;
    }
    float panels = surfaceBlocks(p, vec2(2.65, 1.18), .5, .33);
    float band = surfaceLine(p.y - .10, 2.36, .071);
    return vec3(1.025, .99, .96) * grain * (panels + .07 * band);
  `,
  L02: /* glsl */ `
    float grain = surfaceGrain(p, vec2(.23, .19));
    if (campaignSurfaceKind == 5.) {
      float layers = p.y + .38 * surfaceFacets(p * vec2(.18, .35));
      float seam = surfaceLine(layers, 1.1, .045);
      float mineral = sin(layers * 3.8) * .5 + .5;
      return mix(vec3(1.24, 1.06, .94), vec3(1.74, 1.45, 1.14), mineral) * (grain - seam * .17);
    }
    if (campaignSurfaceKind == 1.) {
      float wind = p.y + .72 * sin(p.x * .37) + .40 * surfaceNoise(p * .24);
      float drift = ground ? .10 * sin(wind * 8.) : .052 * sin(wind * 3.6);
      return vec3(1.045, 1.01, .94) * (grain + drift * (1. - smoothstep(.07, .35, surfacePixel)));
    }
    float blocks = surfaceBlocks(p, ground ? vec2(1.48, 1.48) : vec2(2.3, .79), .5, .36);
    vec2 tile = abs(fract(p / (ground ? 1.48 : .79)) - .5);
    float inlay = surfaceStamp(tile.x + tile.y - .23, .018);
    float band = ground ? step(.75, surfaceHash(floor(p / 1.48)))
      : surfaceLine(p.y - .39, 3.16, .22);
    return mix(vec3(1.05, 1.01, .94) * blocks * grain, vec3(.64, .85, .90), inlay * band * .47);
  `,
  L03: /* glsl */ `
    if (campaignSurfaceKind == 2.) {
      float grain = surfaceGrain(p, vec2(1.15, .15));
      float boards = surfaceBlocks(p, vec2(.42, 3.1), .2, .28);
      float fibre = sin(p.x * 26. + 2.1 * surfaceNoise(p * vec2(.7, .36)))
        * (1. - smoothstep(.045, .17, surfacePixel));
      return vec3(1.045, 1.015, .94) * (grain * boards + .066 * fibre);
    }
    if (campaignSurfaceKind == 1. || campaignSurfaceKind == 4.) {
      float speckle = surfaceGrain(p, vec2(.53, .26));
      float contour = sin(p.y * 7.8 + 1.8 * surfaceNoise(p * .38))
        * (1. - smoothstep(.08, .39, surfacePixel));
      float moss = surfaceNoise(p * .21);
      float furrow = campaignSurfaceKind == 1. ? .13 : .043;
      return mix(vec3(1.07, .99, .87), vec3(.84, 1.10, .92), moss) * (speckle + furrow * contour);
    }
    float blocks = surfaceBlocks(p, vec2(1.75, .98), .5, .27);
    return mix(vec3(.95, 1.05, .90), vec3(1.08, .96, .83), surfaceNoise(p * .38)) * blocks;
  `,
  L04: /* glsl */ `
    vec2 size = ground ? vec2(3.65) : vec2(3.55, 1.72);
    float metal = surfaceBlocks(p, size, 0., .33);
    vec2 cell = p / size;
    vec2 inset = abs(fract(cell) - .5);
    float chip = surfaceHash(floor(cell));
    float along = chip < .50 ? inset.x : inset.y;
    float across = chip < .50 ? inset.y : inset.x;
    float trace = surfaceStamp(across - .29, .006) * step(along, .24) * step(.30, chip);
    float node = surfaceStamp(length(fract(cell) - vec2(.27, .22)) - .021, .008) * step(.62, chip);
    float pulse = .65 + .35 * sin(campaignSurfaceTime * 1.55 - p.x * .24 + p.y * .18);
    gleam = vec3(.03, .31, .46) * (trace * .28 + node * .37) * pulse;
    vec3 finish = vec3(.97, 1.025, 1.09) * (metal + trace * .075);
    if (ground && campaignSurfaceKind == 6.) {
      // The Void's through routes share world z=60. Paint arrows across the stair treads.
      float lateral = abs(p.y - 60.);
      float arrow = surfaceLine(p.x + lateral * .65, 5.2, .095) * (1. - smoothstep(1.7, 1.88, lateral));
      finish = mix(finish, vec3(1.82, 1.26, .48), arrow);
      gleam += vec3(.42, .20, .048) * arrow;
    }
    return finish;
  `,
  L05: /* glsl */ `
    if (campaignSurfaceKind == 1.) {
      float drifts = surfaceNoise(p * vec2(.10, .33));
      float wind = sin(p.y * 5.3 + 4.0 * surfaceNoise(p * .31))
        * (1. - smoothstep(.07, .47, surfacePixel));
      return vec3(.97, 1.00, 1.07) * (.91 + .16 * drifts + .07 * wind);
    }
    if (campaignSurfaceKind == 3.) {
      vec2 cut = p + .38 * vec2(surfaceNoise(p * .7), surfaceNoise(p * .8 + 5.));
      float fault = max(surfaceLine(cut.x + cut.y * .34, 2.2, .013),
        surfaceLine(cut.y - cut.x * .27, 2.85, .017));
      float facets = surfaceFacets(p * .25);
      float frost = smoothstep(.52, .78, surfaceNoise(p * .74));
      return mix(vec3(.78, .96, 1.10), vec3(1.04, 1.12, 1.20), facets)
        * (surfaceGrain(p, vec2(.38, .61)) + fault * .24 + frost * .10);
    }
    if (campaignSurfaceKind == 2.) {
      return vec3(1.03, 1.01, .98) * surfaceBlocks(p, vec2(.51, 2.8), .5, .28)
        * surfaceGrain(p, vec2(.92, .26));
    }
    float panels = surfaceBlocks(p, ground ? vec2(3.25, 2.4) : vec2(2.75, 1.45), 0., .30);
    float rib = surfaceLine(p.y - .18, 1.45, .047);
    vec3 finish = vec3(.97, 1.035, 1.08) * (panels * surfaceGrain(p, vec2(.37, .22)) + rib * .07);
    if (upward && campaignSurfaceKind == 0. && p.y < -853. && p.y > -900.) {
      float stripe = surfaceStamp(abs(p.x - 150.) - 3.4, .065);
      float dash = surfaceLine(p.y, 4.8, 1.22);
      finish = mix(finish, vec3(1.86, 1.24, .57), stripe * dash * .72);
      gleam += vec3(.17, .075, .027) * stripe * dash;
    }
    return finish;
  `,
  L06: /* glsl */ `
    float panels = surfaceBlocks(p, ground ? vec2(4.3, 2.85) : vec2(2.55, 2.8), .5, .36);
    float water = surfaceNoise(p * (ground ? vec2(.46, .83) : vec2(4., .21)));
    float sheen = smoothstep(.44, .81, water);
    float ripple = .73 + .27 * sin(p.y * 5. - campaignSurfaceTime * 1.8 + p.x * .22);
    float streak = (1. - smoothstep(.08, .45, surfacePixel)) * sheen * ripple;
    vec3 neon = mix(vec3(.11, .29, .45), vec3(.34, .09, .26), surfaceNoise(p * .11));
    gleam = neon * streak * .25;
    return mix(vec3(.88, .97, 1.12) * (panels - sheen * .20), vec3(.82, 1.10, 1.28), streak * .37);
  `,
  L07: /* glsl */ `
    vec2 size = ground ? vec2(4.0, 3.5) : vec2(2.4, 2.8);
    float blocks = surfaceBlocks(p, size, .5, .19);
    float soot = surfaceGrain(p, vec2(.34, .62));
    float seam = surfaceLine(p.y, size.y, .025);
    float furnace = .55 + .45 * sin(campaignSurfaceTime * 1.24 + p.x * .69);
    gleam = vec3(.30, .079, .022) * seam * furnace * (ground ? .033 : .18);
    return vec3(1.04, 1.01, 1.16) * blocks * soot;
  `,
  L08: /* glsl */ `
    vec2 tile = ground ? vec2(2.23, 2.23) : vec2(3.05, 1.49);
    float panels = surfaceBlocks(p, tile, 0., .15);
    float speckle = surfaceGrain(p, vec2(.24, .21));
    float trim = surfaceLine(p.y - .22, 2.85, .037);
    return vec3(.94, 1.01, 1.07) * (panels * speckle + (ground ? 0. : trim * .055));
  `,
  L09: /* glsl */ `
    float stone = surfaceBlocks(p, ground ? vec2(3.8, 3.2) : vec2(3.45, 1.45), .5, .18);
    float grain = surfaceGrain(p, vec2(.26, .29));
    float mineral = surfaceNoise(p * vec2(.53, .83));
    return vec3(.96, 1.01, 1.075) * stone * grain + vec3(.013, .022, .012) * mineral;
  `,
  L10: /* glsl */ `
    vec2 shift = vec2(surfaceFacets(p * .59), surfaceFacets(p * .53 + 9.)) - .5;
    vec2 fractured = p + shift * (ground ? 1.88 : .91);
    vec2 joints = vec2(fractured.x + fractured.y * .39, fractured.y - fractured.x * .27);
    vec2 size = vec2(3.85, ground ? 2.54 : 1.22);
    float split = max(surfaceLine(joints.x, size.x, .024), surfaceLine(joints.y, size.y, .020));
    float heat = surfaceNoise(p * .27);
    float pulse = .70 + .30 * sin(campaignSurfaceTime * 1.13 + p.x * .7 - p.y * .46);
    gleam = vec3(.42, .095, .014) * split * smoothstep(.39, .84, heat) * pulse;
    float plate = surfaceHash(floor(joints / size));
    float charcoal = surfaceGrain(p, vec2(.31, .51)) - split * .31 + (plate - .5) * .15;
    return mix(vec3(.96, 1.04, 1.06), vec3(1.18, .90, .77), heat) * charcoal;
  `,
};
