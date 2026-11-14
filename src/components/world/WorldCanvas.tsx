"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";

type HousePalette = { wall: string; roof: string; trim: string };

function material(color: string, roughness = 0.86) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeHouse(
  parent: THREE.Scene | THREE.Group,
  x: number,
  z: number,
  palette: HousePalette,
  scale = 1,
  homeType: string = "starter",
) {
  const group = new THREE.Group();
  const wall = material(palette.wall);
  const roof = material(palette.roof);
  const trim = material(palette.trim);
  const glass = new THREE.MeshStandardMaterial({ color: "#9ed5d2", roughness: 0.22, metalness: 0.12 });
  const dark = material("#52615c", 0.72);
  const floors = homeType === "patron" ? 3 : homeType === "family" || homeType === "premium" ? 2 : 1;
  const floorHeight = 0.68 * scale;
  const width = 1.72 * scale;
  const depth = 1.42 * scale;

  group.add(box(width + 0.16 * scale, 0.12 * scale, depth + 0.16 * scale, dark, 0, 0.06 * scale, 0));
  group.add(box(width, floorHeight * floors, depth, wall, 0, 0.12 * scale + (floorHeight * floors) / 2, 0));

  // Contemporary flat roof and a slightly offset upper volume for a varied silhouette.
  group.add(box(width + 0.18 * scale, 0.14 * scale, depth + 0.18 * scale, roof, 0, 0.12 * scale + floorHeight * floors + 0.07 * scale, 0));
  if (floors > 1) {
    group.add(box(0.12 * scale, 0.8 * scale, 0.12 * scale, trim, -0.58 * scale, floorHeight * 1.8, depth / 2 + 0.08 * scale));
    group.add(box(0.12 * scale, 0.8 * scale, 0.12 * scale, trim, 0.58 * scale, floorHeight * 1.8, depth / 2 + 0.08 * scale));
  }

  const door = box(0.34 * scale, 0.58 * scale, 0.06 * scale, trim, -0.47 * scale, 0.12 * scale + 0.29 * scale, depth / 2 + 0.04 * scale);
  group.add(door);
  for (const floor of Array.from({ length: floors }, (_, index) => index)) {
    const y = 0.12 * scale + floorHeight * (floor + 0.53);
    for (const wx of [0.18, 0.83]) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.34 * scale, 0.055 * scale), glass);
      window.position.set((wx - 0.5) * width, y, depth / 2 + 0.035 * scale);
      group.add(window);
    }
  }

  if (homeType === "premium" || homeType === "patron") {
    const balcony = box(0.9 * scale, 0.08 * scale, 0.5 * scale, trim, 0.28 * scale, floorHeight * 1.42, depth / 2 + 0.2 * scale);
    group.add(balcony);
    for (const xOffset of [-0.14, 0.14, 0.42, 0.7]) {
      group.add(box(0.035 * scale, 0.32 * scale, 0.035 * scale, glass, xOffset * scale, floorHeight * 1.62, depth / 2 + 0.4 * scale));
    }
  }
  if (homeType === "patron") {
    group.add(box(0.7 * scale, 0.12 * scale, 0.75 * scale, roof, 0.56 * scale, floorHeight * 2.1, -0.08 * scale));
    group.add(box(0.045 * scale, 0.42 * scale, 0.045 * scale, trim, 0.56 * scale, floorHeight * 2.35, 0.27 * scale));
  }

  group.position.set(x, 0, z);
  parent.add(group);
  return group;
}
function makeTree(scene: THREE.Scene, x: number, z: number, size = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * size, 0.14 * size, 0.72 * size, 7), material("#79523a"));
  trunk.position.y = 0.36 * size;
  trunk.castShadow = true;
  group.add(trunk);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * size, 1), material("#397b59"));
  crown.position.y = 0.92 * size;
  crown.scale.set(1, 1.18, 0.92);
  crown.castShadow = true;
  group.add(crown);
  scene.add(group);
}

function makeOtter(scene: THREE.Scene) {
  const otter = new THREE.Group();
  const fur = material("#8d654b");
  const cream = material("#e8d7bf");
  const hoodie = material("#1c5555");
  const dark = material("#241e1b");
  const eyeWhite = material("#f9f4ea");
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 18), hoodie);
  body.scale.set(0.82, 1.05, 0.62);
  body.position.y = 0.76;
  otter.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 22), fur);
  head.scale.set(1.06, 0.92, 0.9);
  head.position.set(0, 1.62, 0.02);
  otter.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), fur);
    ear.position.set(side * 0.39, 1.96, 0.02);
    otter.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), eyeWhite);
    eye.position.set(side * 0.17, 1.7, 0.42);
    otter.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), dark);
    pupil.position.set(side * 0.17, 1.7, 0.48);
    otter.add(pupil);
  }
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 16), cream);
  muzzle.scale.set(1.2, 0.72, 0.8);
  muzzle.position.set(0, 1.48, 0.41);
  otter.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), dark);
  nose.position.set(0, 1.56, 0.59);
  otter.add(nose);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.62, 4, 8), fur);
  tail.rotation.x = Math.PI / 2.5;
  tail.rotation.z = -0.35;
  tail.position.set(0, 0.45, -0.48);
  otter.add(tail);
  otter.position.set(-0.3, 0, 2.6);
  otter.scale.setScalar(0.92);
  scene.add(otter);
  return otter;
}

