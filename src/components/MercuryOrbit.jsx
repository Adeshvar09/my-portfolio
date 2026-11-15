import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

function createStudioEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const c = canvas.getContext('2d');
  const bg = c.createLinearGradient(0, 0, 0, 1024);
  bg.addColorStop(0, '#080a0e');
  bg.addColorStop(.18, '#69717d');
  bg.addColorStop(.29, '#080a0e');
  bg.addColorStop(.48, '#c2c9d2');
  bg.addColorStop(.56, '#090b0f');
  bg.addColorStop(.78, '#454d58');
  bg.addColorStop(1, '#050609');
  c.fillStyle = bg; c.fillRect(0, 0, 2048, 1024);
  const bands = [
    [95, 34, 56, .95], [280, 18, 15, .7], [510, 0, 94, .95],
    [790, 30, 26, .8], [1010, 0, 130, .9], [1330, 20, 32, .75],
    [1550, 0, 74, .95], [1810, 10, 22, .75], [1960, 0, 50, .85],
  ];
  bands.forEach(([x, pad, w, a]) => {
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(.5, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(x, pad, w, 1024 - pad * 2);
  });
  for (let i = 0; i < 14; i++) {
    const x = i * 157;
    const g = c.createRadialGradient(x, 500, 2, x, 500, 210);
    g.addColorStop(0, 'rgba(255,255,255,.2)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(x - 210, 290, 420, 420);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function metal(env, color = 0xe2e6ec, roughness = .105, intensity = 2.4) {
  return new THREE.MeshPhysicalMaterial({
    color, metalness: 1, roughness, envMap: env, envMapIntensity: intensity,
    clearcoat: 1, clearcoatRoughness: .035, reflectivity: 1,
  });
}

function tube(points, radius, material, tubular = 360, radial = 16) {
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const geometry = new THREE.TubeGeometry(curve, tubular, radius, radial, true);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.base = geometry.attributes.position.array.slice();
  mesh.userData.normals = geometry.attributes.normal.array.slice();
  mesh.userData.phase = Math.random() * Math.PI * 2;
  return mesh;
}

function orbit(radius, rotation, thickness, material, phase = 0, squash = .76, wave = .035) {
  const pts = [];
  for (let i = 0; i < 300; i++) {
    const a = i / 300 * Math.PI * 2;
    const r = radius * (1 + .075 * Math.sin(3 * a + phase) + .026 * Math.sin(9 * a - phase));
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * squash, wave * Math.sin(2 * a + phase)));
  }
  const mesh = tube(pts, thickness, material, 480, 20);
  mesh.rotation.set(...rotation);
  return mesh;
}

function liquidRibbon(radius, rotation, material, phase) {
  const pts = [];
  for (let i = 0; i < 360; i++) {
    const a = i / 360 * Math.PI * 2;
    const r = radius * (1 + .105 * Math.sin(3 * a + phase) + .032 * Math.sin(8 * a - phase));
    pts.push(new THREE.Vector3(
      Math.cos(a) * r,
      Math.sin(a) * r * .72 * (1 + .035 * Math.cos(5 * a + phase)),
      .12 * Math.sin(2 * a + phase) + .035 * Math.sin(5 * a)
    ));
  }
  const mesh = tube(pts, .052, material, 520, 24);
  mesh.rotation.set(...rotation);
  return mesh;
}

function sphere(radius, material, position, detail = 48) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, detail, detail), material);
  mesh.position.copy(position);
  mesh.userData.base = mesh.geometry.attributes.position.array.slice();
  mesh.userData.normals = mesh.geometry.attributes.normal.array.slice();
  mesh.userData.phase = position.x * 2.1 + position.y * 3.4;
  return mesh;
}

