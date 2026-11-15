import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const damp = (current, target, lambda, delta) => THREE.MathUtils.damp(current, target, lambda, delta);

function makeEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, 0, 512);
  base.addColorStop(0, '#11151c');
  base.addColorStop(0.32, '#050608');
  base.addColorStop(0.5, '#343a43');
  base.addColorStop(0.68, '#050608');
  base.addColorStop(1, '#151a22');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 512);

  const strips = [
    [70, 0, 35, 512, 'rgba(255,255,255,.92)'],
    [210, 0, 12, 512, 'rgba(180,195,215,.5)'],
    [360, 0, 48, 512, 'rgba(255,255,255,.78)'],
    [560, 0, 18, 512, 'rgba(205,215,230,.56)'],
    [760, 0, 62, 512, 'rgba(255,255,255,.88)'],
    [930, 0, 20, 512, 'rgba(160,175,195,.48)'],
  ];
  strips.forEach(([x, y, width, height, color]) => {
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.48, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  });

  const glow = ctx.createRadialGradient(512, 250, 8, 512, 250, 360);
  glow.addColorStop(0, 'rgba(255,255,255,.22)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeMetal(envMap, roughness = 0.12) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd8dde5,
    metalness: 1,
    roughness,
    envMap,
    envMapIntensity: 2.15,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
}

function makeOrbit(radius, rotation, tube, material, phase = 0, squash = 0.78) {
  const points = [];
  const segments = 180;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2 + phase;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * squash,
      Math.sin(angle * 2 + phase) * 0.035,
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
  const geometry = new THREE.TubeGeometry(curve, 240, tube, 12, true);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.userData.basePositions = geometry.attributes.position.array.slice();
  mesh.userData.baseNormals = geometry.attributes.normal.array.slice();
  mesh.userData.phase = phase;
  return mesh;
}

function makeLiquidBand(radius, rotation, material, phase = 0) {
  const points = [];
  const segments = 220;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const swell = 1 + 0.11 * Math.sin(angle * 3 + phase) + 0.045 * Math.sin(angle * 7 - phase);
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius * swell,
      Math.sin(angle) * radius * 0.72 * swell,
      0.08 * Math.sin(angle * 2 + phase),
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.48);
  const geometry = new THREE.TubeGeometry(curve, 260, 0.047, 16, true);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.userData.basePositions = geometry.attributes.position.array.slice();
  mesh.userData.baseNormals = geometry.attributes.normal.array.slice();
  mesh.userData.phase = phase + 1.7;
  return mesh;
}

function makeSphere(radius, material, position, segments = 32) {
  const geometry = new THREE.SphereGeometry(radius, segments, Math.max(20, segments - 4));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.userData.basePositions = geometry.attributes.position.array.slice();
  mesh.userData.baseNormals = geometry.attributes.normal.array.slice();
  mesh.userData.phase = position.x * 2.7 + position.y * 1.9;
  return mesh;
}