export default function WorldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const movementRef = useRef({ x: 0, z: 0 });
  const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });
  const [stickActive, setStickActive] = useState(false);

  function updateStick(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = rect.width * 0.34;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    movementRef.current = { x: x / radius, z: y / radius };
    setStickPosition({ x, y });
  }

  function resetStick() {
    movementRef.current = { x: 0, z: 0 };
    setStickPosition({ x: 0, y: 0 });
    setStickActive(false);
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#9cc8c3");
    scene.fog = new THREE.Fog("#9cc8c3", 20, 48);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(13, 13, 17);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = "world-canvas";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#e7f6ef", "#63715b", 2.0));
    const sun = new THREE.DirectionalLight("#fff1d1", 3.2);
    sun.position.set(-8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), material("#4c9fa5", 0.35));
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.16;
    scene.add(water);

    const island = new THREE.Mesh(new THREE.CylinderGeometry(17.5, 18.2, 0.55, 72), material("#c7b68c"));
    island.position.y = -0.02;
    island.receiveShadow = true;
    scene.add(island);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(17.0, 17.5, 0.42, 72), material("#70916a"));
    grass.position.y = 0.29;
    grass.receiveShadow = true;
    scene.add(grass);

    const roadMat = material("#b9b6a8");
    const road = new THREE.Mesh(new THREE.PlaneGeometry(15, 1.15), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.51, -1.5);
    scene.add(road);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 8), roadMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0.3, 0.515, 1.2);
    scene.add(path);
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(2.1, 48), material("#d8c8a3"));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.535, 0);
    scene.add(plaza);

    // Town hall
    const hall = new THREE.Group();
    hall.add(box(3.1, 1.9, 2.3, material("#eee4d2"), 0, 1.15, 0));
    hall.add(box(3.5, 0.2, 2.65, material("#315b58"), 0, 2.15, 0));
    hall.add(box(0.9, 1.25, 0.12, material("#8c6547"), 0, 0.65, 1.2));
    for (const x of [-1.1, -0.38, 0.38, 1.1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 1.35, 12), material("#fff7e9"));
      pillar.position.set(x, 0.82, 1.22);
      hall.add(pillar);
    }
    hall.position.set(0, 0.52, -4.4);
    scene.add(hall);

    const palettes: HousePalette[] = [
      { wall: "#f0e6d6", roof: "#a95e4d", trim: "#77513f" },
      { wall: "#d9e5dc", roof: "#405c59", trim: "#8b6b4c" },
      { wall: "#e7d9c5", roof: "#697d75", trim: "#72523d" },
      { wall: "#f4eadb", roof: "#876c59", trim: "#8d624b" },
      { wall: "#d6e1df", roof: "#385d62", trim: "#694c3a" },
    ];
    const positions: [number, number, number][] = [
      [-5.2, -3.2, 1], [-3.3, -5.1, 0.9], [4.6, -3.7, 1.05],
      [5.8, -0.9, 0.9], [-5.6, 1.2, 0.95], [-3.8, 4.2, 0.86],
      [4.0, 4.2, 0.92], [6.5, 2.8, 0.84],
    ];
    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    const homeTypes = ["starter", "family", "starter", "premium", "starter", "family", "premium", "patron"];
    positions.forEach(([x, z, scale], i) => makeHouse(houseGroup, x, z, palettes[i % palettes.length], scale, homeTypes[i % homeTypes.length]));

    let worldHomesAbort: AbortController | null = new AbortController();
    fetch("/api/city/world", { cache: "no-store", signal: worldHomesAbort.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as {
          source?: string;
          homes?: { id: string; type: string; x: number; z: number; rotation: number }[];
        };
      })
      .then((data) => {
        if (!data || data.source !== "database" || !data.homes?.length) return;
        // Replace the visual sample with the most recent persistent community homes.
        for (const child of [...houseGroup.children]) {
          houseGroup.remove(child);
          child.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              const mats = Array.isArray(object.material) ? object.material : [object.material];
              mats.forEach((entry) => entry.dispose());
            }
          });
        }
        data.homes?.forEach((home, index) => {
          const palette = home.type === "patron"
            ? { wall: "#e7dfcc", roof: "#435b59", trim: "#aa875d" }
            : home.type === "premium"
              ? { wall: "#e2e7df", roof: "#536c68", trim: "#8c755a" }
              : home.type === "family"
                ? { wall: "#eee4d4", roof: "#8b6a55", trim: "#6d5142" }
                : palettes[index % 2];
          const group = makeHouse(houseGroup, home.x * 0.25, home.z * 0.25, palette, 0.55, home.type);
          group.rotation.y = home.rotation || 0;
        });
      })
      .catch(() => {
        // Keep the procedural founding neighborhood if the city API is unavailable.
      });

    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const radius = 8.5 + Math.sin(i * 2.3) * 0.4;
      makeTree(scene, Math.cos(angle) * radius, Math.sin(angle) * radius, 0.7 + (i % 4) * 0.09);
    }
    for (const [x, z] of [[-2.5, 1.5], [2.6, 1.9], [-7, -1.5], [7.1, -4.8]] as [number, number][]) {
      makeTree(scene, x, z, 0.75);
    }

    const otter = makeOtter(scene);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let rotation = 0;
    let zoom = 1;
    let frame = 0;
    let previousTime = 0;
    const pressedKeys = new Set<string>();

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        pressedKeys.add(key);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => pressedKeys.delete(event.key.toLowerCase());
    const onBlur = () => pressedKeys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      rotation += dx * 0.006;
      camera.position.y = THREE.MathUtils.clamp(camera.position.y + dy * 0.025, 8, 20);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = () => { dragging = false; };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom + event.deltaY * 0.001, 0.72, 1.45);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const animate = (time: number) => {
      frame = window.requestAnimationFrame(animate);
      const delta = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      const keyX = (pressedKeys.has("d") || pressedKeys.has("arrowright") ? 1 : 0) - (pressedKeys.has("a") || pressedKeys.has("arrowleft") ? 1 : 0);
      const keyZ = (pressedKeys.has("s") || pressedKeys.has("arrowdown") ? 1 : 0) - (pressedKeys.has("w") || pressedKeys.has("arrowup") ? 1 : 0);
      let moveX = keyX + movementRef.current.x;
      let moveZ = keyZ + movementRef.current.z;
      const magnitude = Math.hypot(moveX, moveZ);
      if (magnitude > 1) {
        moveX /= magnitude;
        moveZ /= magnitude;
      }

      const isMoving = magnitude > 0.08;
      const speed = 3.6;
      if (isMoving) {
        otter.position.x = THREE.MathUtils.clamp(otter.position.x + moveX * speed * delta, -15.5, 15.5);
        otter.position.z = THREE.MathUtils.clamp(otter.position.z + moveZ * speed * delta, -15.5, 15.5);
        otter.rotation.y = Math.atan2(moveX, moveZ);
      } else {
        otter.rotation.y += (Math.sin(time * 0.0007) * 0.08 - otter.rotation.y) * Math.min(delta * 2, 1);
      }

      const radius = 21 / zoom;
      const cameraX = Math.sin(rotation + 0.56) * radius * 0.58;
      const cameraZ = Math.cos(rotation + 0.56) * radius * 0.68;
      camera.position.x = otter.position.x + cameraX;
      camera.position.z = otter.position.z + cameraZ;
      camera.lookAt(otter.position.x, 0.65, otter.position.z);
      otter.position.y = 0.03 + Math.sin(time * (isMoving ? 0.012 : 0.0024)) * (isMoving ? 0.075 : 0.035);
      renderer.render(scene, camera);
    };
    animate(performance.now());

    return () => {
      window.cancelAnimationFrame(frame);
      worldHomesAbort?.abort();
      worldHomesAbort = null;
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((entry) => entry.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <>
      <div className="world-canvas-host" ref={hostRef} aria-label="Interactive 3D preview of NOVARIA town" />
      <div
        className={`joystick-shell${stickActive ? " is-active" : ""}`}
        role="application"
        aria-label="Touch joystick to move the otter character"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setStickActive(true); updateStick(event); }}
        onPointerMove={(event) => { if (stickActive) updateStick(event); }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        onLostPointerCapture={resetStick}
      >
        <span className="joystick-label">MOVE</span>
        <span className="joystick-thumb" style={{ transform: `translate(calc(-50% + ${stickPosition.x}px), calc(-50% + ${stickPosition.y}px))` }} />
      </div>
      <div className="desktop-move-hint">W A S D / ARROW KEYS TO WALK</div>
    </>
  );
}