export default function MercuryOrbit() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let renderer;
    let raf = 0;
    let observer;
    let disposed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance', depth: true, stencil: false });
    } catch {
      mount.classList.add('orbit-fallback');
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'orbit-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, .1, 50);
    camera.position.set(0, 0, 6.15);
    const env = createStudioEnvironment();
    scene.environment = env;
    scene.add(new THREE.AmbientLight(0xffffff, .42));
    const lights = [
      [0xffffff, 5.5, [-3.8, 4.4, 4.5]],
      [0xd5e2f4, 4.2, [4.5, 1.2, -3.5]],
      [0xffffff, 3.2, [1.2, -4.5, 2.8]],
      [0x8c9eb8, 2.1, [-4, -1.5, -2]],
    ];
    lights.forEach(([color, power, pos]) => {
      const light = new THREE.DirectionalLight(color, power);
      light.position.set(...pos); scene.add(light);
    });

    const sculpture = new THREE.Group();
    scene.add(sculpture);
    const silver = metal(env, 0xf0f2f5, .075, 2.8);
    const satin = metal(env, 0xb9c1cc, .16, 2.25);
    const shadowSilver = metal(env, 0x727d8c, .21, 1.9);
    const bright = metal(env, 0xffffff, .045, 3.2);
    const parts = [];
    const add = (mesh) => { sculpture.add(mesh); parts.push(mesh); return mesh; };

    // Dense, interwoven orbital skeleton: identical geometry in every interaction state.
    add(liquidRibbon(1.18, [.88, .12, -.31], silver, .2));
    add(liquidRibbon(1.14, [-.68, .91, .34], bright, 1.3));
    add(liquidRibbon(1.08, [1.26, -.64, .72], satin, 2.2));
    add(liquidRibbon(1.24, [-1.02, -.22, -.86], silver, 3.1));
    add(orbit(1.31, [1.2, .12, .08], .019, bright, .1, .68));
    add(orbit(1.27, [-.72, .88, .2], .014, silver, 1.4, .78));
    add(orbit(1.19, [.25, -.92, .72], .018, satin, 2.2, .72));
    add(orbit(1.11, [1.42, .78, -.45], .012, bright, .8, .84));
    add(orbit(1.36, [.52, 1.28, .92], .011, shadowSilver, 2.8, .7));
    add(orbit(1.02, [-1.1, .44, 1.18], .009, bright, 1.9, .82));
    add(orbit(1.42, [.18, .9, -.3], .008, satin, 2.5, .64));

    // Fine secondary filaments add the fine-wire detail around the liquid bands.
    for (let j = 0; j < 8; j++) {
      const pts = [];
      for (let i = 0; i < 260; i++) {
        const a = i / 260 * Math.PI * 2;
        const r = 1.02 + j * .038 + .018 * Math.sin(5 * a + j);
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * (.68 + j * .012), .025 * Math.sin(3 * a + j * .7)));
      }
      const wire = tube(pts, j % 2 ? .004 : .006, j % 3 ? satin : bright, 360, 8);
      wire.rotation.set(j * .37 + .25, j * .61 - .8, j * .29);
      add(wire);
    }

    // Central polished mass, nested liquid-metal lobes and satellite droplets.
    add(sphere(.32, bright, new THREE.Vector3(0, 0, .05), 72));
    add(sphere(.19, silver, new THREE.Vector3(.08, -.025, .23), 56));
    const satellites = [
      [.78, .52, .18, .13], [-.92, -.24, .12, .085], [.14, -.93, -.12, .105],
      [-.52, .88, -.18, .07], [1.02, .08, -.22, .055], [-.12, 1.18, .22, .045],
      [.44, -1.12, .16, .04], [-1.1, .48, .08, .052], [.64, .96, -.3, .036],
      [-.72, -.88, .3, .047], [.22, .62, -.48, .032], [-.3, -.35, .58, .028],
    ];
    satellites.forEach(([x, y, z, r], i) => {
      const bead = sphere(r, i % 3 ? silver : bright, new THREE.Vector3(x, y, z), 32);
      bead.userData.floatOrigin = bead.position.clone();
      bead.userData.floatIndex = i;
      add(bead);
    });

    // Micro droplets and small polished nodes along the outer paths.
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      const r = 1.36 + .035 * Math.sin(i * 2.3);
      const node = sphere(.012 + (i % 4) * .004, i % 2 ? satin : bright,
        new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * .72, .13 * Math.sin(a * 2)), 16);
      node.userData.floatOrigin = node.position.clone();
      node.userData.floatIndex = i + 20;
      add(node);
    }

    sculpture.scale.setScalar(1.08);
    sculpture.rotation.set(.12, -.2, .02);

    const pointer = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, lastSpeed: 0, force: 0, sharp: 0, lastX: 0, lastY: 0, lastTime: 0, active: false };
    const onPointerMove = (e) => {
      const now = performance.now();
      const dt = Math.max(8, now - (pointer.lastTime || now));
      const dx = pointer.lastTime ? e.clientX - pointer.lastX : 0;
      const dy = pointer.lastTime ? e.clientY - pointer.lastY : 0;
      const speed = Math.hypot(dx, dy) / dt;
      const accel = Math.abs(speed - pointer.lastSpeed) / Math.max(.04, dt / 1000);
      pointer.x = (e.clientX / Math.max(1, innerWidth) - .5) * 2;
      pointer.y = (.5 - e.clientY / Math.max(1, innerHeight)) * 2;
      pointer.vx = dx / Math.max(1, innerWidth);
      pointer.vy = -dy / Math.max(1, innerHeight);
      pointer.speed = clamp(speed / 1.1);
      pointer.sharp = clamp(accel / 16);
      pointer.force = Math.max(pointer.force, clamp(pointer.speed * .7 + pointer.sharp * .48));
      pointer.lastSpeed = speed;
      pointer.lastX = e.clientX; pointer.lastY = e.clientY; pointer.lastTime = now; pointer.active = true;
    };
    const onPointerDown = () => { pointer.force = Math.max(pointer.force, .24); };
    const onPointerLeave = () => { pointer.active = false; };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('blur', onPointerLeave);

    const clock = new THREE.Clock();
    const temp = new THREE.Vector3();
    const localPointer = new THREE.Vector3();
    const updatePlacement = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const progress = clamp(scrollY / max);
      const x = 68 - progress * 30 + Math.sin(progress * Math.PI * 2) * 4;
      const y = 28 + progress * 46;
      mount.style.left = `clamp(55px, ${x}vw, calc(100vw - 55px))`;
      mount.style.top = `${y}vh`;
      mount.style.opacity = String(.32 + .13 * Math.sin(progress * Math.PI));
      mount.style.setProperty('--scroll-progress', progress.toFixed(4));
    };
    const onScroll = () => updatePlacement();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updatePlacement, { passive: true });
    updatePlacement();

    const resize = () => {
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    observer = new ResizeObserver(resize); observer.observe(mount); resize();

    const animate = () => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), .032);
      const t = clock.elapsedTime;
      pointer.force = damp(pointer.force, 0, pointer.active ? 1.15 : 1.65, dt);
      pointer.speed = damp(pointer.speed, 0, 4.2, dt);
      pointer.sharp = damp(pointer.sharp, 0, 2.6, dt);
      pointer.vx = damp(pointer.vx, 0, 2.8, dt);
      pointer.vy = damp(pointer.vy, 0, 2.8, dt);
      const force = pointer.force;
      const state = force > .78 ? 'sharp' : force > .52 ? 'heavy' : force > .25 ? 'hover' : force > .1 ? 'light' : force > .025 ? 'mild' : 'idle';
      mount.dataset.motion = state;

      // Cursor is mapped from the whole viewport, not from the sculpture's bounds.
      localPointer.set(pointer.x * 1.85, pointer.y * 1.85, .12);
      sculpture.worldToLocal(localPointer);
      const angle = Math.atan2(pointer.vy, pointer.vx);
      const targetX = pointer.y * .34 - pointer.vy * 4.6;
      const targetY = pointer.x * .42 + pointer.vx * 4.8;
      sculpture.rotation.x = damp(sculpture.rotation.x, targetX + Math.sin(t * .42) * (reduced ? 0 : .018), 2.1, dt);
      sculpture.rotation.y = damp(sculpture.rotation.y, targetY + Math.cos(t * .34) * (reduced ? 0 : .022), 2.1, dt);
      sculpture.rotation.z = damp(sculpture.rotation.z, pointer.vx * 1.7 - pointer.vy * 1.5, 1.8, dt);
      const squeeze = force * (.18 + pointer.sharp * .12);
      sculpture.scale.x = damp(sculpture.scale.x, 1.08 + squeeze * Math.cos(angle), 3.5, dt);
      sculpture.scale.y = damp(sculpture.scale.y, 1.08 - squeeze * .62, 3.5, dt);
      sculpture.scale.z = damp(sculpture.scale.z, 1.08 + squeeze * .38, 3.5, dt);

      parts.forEach((mesh, index) => {
        const pos = mesh.geometry.attributes.position;
        const base = mesh.userData.base;
        const normals = mesh.userData.normals;
        const phase = mesh.userData.phase || index;
        if (mesh.userData.floatOrigin) {
          const origin = mesh.userData.floatOrigin;
          const n = mesh.userData.floatIndex;
          mesh.position.x = damp(mesh.position.x, origin.x + Math.sin(t * 1.15 + n) * .012 + pointer.vx * force * .32, 4.2, dt);
          mesh.position.y = damp(mesh.position.y, origin.y + Math.cos(t * .92 + n * 1.7) * .014 + pointer.vy * force * .28, 4.2, dt);
        }
        const a = pos.array;
        for (let i = 0; i < a.length; i += 3) {
          const bx = base[i], by = base[i + 1], bz = base[i + 2];
          const dx = bx - localPointer.x, dy = by - localPointer.y, dz = bz - localPointer.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          const influence = Math.exp(-d2 / .3);
          const wave = Math.sin(t * (12 + force * 18) - Math.sqrt(d2) * 21 + phase);
          const wake = Math.sin(t * 4.2 - Math.sqrt(d2) * 7 + phase) * force * .025;
          const push = influence * force * (.035 + pointer.sharp * .15);
          const ripple = influence * wave * force * (.012 + pointer.sharp * .045);
          const drag = influence * force * .24;
          const nx = normals[i], ny = normals[i + 1], nz = normals[i + 2];
          a[i] = bx + nx * (push + ripple) + pointer.vx * drag + bx * wake;
          a[i + 1] = by + ny * (push + ripple) + pointer.vy * drag + by * wake;
          a[i + 2] = bz + nz * (push + ripple) + influence * force * Math.sin(t * 16 + phase) * .07;
        }
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true; cancelAnimationFrame(raf); observer?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('blur', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updatePlacement);
      parts.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      silver.dispose(); satin.dispose(); shadowSilver.dispose(); bright.dispose(); env.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return createPortal(
    <div className="orbit-stage orbit-travelling" ref={mountRef} role="img" aria-label="Detailed liquid-mercury orbital sculpture. It responds to pointer movement anywhere on the website and travels through the page as you scroll." />,
    document.body
  );
}
