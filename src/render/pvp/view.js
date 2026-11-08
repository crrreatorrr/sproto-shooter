// Free-arena view. Reuses the player model and the city floor. No new art.
import * as THREE from 'three';

const SEAT_COLOR = [0xff5ec4, 0x4fd1c5];

function asset(path) {
  const base = import.meta.env && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : './';
  return `${base}assets/${path}`;
}

let playerPromise = null;

function loadPlayer() {
  if (!playerPromise) {
    playerPromise = (async () => {
      const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      ]);
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(asset('models/characters/sproto_player.' + 'glb'));
      gltf.scene.traverse((obj) => { obj.frustumCulled = false; });
      return gltf.scene;
    })();
  }
  return playerPromise;
}

export function createArenaView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setClearColor(0x120a22, 1);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x120a22, 28, 80);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffe9c2, 0x2a1b4a, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.4);
  sun.position.set(12, 24, 8);
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(45, 48),
    new THREE.MeshStandardMaterial({ color: 0x3a2a55, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(44.2, 45, 48),
    new THREE.MeshBasicMaterial({ color: 0xff5ec4, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  const loader = new THREE.TextureLoader();
  loader.load(asset('textures/stages/city/floor.' + 'jpg'), (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    floor.material.map = tex;
    floor.material.color.set(0xffffff);
    floor.material.needsUpdate = true;
  });

  const bodies = [0, 1].map((seat) => {
    const group = new THREE.Group();
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.1, 4, 8),
      new THREE.MeshStandardMaterial({ color: SEAT_COLOR[seat] }),
    );
    capsule.position.y = 1.05;
    group.add(capsule);
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 16),
      new THREE.MeshBasicMaterial({ color: SEAT_COLOR[seat] }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.04;
    group.add(pad);
    scene.add(group);
    return { group, capsule };
  });

  const ready = loadPlayer().then((source) => {
    for (const body of bodies) {
      const model = source.clone(true);
      model.position.set(0, 0, 0);
      model.scale.setScalar(1);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const height = box.getSize(new THREE.Vector3()).y || 1;
      model.scale.setScalar(1.8 / height);
      model.updateMatrixWorld(true);
      model.position.y -= new THREE.Box3().setFromObject(model).min.y;
      body.group.add(model);
      body.capsule.visible = false;
    }
  }).catch(() => {});

  function resize() {
    const w = Math.max(1, canvas.clientWidth || canvas.width || 640);
    const h = Math.max(1, canvas.clientHeight || canvas.height || 360);
    if (canvas.width !== w || canvas.height !== h) renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(sample, seat) {
    resize();
    const players = sample && sample.players;
    for (let i = 0; i < 2; i++) {
      const p = players && players[i];
      const body = bodies[i].group;
      if (!p) { body.visible = false; continue; }
      body.visible = !!p.alive || p.hp > 0;
      body.position.set(p.x, p.y, p.z);
      body.rotation.y = p.yaw;
    }
    const me = players && players[seat] ? players[seat] : { x: 0, y: 0, z: 16, yaw: 0 };
    const backX = Math.sin(me.yaw) * 11;
    const backZ = Math.cos(me.yaw) * 11;
    camera.position.set(me.x + backX, me.y + 5.5, me.z + backZ);
    camera.lookAt(me.x - Math.sin(me.yaw) * 8, me.y + 1.1, me.z - Math.cos(me.yaw) * 8);
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    floor.geometry.dispose();
    ring.geometry.dispose();
  }

  return { render, dispose, ready };
}
