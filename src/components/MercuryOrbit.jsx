import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

function makeEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 0, 1024);
  base.addColorStop(0, '#080a0d');
  base.addColorStop(.16, '#dce2eb');
  base.addColorStop(.25, '#11151b');
  base.addColorStop(.43, '#737e8d');
  base.addColorStop(.53, '#080a0d');
  base.addColorStop(.72, '#c4ccd7');
  base.addColorStop(.82, '#151a22');
  base.addColorStop(1, '#050609');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 2048, 1024);

  // Broad studio softboxes create readable chrome reflections rather than a flat grey surface.
  const strips = [
    [90, 0, 72, .95], [310, 70, 28, .75], [510, 0, 145, .9],
    [825, 35, 42, .8], [1030, 0, 100, .95], [1290, 90, 34, .8],
    [1510, 0, 150, .9], [1800, 20, 45, .8], [1970, 0, 55, .9],
  ];
  strips.forEach(([x, pad, width, alpha]) => {
    const grad = ctx.createLinearGradient(x, 0, x + width, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(.5, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, pad, width, 1024 - pad * 2);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function makeMetal(env, color, roughness = .12, intensity = 2.2) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1,
    roughness,
    envMap: env,
    envMapIntensity: intensity,
    clearcoat: 1,
    clearcoatRoughness: .035,
  });
}

function makeTube(points, radius, material, segments = 520, sides = 18) {
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const geometry = new THREE.TubeGeometry(curve, segments, radius, sides, true);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.homeRotation = new THREE.Euler();
  mesh.userData.phase = Math.random() * Math.PI * 2;
  return mesh;
}

function makeOrbitalBand(radius, tilt, phase, thickness, material, squash = .74, twist = .08) {
  const points = [];
  const count = 420;
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2;
    const r = radius * (
      1 +
      .075 * Math.sin(3 * a + phase) +
      .035 * Math.sin(7 * a - phase * 1.4) +
      .018 * Math.cos(11 * a + phase)
    );
    points.push(new THREE.Vector3(
      Math.cos(a) * r,
      Math.sin(a) * r * squash * (1 + .035 * Math.sin(4 * a + phase)),
      twist * Math.sin(2 * a + phase) + .035 * Math.cos(5 * a - phase)
    ));
  }
  const mesh = makeTube(points, thickness, material, 620, 22);
  mesh.rotation.set(...tilt);
  mesh.userData.homeRotation.copy(mesh.rotation);
  return mesh;
}

function makeFilament(radius, tilt, phase, material, thickness = .006) {
  const points = [];
  for (let i = 0; i < 360; i++) {
    const a = i / 360 * Math.PI * 2;
    const r = radius + .025 * Math.sin(5 * a + phase) + .012 * Math.cos(9 * a);
    points.push(new THREE.Vector3(
      Math.cos(a) * r,
      Math.sin(a) * r * (.7 + .035 * Math.sin(3 * a + phase)),
      .06 * Math.sin(3 * a + phase)
    ));
  }
  const mesh = makeTube(points, thickness, material, 440, 8);
  mesh.rotation.set(...tilt);
  mesh.userData.homeRotation.copy(mesh.rotation);
  return mesh;
}

function makeDrop(radius, material, position, detail = 32) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, detail, detail), material);
  mesh.position.copy(position);
  mesh.userData.origin = position.clone();
  mesh.userData.phase = position.x * 2.7 + position.y * 4.1;
  return mesh;
}