export default function MercuryOrbit() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    let animationFrame = 0;
    let disposed = false;
    let resizeObserver;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
        stencil: false,
        depth: true,
      });
    } catch (error) {
      mount.classList.add('orbit-fallback');
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'orbit-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, mount.clientWidth / mount.clientHeight, 0.1, 40);
    camera.position.set(0, 0, 6.8);

    const envMap = makeEnvironment(renderer);
    scene.environment = envMap;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(-3.5, 4.5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb8c9e3, 3.4);
    rim.position.set(4, -2, -3);
    scene.add(rim);
    const edge = new THREE.PointLight(0xffffff, 34, 12);
    edge.position.set(0, 3.5, 2.5);
    scene.add(edge);

    const sculpture = new THREE.Group();
    scene.add(sculpture);

    const brightMetal = makeMetal(envMap, 0.105);
    const softMetal = makeMetal(envMap, 0.2);
    const darkMetal = new THREE.MeshPhysicalMaterial({
      color: 0x87909d,
      metalness: 1,
      roughness: 0.24,
      envMap,
      envMapIntensity: 1.65,
      clearcoat: 1,
    });

    const deformables = [];
    const addDeformable = (mesh) => {
      sculpture.add(mesh);
      deformables.push(mesh);
      return mesh;
    };

    // The same interwoven orbital silhouette is retained in every interaction state.
    addDeformable(makeLiquidBand(1.24, [0.92, 0.16, -0.28], brightMetal, 0.2));
    addDeformable(makeLiquidBand(1.16, [-0.62, 0.82, 0.38], brightMetal, 1.1));
    addDeformable(makeOrbit(1.32, [1.18, 0.1, 0.08], 0.019, softMetal, 0.1, 0.68));
    addDeformable(makeOrbit(1.28, [-0.72, 0.88, 0.2], 0.014, brightMetal, 1.4, 0.78));
    addDeformable(makeOrbit(1.18, [0.25, -0.92, 0.72], 0.018, softMetal, 2.2, 0.72));
    addDeformable(makeOrbit(1.1, [1.42, 0.78, -0.45], 0.012, brightMetal, 0.8, 0.84));
    addDeformable(makeOrbit(1.36, [0.52, 1.28, 0.92], 0.01, darkMetal, 2.8, 0.7));

    const core = addDeformable(makeSphere(0.34, brightMetal, new THREE.Vector3(0, 0, 0.04), 48));
    const satellites = [
      [0.78, 0.52, 0.18, 0.13],
      [-0.92, -0.24, 0.12, 0.085],
      [0.14, -0.93, -0.12, 0.105],
      [-0.52, 0.88, -0.18, 0.07],
      [1.02, 0.08, -0.22, 0.055],
      [-0.12, 1.18, 0.22, 0.045],
      [0.44, -1.12, 0.16, 0.04],
    ];
    satellites.forEach(([x, y, z, radius], index) => {
      const bead = makeSphere(radius, index % 2 ? softMetal : brightMetal, new THREE.Vector3(x, y, z), 24);
      bead.userData.floatOrigin = bead.position.clone();
      bead.userData.floatIndex = index;
      addDeformable(bead);
    });

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.58, 0.006, 8, 220),
      new THREE.MeshBasicMaterial({ color: 0x9da8b7, transparent: true, opacity: 0.26 }),
    );
    halo.rotation.x = Math.PI * 0.5;
    halo.position.y = -1.42;
    sculpture.add(halo);

    sculpture.scale.setScalar(1.13);

    const pointer = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      previousSpeed: 0,
      force: 0,
      sharpness: 0,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      local: new THREE.Vector3(),
    };

    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect();
      const now = performance.now();
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = (event.clientY - rect.top) / rect.height;
      const elapsed = Math.max(8, now - (pointer.lastTime || now));
      const dx = pointer.lastTime ? event.clientX - pointer.lastX : 0;
      const dy = pointer.lastTime ? event.clientY - pointer.lastY : 0;
      const speed = Math.hypot(dx, dy) / elapsed;
      const sharpness = Math.abs(speed - pointer.previousSpeed) / 1.2;

      pointer.active = true;
      pointer.x = (nx - 0.5) * 2;
      pointer.y = (0.5 - ny) * 2;
      pointer.vx = dx / Math.max(1, rect.width);
      pointer.vy = -dy / Math.max(1, rect.height);
      pointer.speed = clamp(speed / 1.05);
      pointer.sharpness = clamp(sharpness);
      pointer.force = Math.max(pointer.force, clamp(pointer.speed * 0.72 + pointer.sharpness * 0.58));
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      pointer.lastTime = now;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.lastTime = 0;
    };

    mount.addEventListener('pointermove', onPointerMove, { passive: true });
    mount.addEventListener('pointerleave', onPointerLeave);

    const clock = new THREE.Clock();
    const tempNormal = new THREE.Vector3();
    const tempPosition = new THREE.Vector3();
    const localPointer = new THREE.Vector3();

    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const animate = () => {
      if (disposed) return;
      animationFrame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.035);
      const elapsed = clock.elapsedTime;

      pointer.force = damp(pointer.force, 0, pointer.active ? 1.8 : 1.25, delta);
      pointer.speed = damp(pointer.speed, 0, 5.5, delta);
      pointer.sharpness = damp(pointer.sharpness, 0, 4.2, delta);

      const intensity = pointer.force;
      const state = intensity > 0.78 ? 'sharp' : intensity > 0.52 ? 'heavy' : intensity > 0.25 ? 'hover' : intensity > 0.1 ? 'light' : intensity > 0.025 ? 'mild' : 'idle';
      mount.dataset.motion = state;

      localPointer.set(pointer.x * 1.42, pointer.y * 1.42, 0.28);
      sculpture.worldToLocal(localPointer);
      const movementAngle = Math.atan2(pointer.vy, pointer.vx);

      sculpture.rotation.y = damp(sculpture.rotation.y, pointer.x * 0.26 + pointer.vx * 3.8, 2.2, delta);
      sculpture.rotation.x = damp(sculpture.rotation.x, -pointer.y * 0.2 - pointer.vy * 3.2, 2.2, delta);
      sculpture.rotation.z = damp(sculpture.rotation.z, pointer.vx * 1.25 - pointer.vy * 1.1, 1.8, delta);
      sculpture.rotation.x += Math.sin(elapsed * 0.52) * (reducedMotion ? 0 : 0.018);
      sculpture.rotation.y += Math.cos(elapsed * 0.38) * (reducedMotion ? 0 : 0.022);

      const compression = intensity * 0.13;
      sculpture.scale.x = damp(sculpture.scale.x, 1.13 + compression * Math.cos(movementAngle), 4, delta);
      sculpture.scale.y = damp(sculpture.scale.y, 1.13 - compression * 0.62, 4, delta);
      sculpture.scale.z = damp(sculpture.scale.z, 1.13 + compression * 0.42, 4, delta);

      deformables.forEach((mesh, meshIndex) => {
        const geometry = mesh.geometry;
        const position = geometry.attributes.position;
        const base = mesh.userData.basePositions;
        const normals = mesh.userData.baseNormals;
        const phase = mesh.userData.phase || meshIndex;
        const isSatellite = mesh.userData.floatOrigin;
        if (isSatellite) {
          const origin = mesh.userData.floatOrigin;
          const index = mesh.userData.floatIndex;
          mesh.position.x = damp(mesh.position.x, origin.x + Math.sin(elapsed * 1.15 + index) * 0.018 + pointer.vx * intensity * (0.15 + index * 0.006), 5, delta);
          mesh.position.y = damp(mesh.position.y, origin.y + Math.cos(elapsed * 0.9 + index * 1.7) * 0.018 + pointer.vy * intensity * 0.12, 5, delta);
        }

        const array = position.array;
        for (let i = 0; i < array.length; i += 3) {
          const bx = base[i];
          const by = base[i + 1];
          const bz = base[i + 2];
          const dx = bx - localPointer.x;
          const dy = by - localPointer.y;
          const dz = bz - localPointer.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const influence = pointer.active ? Math.exp(-(distance * distance) / 0.22) : 0;
          const ripple = Math.sin(elapsed * (10 + intensity * 18) - distance * 18 + phase) * influence;
          const travellingWave = Math.sin(elapsed * 2.3 + phase + Math.atan2(by, bx) * 2) * (reducedMotion ? 0 : 0.009);
          const localPush = influence * intensity * (0.07 + pointer.sharpness * 0.22);
          const normalPush = ripple * intensity * (0.025 + pointer.sharpness * 0.075) + localPush;
          const nx = normals[i], ny = normals[i + 1], nz = normals[i + 2];
          const drag = influence * intensity * 0.16;
          array[i] = bx + nx * normalPush + pointer.vx * drag + bx * travellingWave;
          array[i + 1] = by + ny * normalPush + pointer.vy * drag + by * travellingWave;
          array[i + 2] = bz + nz * normalPush + influence * intensity * Math.sin(elapsed * 15 + phase) * 0.045;
        }
        position.needsUpdate = true;
        geometry.computeVertexNormals();
      });

      core.scale.setScalar(1 + intensity * 0.2 + Math.sin(elapsed * 2.2) * 0.012);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerleave', onPointerLeave);
      deformables.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
        else mesh.material.dispose();
      });
      halo.geometry.dispose();
      halo.material.dispose();
      brightMetal.dispose();
      softMetal.dispose();
      darkMetal.dispose();
      envMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="orbit-stage" ref={mountRef} role="img" aria-label="Interactive liquid-mercury orbital sculpture. Move your pointer across it to disturb the interwoven chrome orbits." />
  );
}