function showFallback(mount) {
  mount.classList.add('orbit-fallback');
  mount.innerHTML = `
    <svg class="orbit-fallback-art" viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <linearGradient id="mercury" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#68717d"/>
          <stop offset=".38" stop-color="#f5f7fa"/><stop offset=".58" stop-color="#303741"/>
          <stop offset=".78" stop-color="#dce1e8"/><stop offset="1" stop-color="#515a66"/>
        </linearGradient>
        <filter id="chromeGlow"><feGaussianBlur stdDeviation="5"/></filter>
      </defs>
      <g fill="none" stroke="url(#mercury)" stroke-width="13" opacity=".95">
        <ellipse cx="300" cy="300" rx="218" ry="86" transform="rotate(28 300 300)"/>
        <ellipse cx="300" cy="300" rx="218" ry="86" transform="rotate(-48 300 300)"/>
        <ellipse cx="300" cy="300" rx="218" ry="86" transform="rotate(88 300 300)"/>
        <ellipse cx="300" cy="300" rx="192" ry="73" transform="rotate(145 300 300)"/>
        <ellipse cx="300" cy="300" rx="180" ry="65" transform="rotate(-12 300 300)"/>
        <ellipse cx="300" cy="300" rx="230" ry="92" transform="rotate(65 300 300)" stroke-width="5"/>
        <ellipse cx="300" cy="300" rx="205" ry="78" transform="rotate(-82 300 300)" stroke-width="4"/>
      </g>
      <circle cx="300" cy="300" r="42" fill="url(#mercury)"/>
      <g fill="url(#mercury)">
        <circle cx="105" cy="240" r="10"/><circle cx="442" cy="145" r="8"/>
        <circle cx="470" cy="385" r="7"/><circle cx="190" cy="485" r="9"/>
        <circle cx="350" cy="92" r="6"/><circle cx="125" cy="390" r="6"/>
      </g>
    </svg>`;
}

export default function MercuryOrbit() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    let frame = 0;
    let observer;
    let disposed = false;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        depth: true,
        stencil: false,
      });
    } catch {
      showFallback(mount);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'orbit-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
    camera.position.set(0, 0, 5.35);

    const environment = makeEnvironment();
    scene.environment = environment;
    scene.add(new THREE.AmbientLight(0xffffff, .55));

    const lightSpecs = [
      [0xffffff, 6.2, [-3.8, 4.2, 4.8]],
      [0xdce7f8, 5.0, [4.4, 1.8, -3.2]],
      [0xffffff, 4.0, [1.2, -4.2, 3.1]],
      [0x91a5c0, 2.8, [-4.2, -1.4, -2.4]],
    ];
    lightSpecs.forEach(([color, intensity, position]) => {
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(...position);
      scene.add(light);
    });

    const sculpture = new THREE.Group();
    scene.add(sculpture);

    const chrome = makeMetal(environment, 0xf4f6fa, .075, 2.8);
    const liquid = makeMetal(environment, 0xc4ccd7, .115, 2.5);
    const darkChrome = makeMetal(environment, 0x7d8999, .17, 2.0);
    const mirror = makeMetal(environment, 0xffffff, .045, 3.1);
    const satin = makeMetal(environment, 0xaab4c1, .21, 1.8);
    const objects = [];
    const bands = [];
    const add = (mesh, collection = objects) => {
      sculpture.add(mesh);
      objects.push(mesh);
      collection.push(mesh);
      return mesh;
    };

    // Eight substantial, irregular liquid ribbons crossing in different 3D planes.
    const bandSpecs = [
      [1.18, [.88, .12, -.31], .2, .061, chrome, .72, .11],
      [1.15, [-.68, .91, .34], 1.3, .054, mirror, .77, .13],
      [1.10, [1.26, -.64, .72], 2.2, .058, liquid, .69, .1],
      [1.24, [-1.02, -.22, -.86], 3.1, .05, chrome, .75, .12],
      [1.29, [.24, 1.12, .92], 2.65, .043, darkChrome, .67, .09],
      [1.06, [-1.2, .72, -.22], 4.2, .047, mirror, .82, .1],
      [1.34, [.48, -.98, 1.16], 5.1, .039, satin, .7, .12],
      [1.21, [-.32, -1.16, .48], 5.8, .045, liquid, .76, .1],
    ];
    bandSpecs.forEach((spec, index) => {
      const mesh = makeOrbitalBand(...spec);
      mesh.userData.bandIndex = index;
      add(mesh, bands);
    });

    // Fine orbital wires make the intersections read as a dense gyroscopic assembly.
    for (let i = 0; i < 13; i++) {
      const tilt = [
        Math.sin(i * 1.7) * 1.25,
        Math.cos(i * 1.13) * 1.2,
        Math.sin(i * .83) * 1.05,
      ];
      add(makeFilament(
        1.01 + (i % 5) * .075,
        tilt,
        i * .73,
        i % 4 === 0 ? mirror : (i % 3 === 0 ? darkChrome : satin),
        i % 3 === 0 ? .008 : .0045
      ));
    }

    // Two nested central liquid masses and a collar of small polished droplets.
    add(makeDrop(.255, mirror, new THREE.Vector3(0, 0, .08), 64));
    add(makeDrop(.145, chrome, new THREE.Vector3(.075, -.035, .245), 48));
    add(makeDrop(.075, liquid, new THREE.Vector3(-.13, .08, .29), 40));

    const satellites = [
      [.78, .52, .18, .105], [-.92, -.24, .12, .078], [.14, -.93, -.12, .092],
      [-.52, .88, -.18, .068], [1.02, .08, -.22, .06], [-.12, 1.18, .22, .052],
      [.44, -1.12, .16, .048], [-1.1, .48, .08, .058], [.64, .96, -.3, .042],
      [-.72, -.88, .3, .05], [.22, .62, -.48, .039], [-.3, -.35, .58, .034],
      [1.17, -.48, .32, .045], [-.42, 1.12, .4, .038], [.9, .78, -.18, .04],
    ];
    satellites.forEach(([x, y, z, r], i) => {
      add(makeDrop(r, i % 3 ? chrome : mirror, new THREE.Vector3(x, y, z), 28));
    });

    // Tiny beads sit along the outer orbital tracks.
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * Math.PI * 2;
      const radius = 1.34 + .035 * Math.sin(i * 2.3);
      add(makeDrop(
        .012 + (i % 4) * .0035,
        i % 2 ? satin : mirror,
        new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius * .72, .14 * Math.sin(a * 2)),
        12
      ));
    }

    sculpture.rotation.set(.13, -.22, .035);
    sculpture.scale.setScalar(1.08);

    const pointer = {
      x: 0, y: 0, vx: 0, vy: 0, speed: 0, force: 0, sharp: 0,
      lastX: 0, lastY: 0, lastTime: 0, active: false,
    };

    const onPointerMove = (event) => {
      const now = performance.now();
      const dt = Math.max(8, now - (pointer.lastTime || now));
      const dx = pointer.lastTime ? event.clientX - pointer.lastX : 0;
      const dy = pointer.lastTime ? event.clientY - pointer.lastY : 0;
      const speed = Math.hypot(dx, dy) / dt;
      const acceleration = Math.abs(speed - pointer.speed) / Math.max(.04, dt / 1000);

      pointer.x = (event.clientX / Math.max(1, innerWidth) - .5) * 2;
      pointer.y = (.5 - event.clientY / Math.max(1, innerHeight)) * 2;
      pointer.vx = dx / Math.max(1, innerWidth);
      pointer.vy = -dy / Math.max(1, innerHeight);
      pointer.speed = clamp(speed / 1.35);
      pointer.sharp = clamp(acceleration / 22);
      pointer.force = Math.max(pointer.force, clamp(pointer.speed * .82 + pointer.sharp * .62));
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      pointer.lastTime = now;
      pointer.active = true;
    };
    const onPointerLeave = () => { pointer.active = false; };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', onPointerLeave);

    const updatePlacement = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const progress = clamp(scrollY / maxScroll);
      const x = 69 - progress * 31 + Math.sin(progress * Math.PI * 2) * 3;
      const y = 31 + progress * 43;
      mount.style.left = `clamp(170px, ${x}vw, calc(100vw - 80px))`;
      mount.style.top = `${y}vh`;
      mount.style.setProperty('--scroll-progress', progress.toFixed(4));
    };
    window.addEventListener('scroll', updatePlacement, { passive: true });
    window.addEventListener('resize', updatePlacement, { passive: true });
    updatePlacement();

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), .032);
      const time = clock.elapsedTime;

      pointer.force = damp(pointer.force, 0, pointer.active ? 1.05 : 1.5, dt);
      pointer.speed = damp(pointer.speed, 0, 3.8, dt);
      pointer.sharp = damp(pointer.sharp, 0, 2.2, dt);
      pointer.vx = damp(pointer.vx, 0, 2.6, dt);
      pointer.vy = damp(pointer.vy, 0, 2.6, dt);

      const force = pointer.force;
      const angle = Math.atan2(pointer.vy, pointer.vx);
      const motion = force > .78 ? 'sharp' : force > .52 ? 'heavy' : force > .25 ? 'hover' : force > .1 ? 'light' : force > .025 ? 'mild' : 'idle';
      mount.dataset.motion = motion;

      // Whole sculpture carries momentum; individual orbital bands lag and recoil independently.
      const targetX = pointer.y * .38 - pointer.vy * 5.4 + Math.sin(time * .36) * .018;
      const targetY = pointer.x * .46 + pointer.vx * 5.6 + Math.cos(time * .31) * .02;
      sculpture.rotation.x = damp(sculpture.rotation.x, targetX, 2.0, dt);
      sculpture.rotation.y = damp(sculpture.rotation.y, targetY, 2.0, dt);
      sculpture.rotation.z = damp(sculpture.rotation.z, pointer.vx * 2.2 - pointer.vy * 1.9, 1.8, dt);

      const compression = force * (.22 + pointer.sharp * .18);
      sculpture.scale.x = damp(sculpture.scale.x, 1.08 + compression * Math.cos(angle), 3.2, dt);
      sculpture.scale.y = damp(sculpture.scale.y, 1.08 - compression * .72, 3.2, dt);
      sculpture.scale.z = damp(sculpture.scale.z, 1.08 + compression * .44, 3.2, dt);

      bands.forEach((band, index) => {
        const phase = time * (1.15 + index * .035) + index * 1.7;
        const localPull = force * (.025 + pointer.sharp * .035);
        band.rotation.x = damp(band.rotation.x, band.userData.homeRotation.x + pointer.vy * (index % 2 ? 1 : -1) * .9 + Math.sin(phase) * localPull, 3.1, dt);
        band.rotation.y = damp(band.rotation.y, band.userData.homeRotation.y + pointer.vx * (index % 2 ? -1 : 1) * 1.1 + Math.cos(phase * .8) * localPull, 3.1, dt);
        band.rotation.z = damp(band.rotation.z, band.userData.homeRotation.z + Math.sin(phase * .65) * force * .035, 3.1, dt);
      });

      objects.forEach((object) => {
        if (object.userData.origin) {
          const origin = object.userData.origin;
          const phase = object.userData.phase;
          object.position.x = damp(object.position.x, origin.x + Math.sin(time * 1.4 + phase) * .012 + pointer.vx * force * .48, 4, dt);
          object.position.y = damp(object.position.y, origin.y + Math.cos(time * 1.15 + phase) * .014 + pointer.vy * force * .42, 4, dt);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', onPointerLeave);
      window.removeEventListener('scroll', updatePlacement);
      window.removeEventListener('resize', updatePlacement);
      objects.forEach((object) => object.geometry.dispose());
      [chrome, liquid, darkChrome, mirror, satin].forEach((material) => material.dispose());
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return createPortal(
    <div
      className="orbit-stage orbit-travelling"
      ref={mountRef}
      role="img"
      aria-label="Interwoven liquid-mercury orbital sculpture, responsive to cursor movement and page scrolling."
    />,
    document.body
  );
}
