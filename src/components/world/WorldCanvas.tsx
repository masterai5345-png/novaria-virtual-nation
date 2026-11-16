"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CITIZEN_SPECIES } from "@/lib/animals";

type AvatarStyle = { furTone?: string; outfit?: string; accessory?: string };
type AnimalLook = {
  coat: string;
  belly: string;
  muzzle: string;
  ears: "point" | "round" | "long" | "floppy" | "antler" | "none";
  tail: "bushy" | "long" | "short" | "none";
  face?: "panda" | "raccoon" | "tiger" | "cow" | "frog";
  special?: "beak" | "trunk" | "mane" | "spines" | "wings";
};

const ANIMAL_LOOKS: Record<string, AnimalLook> = {
  fox: { coat: "#cf7439", belly: "#fff0d9", muzzle: "#fff0d9", ears: "point", tail: "bushy" },
  cat: { coat: "#9a9a91", belly: "#eee8db", muzzle: "#eee8db", ears: "point", tail: "long" },
  panda: { coat: "#f1eee6", belly: "#fffaf0", muzzle: "#fffaf0", ears: "round", tail: "short", face: "panda" },
  rabbit: { coat: "#e5d8c9", belly: "#fff6e9", muzzle: "#fff6e9", ears: "long", tail: "short" },
  wolf: { coat: "#87939a", belly: "#e5e8e5", muzzle: "#e5e8e5", ears: "point", tail: "long" },
  bear: { coat: "#8a6248", belly: "#d9b995", muzzle: "#d9b995", ears: "round", tail: "short" },
  raccoon: { coat: "#858783", belly: "#dedbd1", muzzle: "#dedbd1", ears: "round", tail: "bushy", face: "raccoon" },
  capybara: { coat: "#a77752", belly: "#e5c6a7", muzzle: "#d6ad88", ears: "round", tail: "short" },
  penguin: { coat: "#293b4b", belly: "#f7f2e8", muzzle: "#f7f2e8", ears: "none", tail: "short" },
  deer: { coat: "#bd9369", belly: "#f1ddbd", muzzle: "#f1ddbd", ears: "antler", tail: "short" },
  lion: { coat: "#c58b3f", belly: "#f1d9ad", muzzle: "#f1d9ad", ears: "round", tail: "long", special: "mane" },
  tiger: { coat: "#df8438", belly: "#fff0d7", muzzle: "#fff0d7", ears: "round", tail: "long", face: "tiger" },
  "red-panda": { coat: "#bd603e", belly: "#f3dfc4", muzzle: "#f3dfc4", ears: "round", tail: "bushy" },
  koala: { coat: "#92999a", belly: "#e8e4dc", muzzle: "#262b2c", ears: "round", tail: "short" },
  frog: { coat: "#79a968", belly: "#d7e5ad", muzzle: "#d7e5ad", ears: "none", tail: "none", face: "frog" },
  duck: { coat: "#e8c64f", belly: "#fff0b5", muzzle: "#e89a32", ears: "none", tail: "short", special: "beak" },
  dog: { coat: "#c5a47f", belly: "#f2e3ce", muzzle: "#f2e3ce", ears: "floppy", tail: "long" },
  cow: { coat: "#f0eee7", belly: "#fffaf2", muzzle: "#e7b9aa", ears: "round", tail: "long", face: "cow" },
  hamster: { coat: "#d5a66d", belly: "#fff0d9", muzzle: "#fff0d9", ears: "round", tail: "short" },
  hedgehog: { coat: "#a77951", belly: "#ead5b9", muzzle: "#ead5b9", ears: "round", tail: "short", special: "spines" },
  elephant: { coat: "#929fa2", belly: "#dce2df", muzzle: "#697a7e", ears: "round", tail: "short", special: "trunk" },
  monkey: { coat: "#966441", belly: "#e6c7a2", muzzle: "#e6c7a2", ears: "round", tail: "long" },
  sloth: { coat: "#9a8668", belly: "#e2d2b4", muzzle: "#e2d2b4", ears: "round", tail: "short" },
  owl: { coat: "#987456", belly: "#ead8bd", muzzle: "#e8bb55", ears: "none", tail: "short", special: "wings" },
  horse: { coat: "#9c6344", belly: "#e7c6a4", muzzle: "#e7c6a4", ears: "point", tail: "long" },
  squirrel: { coat: "#c77b43", belly: "#f2dfc6", muzzle: "#f2dfc6", ears: "point", tail: "bushy" },
  beaver: { coat: "#916344", belly: "#dfc19e", muzzle: "#dfc19e", ears: "round", tail: "short" },
  otter: { coat: "#8d654b", belly: "#e8d7bf", muzzle: "#e8d7bf", ears: "round", tail: "long" },
};

const OUTFIT_COLORS: Record<string, string> = {
  "citizen-teal": "#1c6263",
  explorer: "#65794c",
  builder: "#d18a3e",
  "harbor-guard": "#314c70",
};
const COAT_COLORS: Record<string, string> = {
  "river-brown": "#8d654b",
  "warm-cocoa": "#684633",
  silver: "#a7aaa6",
  honey: "#bd8b50",
};

const sharedMaterialCache = new Map<string, THREE.Material>();
const sharedGeometryCache = new Map<string, THREE.BufferGeometry>();
const sharedMaterials = new WeakSet<THREE.Material>();
const sharedGeometries = new WeakSet<THREE.BufferGeometry>();
let sharedSceneReferences = 0;

function acquireSharedSceneResources() {
  sharedSceneReferences++;
}

function releaseSharedSceneResources() {
  sharedSceneReferences = Math.max(0, sharedSceneReferences - 1);
  if (sharedSceneReferences > 0) return;
  for (const material of sharedMaterialCache.values()) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) value.dispose();
    }
    material.dispose();
  }
  for (const geometry of sharedGeometryCache.values()) geometry.dispose();
  sharedMaterialCache.clear();
  sharedGeometryCache.clear();
  sharedFurNoiseTexture?.dispose();
  sharedFurNoiseTexture = null;
  sharedFabricTexture?.dispose();
  sharedFabricTexture = null;
  sharedBarkTexture?.dispose();
  sharedBarkTexture = null;
}

function cachedMaterial<T extends THREE.Material>(key: string, create: () => T): T {
  const existing = sharedMaterialCache.get(key);
  if (existing) return existing as T;
  const material = create();
  sharedMaterials.add(material);
  sharedMaterialCache.set(key, material);
  return material;
}

function cachedGeometry<T extends THREE.BufferGeometry>(key: string, create: () => T): T {
  const existing = sharedGeometryCache.get(key);
  if (existing) return existing as T;
  const geometry = create();
  sharedGeometries.add(geometry);
  sharedGeometryCache.set(key, geometry);
  return geometry;
}

function unitBoxGeometry() {
  const key = "unit-box";
  let geometry = sharedGeometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(1, 1, 1);
    sharedGeometries.add(geometry);
    sharedGeometryCache.set(key, geometry);
  }
  return geometry;
}

function unitSphereGeometry() {
  const key = "unit-sphere-18-14";
  let geometry = sharedGeometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.SphereGeometry(1, 18, 14);
    sharedGeometries.add(geometry);
    sharedGeometryCache.set(key, geometry);
  }
  return geometry;
}

function mat(color: string, roughness = 0.82, metalness = 0.02) {
  const key = `standard:${color}:${roughness}:${metalness}`;
  return cachedMaterial(key, () => new THREE.MeshStandardMaterial({ color, roughness, metalness }));
}

function addBox(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow = false,
) {
  const mesh = new THREE.Mesh(unitBoxGeometry(), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(
  parent: THREE.Object3D,
  radius: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  scaleX = 1,
  scaleY = 1,
  scaleZ = 1,
) {
  const mesh = new THREE.Mesh(unitSphereGeometry(), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(radius * scaleX, radius * scaleY, radius * scaleZ);
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}


function addInstancedBoxes(
  parent: THREE.Object3D,
  material: THREE.Material,
  transforms: { position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number] }[],
  castShadow = false,
) {
  if (!transforms.length) return null;
  const instances = new THREE.InstancedMesh(unitBoxGeometry(), material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(...transform.position);
    dummy.scale.set(...transform.scale);
    if (transform.rotation) dummy.rotation.set(...transform.rotation);
    else dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    instances.setMatrixAt(index, dummy.matrix);
  });
  instances.instanceMatrix.needsUpdate = true;
  instances.castShadow = castShadow;
  instances.receiveShadow = true;
  parent.add(instances);
  return instances;
}


function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (!sharedGeometries.has(object.geometry)) object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((entry) => {
          if (!sharedMaterials.has(entry)) entry.dispose();
        });
      }
    });
  }
}

function addTube(
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, radius, 7, false), material);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

let sharedFurNoiseTexture: THREE.Texture | null = null;
let sharedFabricTexture: THREE.Texture | null = null;
let sharedBarkTexture: THREE.Texture | null = null;

function getFabricWeaveTexture() {
  if (sharedFabricTexture) return sharedFabricTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#e8e5dd";
  context.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    context.fillStyle = y % 8 === 0 ? "rgba(45,51,53,.07)" : "rgba(255,255,255,.12)";
    context.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 4) {
    context.fillStyle = x % 8 === 0 ? "rgba(45,51,53,.055)" : "rgba(255,255,255,.10)";
    context.fillRect(x, 0, 1, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  sharedFabricTexture = texture;
  return texture;
}

function getBarkTexture() {
  if (sharedBarkTexture) return sharedBarkTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#8a674b";
  context.fillRect(0, 0, 128, 256);
  let seed = 8147;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let index = 0; index < 90; index++) {
    const x = random() * 128;
    context.strokeStyle = random() > 0.5 ? "rgba(45,31,22,.28)" : "rgba(223,188,139,.18)";
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + (random() - .5) * 16, 72, x + (random() - .5) * 14, 180, x + (random() - .5) * 12, 256);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  sharedBarkTexture = texture;
  return texture;
}

function createBarkMaterial() {
  return cachedMaterial("reference-bark", () => {
    const texture = getBarkTexture();
    return new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: texture ?? null,
      bumpMap: texture ?? null,
      bumpScale: texture ? 0.035 : 0,
      roughness: 0.96,
      metalness: 0,
    });
  });
}

function getFurNoiseTexture() {
  if (sharedFurNoiseTexture) return sharedFurNoiseTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#858585";
  context.fillRect(0, 0, 256, 256);
  let seed = 7411;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let index = 0; index < 5200; index++) {
    const brightness = Math.floor(90 + random() * 90);
    context.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    context.fillRect(random() * 256, random() * 256, 0.7 + random() * 1.6, 0.7 + random() * 2.2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1.8);
  texture.anisotropy = 4;
  sharedFurNoiseTexture = texture;
  return texture;
}

function createFurMaterial(color: string) {
  return cachedMaterial(`fur:${color}`, () => {
    const bumpMap = getFurNoiseTexture();
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.93,
      metalness: 0,
      sheen: 0.42,
      sheenColor: new THREE.Color(color).multiplyScalar(1.12),
      sheenRoughness: 0.92,
      bumpMap: bumpMap ?? null,
      bumpScale: bumpMap ? 0.026 : 0,
    });
  });
}

function createMascot(group: THREE.Group, speciesName: string, style: AvatarStyle = {}, outfitOverride?: string, detail: "full" | "crowd" = "full") {
  clearGroup(group);
  const species = ANIMAL_LOOKS[speciesName] ? speciesName : "fox";
  const look = ANIMAL_LOOKS[species];
  const coatColor = COAT_COLORS[style.furTone ?? ""] ?? look.coat;
  const coat = createFurMaterial(coatColor);
  const belly = createFurMaterial(look.belly);
  const muzzle = createFurMaterial(look.muzzle);
  const dark = mat("#26242b", 0.3, 0.02);
  const noseMaterial = cachedMaterial("mascot-nose", () => new THREE.MeshPhysicalMaterial({
    color: "#30252a", roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08,
  }));
  const eyeWhite = cachedMaterial("mascot-eye-white-film", () => new THREE.MeshPhysicalMaterial({
    color: "#fffaf2", roughness: 0.13, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.035,
  }));
  const iris = cachedMaterial("mascot-iris-film:" + species, () => new THREE.MeshPhysicalMaterial({
    color: species === "frog" ? "#78a94e" : species === "wolf" || species === "cat" ? "#6ea5b4" : "#69452d",
    roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04,
  }));
  const pupil = cachedMaterial("mascot-pupil-film", () => new THREE.MeshPhysicalMaterial({
    color: "#151820", roughness: 0.09, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.025,
  }));
  const mouth = mat("#3d2024", 0.58, 0);
  const tongue = mat("#dc777d", 0.48, 0);
  const teeth = mat("#fff7e8", 0.24, 0);
  const shoe = cachedMaterial("mascot-shoe-leather", () => new THREE.MeshPhysicalMaterial({
    color: "#343944", roughness: 0.46, metalness: 0.04, clearcoat: 0.38, clearcoatRoughness: 0.3,
  }));
  const sole = mat("#e4dfd2", 0.82, 0);
  const accent = mat("#e9c27f", 0.36, 0.22);
  const outfitColor = outfitOverride ?? OUTFIT_COLORS[style.outfit ?? "citizen-teal"] ?? OUTFIT_COLORS["citizen-teal"];
  const outfit = cachedMaterial("mascot-tailored-fabric:" + outfitColor, () => {
    const fabric = getFabricWeaveTexture();
    return new THREE.MeshPhysicalMaterial({
      color: outfitColor,
      map: fabric ?? null,
      bumpMap: fabric ?? null,
      bumpScale: fabric ? 0.018 : 0,
      roughness: 0.82,
      metalness: 0,
      sheen: 0.28,
      sheenColor: new THREE.Color(outfitColor).multiplyScalar(1.08),
      sheenRoughness: 0.92,
      clearcoat: 0.1,
    });
  });

  const smoothSphere = cachedGeometry("mascot-film-sphere-28", () => new THREE.SphereGeometry(1, 28, 20));
  const animatedArms: THREE.Object3D[] = [];
  const animatedLegs: THREE.Object3D[] = [];
  const animatedEars: THREE.Object3D[] = [];
  const sphere = (parent: THREE.Object3D, radius: number, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(smoothSphere, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(radius * sx, radius * sy, radius * sz);
    mesh.castShadow = detail === "full";
    mesh.receiveShadow = detail === "full";
    parent.add(mesh);
    return mesh;
  };
  const capsule = (parent: THREE.Object3D, key: string, radius: number, length: number, material: THREE.Material, x: number, y: number, z: number) => {
    const geometry = cachedGeometry(key + ":" + radius + ":" + length, () => new THREE.CapsuleGeometry(radius, length, 5, 12));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = detail === "full";
    mesh.receiveShadow = detail === "full";
    parent.add(mesh);
    return mesh;
  };
  const bodyRig = new THREE.Group();
  bodyRig.position.set(0, 0.32, 0);
  group.add(bodyRig);
  const headRig = new THREE.Group();
  headRig.position.set(0, 1.47, 0.035);
  group.add(headRig);

  // Soft pear-shaped body gives every species a friendly, believable centre of mass.
  sphere(bodyRig, 0.43, coat, 0, 0.48, 0, 0.92, 1.18, 0.86);
  sphere(bodyRig, 0.39, outfit, 0, 0.49, 0.055, 1.02, 1.02, 0.9);
  sphere(bodyRig, 0.235, belly, 0, 0.43, 0.365, 0.93, 1.08, 0.31);

  // A soft collar, front placket and pocket panels make outfits look tailored instead of painted on.
  const collar = new THREE.Mesh(cachedGeometry("mascot-collar-ring", () => new THREE.TorusGeometry(0.255, 0.052, 8, 28)), outfit);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.88, 0.055);
  bodyRig.add(collar);
  if (detail === "full") {
    addTube(bodyRig, [
      new THREE.Vector3(0, 0.86, 0.39),
      new THREE.Vector3(0, 0.62, 0.405),
      new THREE.Vector3(0, 0.32, 0.35),
    ], 0.012, accent);
    for (const side of [-1, 1]) {
      addBox(bodyRig, 0.2, 0.13, 0.025, mat(outfitOverride ? "#d4bc91" : "#f3e8d6", 0.82), side * 0.2, 0.44, 0.39, false);
      addBox(bodyRig, 0.21, 0.018, 0.025, accent, side * 0.2, 0.515, 0.405, false);
      sphere(bodyRig, 0.026, accent, side * 0.095, 0.68, 0.405, 1, 1, 0.55);
      sphere(bodyRig, 0.026, accent, side * 0.095, 0.51, 0.405, 1, 1, 0.55);
    }
  }

  // Legs are attached to proper hip pivots so they can swing naturally while walking.
  for (const side of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.155, 0.24, 0.015);
    bodyRig.add(legPivot);
    capsule(legPivot, "mascot-film-trouser", 0.105, 0.22, coat, 0, -0.12, 0);
    const sock = capsule(legPivot, "mascot-film-sock", 0.092, 0.1, mat("#f3e7d2", 0.9), 0, -0.245, 0.025);
    sock.castShadow = false;
    sphere(legPivot, 0.145, shoe, 0, -0.31, 0.115, 1.25, 0.62, 1.6);
    addBox(legPivot, 0.26, 0.045, 0.34, sole, 0, -0.39, 0.14, false);
    if (detail === "full") {
      addTube(legPivot, [
        new THREE.Vector3(-0.055, -0.29, 0.23),
        new THREE.Vector3(0, -0.26, 0.245),
        new THREE.Vector3(0.055, -0.29, 0.23),
      ], 0.009, teeth);
    }
    animatedLegs.push(legPivot);
  }

  // Shoulder pivots give the sleeves, forearms and hands a more natural range of motion.
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.355, 0.79, 0.015);
    bodyRig.add(armPivot);
    const sleeve = capsule(armPivot, "mascot-film-sleeve", 0.125, 0.22, outfit, 0, -0.13, 0);
    sleeve.rotation.z = side * -0.1;
    const forearm = capsule(armPivot, "mascot-film-forearm", 0.092, 0.19, coat, side * 0.015, -0.34, 0.025);
    forearm.rotation.z = side * 0.08;
    sphere(armPivot, 0.105, coat, side * 0.02, -0.47, 0.06, 1.04, 0.95, 0.9);
    if (detail === "full") {
      const cuff = new THREE.Mesh(cachedGeometry("mascot-cuff-ring-film", () => new THREE.TorusGeometry(0.091, 0.014, 6, 16)), accent);
      cuff.position.set(side * 0.015, -0.255, 0.025);
      cuff.rotation.z = Math.PI / 2;
      armPivot.add(cuff);
    }
    animatedArms.push(armPivot);
  }

  // A softly rounded tail is visible behind the silhouette and remains species-specific.
  const tailRig = new THREE.Group();
  tailRig.position.set(0, 0.44, -0.34);
  bodyRig.add(tailRig);
  if (look.tail === "bushy") {
    sphere(tailRig, 0.29, coat, 0, 0.02, -0.2, 1.05, 0.95, 1.42);
    sphere(tailRig, 0.19, belly, 0, 0.025, -0.43, 1.02, 0.95, 0.88);
  } else if (look.tail === "long") {
    const tail = capsule(tailRig, "mascot-film-tail", 0.085, 0.52, coat, 0, 0.02, -0.3);
    tail.rotation.x = -Math.PI / 2;
    sphere(tailRig, 0.085, coat, 0, 0.02, -0.66, 1, 1, 1.1);
  } else if (look.tail === "short") {
    sphere(tailRig, 0.115, coat, 0, 0, -0.12, 1, 0.9, 1);
  }

  // The head is modelled as a layered sculpted silhouette with cheek volume and a clear muzzle.
  if (look.special === "mane") {
    const mane = mat("#ad7136", 0.94, 0);
    sphere(headRig, 0.69, mane, 0, -0.005, -0.085, 1.14, 1.12, 0.9);
    if (detail === "full") {
      for (let tuft = 0; tuft < 12; tuft++) {
        const angle = (tuft / 12) * Math.PI * 2;
        sphere(headRig, 0.16, mane, Math.cos(angle) * 0.52, Math.sin(angle) * 0.48, -0.045, 0.94, 1.04, 0.9);
      }
    }
  }
  sphere(headRig, 0.59, coat, 0, 0, 0.04, 1.02, 1, 0.92);

  // Ears are separate articulated pieces: pointed, floppy, round or long depending on species.
  for (const side of [-1, 1]) {
    if (look.ears === "point") {
      const earPivot = new THREE.Group();
      earPivot.position.set(side * 0.34, 0.36, -0.035);
      headRig.add(earPivot);
      const ear = new THREE.Mesh(cachedGeometry("mascot-film-point-ear", () => new THREE.ConeGeometry(0.17, 0.46, 16)), coat);
      ear.position.y = 0.12;
      ear.rotation.z = side * -0.16;
      ear.castShadow = detail === "full";
      earPivot.add(ear);
      sphere(earPivot, 0.075, muzzle, 0, 0.12, 0.12, 0.88, 1.2, 0.42);
      animatedEars.push(earPivot);
    } else if (look.ears === "long") {
      const earPivot = new THREE.Group();
      earPivot.position.set(side * 0.22, 0.36, -0.025);
      headRig.add(earPivot);
      const ear = capsule(earPivot, "mascot-film-long-ear", 0.105, 0.47, coat, 0, 0.28, 0);
      ear.rotation.z = side * -0.1;
      const inner = capsule(earPivot, "mascot-film-long-ear-inner", 0.055, 0.35, muzzle, 0, 0.29, 0.067);
      inner.rotation.z = side * -0.1;
      animatedEars.push(earPivot);
    } else if (look.ears === "floppy") {
      const earPivot = new THREE.Group();
      earPivot.position.set(side * 0.42, 0.2, -0.015);
      headRig.add(earPivot);
      const ear = capsule(earPivot, "mascot-film-floppy-ear", 0.115, 0.3, coat, side * 0.11, -0.1, 0);
      ear.rotation.z = side * -0.62;
      sphere(earPivot, 0.095, muzzle, side * 0.2, -0.18, 0.04, 0.9, 0.78, 0.5);
      animatedEars.push(earPivot);
    } else if (look.ears === "round" || look.ears === "antler") {
      const earPivot = new THREE.Group();
      earPivot.position.set(side * 0.4, 0.3, -0.025);
      headRig.add(earPivot);
      sphere(earPivot, 0.18, coat, 0, 0.05, 0, 1.08, 1, 0.7);
      sphere(earPivot, 0.09, muzzle, 0, 0.05, 0.115, 1, 1, 0.34);
      animatedEars.push(earPivot);
    }
  }

  if (look.ears === "antler") {
    for (const side of [-1, 1]) {
      const antler = new THREE.Group();
      antler.position.set(side * 0.22, 0.48, -0.055);
      headRig.add(antler);
      const stem = new THREE.Mesh(cachedGeometry("mascot-antler-film", () => new THREE.CylinderGeometry(0.028, 0.045, 0.42, 10)), accent);
      stem.position.y = 0.17;
      stem.rotation.z = side * 0.25;
      antler.add(stem);
      const tine = new THREE.Mesh(cachedGeometry("mascot-antler-tine-film", () => new THREE.CylinderGeometry(0.018, 0.028, 0.22, 8)), accent);
      tine.position.set(side * 0.1, 0.35, 0);
      tine.rotation.z = side * -0.52;
      antler.add(tine);
    }
  }
  if (look.face === "frog") {
    for (const side of [-1, 1]) sphere(headRig, 0.19, coat, side * 0.23, 0.34, 0.22, 1, 1, 0.95);
  }
  if (look.special === "trunk") {
    sphere(headRig, 0.24, coat, -0.39, -0.06, -0.005, 1, 1.1, 0.56);
    sphere(headRig, 0.24, coat, 0.39, -0.06, -0.005, 1, 1.1, 0.56);
    addTube(headRig, [
      new THREE.Vector3(0, -0.12, 0.51),
      new THREE.Vector3(0, -0.31, 0.64),
      new THREE.Vector3(0.02, -0.48, 0.61),
      new THREE.Vector3(0.08, -0.52, 0.48),
    ], 0.105, coat);
  }
  if (look.special === "wings") {
    for (const side of [-1, 1]) {
      sphere(bodyRig, 0.24, coat, side * 0.43, 0.46, -0.13, 0.62, 1.12, 0.5);
      if (detail === "full") {
        for (let feather = 0; feather < 3; feather++) {
          sphere(bodyRig, 0.1, belly, side * (0.45 + feather * 0.035), 0.31 - feather * 0.1, -0.12, 0.75, 0.95, 0.48);
        }
      }
    }
  }
  if (look.special === "spines") {
    for (let index = 0; index < 9; index++) {
      const x = (index - 4) * 0.095;
      const spine = new THREE.Mesh(cachedGeometry("mascot-film-spine", () => new THREE.ConeGeometry(0.06, 0.22, 9)), mat("#775139", 0.9));
      spine.position.set(x, 0.43 + (index % 2) * 0.035, -0.12);
      spine.rotation.z = x * 0.35;
      bodyRig.add(spine);
    }
  }

  // Eyes use layered glossy geometry and large catchlights, giving the face an expressive animated-film look.
  const eyeY = look.face === "frog" ? 0.35 : 0.13;
  const eyeZ = look.face === "frog" ? 0.34 : 0.48;
  for (const side of [-1, 1]) {
    if (look.face === "panda") sphere(headRig, 0.16, dark, side * 0.22, eyeY, eyeZ - 0.005, 1.15, 1.25, 0.5);
    if (look.face === "raccoon") sphere(headRig, 0.16, dark, side * 0.22, eyeY, eyeZ - 0.005, 1.28, 0.9, 0.48);
    sphere(headRig, 0.118, eyeWhite, side * 0.205, eyeY, eyeZ, 1, 1.06, 0.66);
    sphere(headRig, 0.078, iris, side * 0.205, eyeY - 0.005, eyeZ + 0.072, 1, 1.08, 0.68);
    sphere(headRig, 0.046, pupil, side * 0.205, eyeY - 0.008, eyeZ + 0.11, 1, 1.08, 0.65);
    sphere(headRig, 0.027, eyeWhite, side * 0.17, eyeY + 0.035, eyeZ + 0.16, 1, 1, 0.55);
    sphere(headRig, 0.012, eyeWhite, side * 0.238, eyeY - 0.028, eyeZ + 0.155, 1, 1, 0.55);
    if (detail === "full") {
      addTube(headRig, [
        new THREE.Vector3(side * 0.34, eyeY + 0.17, eyeZ - 0.045),
        new THREE.Vector3(side * 0.22, eyeY + 0.205, eyeZ + 0.02),
        new THREE.Vector3(side * 0.1, eyeY + 0.17, eyeZ - 0.035),
      ], 0.022, coat);
    }
  }

  // Cheeks, muzzle pads and nose soften the face; the open smile prevents the old blank, rigid expression.
  sphere(headRig, 0.15, muzzle, -0.14, -0.17, 0.48, 1.1, 0.88, 0.7);
  sphere(headRig, 0.15, muzzle, 0.14, -0.17, 0.48, 1.1, 0.88, 0.7);
  sphere(headRig, 0.075, noseMaterial, 0, -0.115, 0.595, 1.15, 0.82, 0.7);
  if (look.special === "beak") {
    sphere(headRig, 0.16, mat("#e9a43a", 0.43, 0.02), 0, -0.19, 0.59, 1.36, 0.62, 0.95);
    sphere(headRig, 0.09, mat("#f4bd50", 0.52), 0, -0.28, 0.58, 1.24, 0.38, 0.75);
  } else if (look.special !== "trunk") {
    sphere(headRig, 0.125, mouth, 0, -0.31, 0.5, 0.95, 0.66, 0.45);
    sphere(headRig, 0.07, tongue, 0, -0.36, 0.535, 0.95, 0.4, 0.55);
    sphere(headRig, 0.045, teeth, -0.045, -0.255, 0.55, 0.72, 0.45, 0.42);
    sphere(headRig, 0.045, teeth, 0.045, -0.255, 0.55, 0.72, 0.45, 0.42);
    const smile = new THREE.Mesh(
      cachedGeometry("mascot-film-smile", () => new THREE.TorusGeometry(0.13, 0.014, 6, 22, Math.PI)),
      dark,
    );
    smile.position.set(0, -0.29, 0.57);
    smile.rotation.z = Math.PI;
    headRig.add(smile);
  }

  // Species patterns remain recognisable and are sculpted into the coat rather than floating stickers.
  if (look.face === "tiger") {
    for (const side of [-1, 1]) {
      for (let stripe = 0; stripe < 3; stripe++) {
        const mark = addBox(headRig, 0.045, 0.16, 0.028, mat("#3c2a22", 0.95), side * (0.36 + stripe * 0.055), 0.37 - stripe * 0.11, 0.4, false);
        mark.rotation.z = side * (0.22 + stripe * 0.05);
      }
    }
  }
  if (look.face === "cow") {
    sphere(headRig, 0.13, dark, -0.34, 0.27, -0.08, 1.1, 1.35, 0.42);
    sphere(headRig, 0.11, dark, 0.34, -0.19, -0.07, 1.1, 0.92, 0.42);
    sphere(headRig, 0.085, mat("#e9a8a5", 0.62), 0, -0.25, 0.53, 1.4, 0.72, 0.55);
  }
  if (look.face === "raccoon") {
    for (const side of [-1, 1]) {
      const mask = sphere(headRig, 0.15, mat("#4c4b47", 0.95), side * 0.25, 0.14, 0.455, 1.24, 0.78, 0.33);
      mask.rotation.z = side * 0.12;
    }
  }

  // Tailored accessories have real volume and sit on the body instead of floating on the silhouette.
  if (style.accessory === "cap") {
    sphere(headRig, 0.26, accent, 0, 0.48, 0.02, 1.18, 0.38, 0.98);
    const brim = new THREE.Mesh(cachedGeometry("mascot-cap-brim", () => new THREE.CylinderGeometry(0.23, 0.27, 0.055, 24)), accent);
    brim.scale.set(1.15, 1, 0.68);
    brim.position.set(0, 0.43, 0.15);
    headRig.add(brim);
    sphere(headRig, 0.045, teeth, 0, 0.63, 0.03, 1, 0.45, 0.75);
  } else if (style.accessory === "scarf") {
    const scarf = new THREE.Mesh(cachedGeometry("mascot-scarf-ring", () => new THREE.TorusGeometry(0.28, 0.075, 8, 28)), accent);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 0.93, 0.04);
    bodyRig.add(scarf);
    addBox(bodyRig, 0.12, 0.34, 0.075, accent, 0.17, 0.71, 0.34, false);
    addBox(bodyRig, 0.13, 0.07, 0.08, mat("#f5e4c6", 0.8), 0.17, 0.58, 0.35, false);
  } else if (style.accessory === "backpack") {
    const pack = new THREE.Group();
    pack.position.set(0, 0.52, -0.34);
    bodyRig.add(pack);
    sphere(pack, 0.25, mat("#8c6547", 0.78), 0, 0.04, 0, 1.1, 1.25, 0.55);
    addBox(pack, 0.31, 0.08, 0.035, accent, 0, 0.23, 0.13, false);
    for (const side of [-1, 1]) capsule(pack, "mascot-backpack-strap", 0.035, 0.28, accent, side * 0.22, 0.05, 0.12);
  }

  group.userData.species = species;
  group.userData.coatMaterial = coat;
  group.userData.outfitMaterial = outfit;
  group.userData.animatedArms = animatedArms;
  group.userData.animatedLegs = animatedLegs;
  group.userData.animatedEars = animatedEars;
  group.userData.headRig = headRig;
  group.userData.bodyRig = bodyRig;
  group.userData.tailRig = tailRig;
}
function makeTree(scene: THREE.Scene, x: number, z: number, size = 1) {
  const placements = (scene.userData.treePlacements ??= []) as { x: number; z: number; size: number }[];
  placements.push({ x, z, size });
}

function createTreeForest(scene: THREE.Scene) {
  const placements = (scene.userData.treePlacements ?? []) as { x: number; z: number; size: number }[];
  if (!placements.length) return;
  const dummy = new THREE.Object3D();

  const trunkMaterial = createBarkMaterial();
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.19, 1, 10), trunkMaterial, placements.length);
  placements.forEach((tree, index) => {
    dummy.position.set(tree.x, 0.4 + tree.size * 0.5, tree.z);
    dummy.scale.set(tree.size, tree.size, tree.size);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunk.setMatrixAt(index, dummy.matrix);
  });
  trunk.instanceMatrix.needsUpdate = true;
  trunk.castShadow = false;
  trunk.receiveShadow = true;
  scene.add(trunk);

  const branchGeometry = new THREE.CylinderGeometry(0.055, 0.075, 0.68, 7);
  const branch = new THREE.InstancedMesh(branchGeometry, mat("#886547", 0.96), placements.length * 2);
  let branchIndex = 0;
  placements.forEach((tree) => {
    for (const side of [-1, 1]) {
      dummy.position.set(tree.x + side * 0.22 * tree.size, 0.4 + 0.84 * tree.size, tree.z);
      dummy.scale.set(tree.size, tree.size, tree.size);
      dummy.rotation.set(0, 0, side * -0.7);
      dummy.updateMatrix();
      branch.setMatrixAt(branchIndex++, dummy.matrix);
    }
  });
  branch.instanceMatrix.needsUpdate = true;
  branch.castShadow = false;
  scene.add(branch);

  const foliageMaterial = cachedMaterial("instanced-tree-foliage", () => new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.9,
    metalness: 0,
    sheen: 0.28,
    sheenColor: new THREE.Color("#b9d8a0"),
    sheenRoughness: 0.96,
    bumpMap: getFurNoiseTexture(),
    bumpScale: 0.008,
  }));
  const foliage = new THREE.InstancedMesh(
    cachedGeometry("reference-tree-crown", () => new THREE.SphereGeometry(1, 16, 12)),
    foliageMaterial,
    placements.length * 5,
  );
  const colorOptions = ["#4f9961", "#61a96d", "#3f8855", "#79b77b"].map((color) => new THREE.Color(color));
  const clusters: [number, number, number, number, number, number][] = [
    [-0.34, 1.28, 0.02, 0.55, 0.52, 0.52],
    [0.34, 1.3, -0.04, 0.56, 0.52, 0.54],
    [-0.08, 1.72, -0.08, 0.54, 0.53, 0.52],
    [0.27, 1.65, 0.16, 0.5, 0.48, 0.5],
    [0.0, 2.02, 0.0, 0.46, 0.44, 0.46],
  ];
  let leafIndex = 0;
  placements.forEach((tree, treeIndex) => {
    clusters.forEach(([cx, cy, cz, sx, sy, sz], index) => {
      dummy.position.set(tree.x + cx * tree.size, 0.4 + cy * tree.size, tree.z + cz * tree.size);
      dummy.scale.set(sx * 0.9 * tree.size, sy * 0.9 * tree.size, sz * 0.9 * tree.size);
      dummy.rotation.set(index * 0.23, index * 0.41 + treeIndex * 0.17, index * 0.17);
      dummy.updateMatrix();
      foliage.setMatrixAt(leafIndex, dummy.matrix);
      foliage.setColorAt(leafIndex, colorOptions[(treeIndex + index) % colorOptions.length]);
      leafIndex++;
    });
  });
  foliage.instanceMatrix.needsUpdate = true;
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  foliage.castShadow = false;
  foliage.receiveShadow = true;
  scene.add(foliage);
  placements.length = 0;
}
function makePalmTree(scene: THREE.Scene, x: number, z: number, size = 1) {
  const placements = (scene.userData.palmPlacements ??= []) as { x: number; z: number; size: number }[];
  placements.push({ x, z, size });
}

function createPalmForest(scene: THREE.Scene) {
  const placements = (scene.userData.palmPlacements ?? []) as { x: number; z: number; size: number }[];
  if (!placements.length) return;
  const dummy = new THREE.Object3D();
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.1, 0.17, 2.2, 12),
    createBarkMaterial(),
    placements.length,
  );
  placements.forEach((tree, index) => {
    dummy.position.set(tree.x, 1.5 * tree.size, tree.z);
    dummy.scale.set(tree.size, tree.size, tree.size);
    dummy.rotation.set(0, 0, -0.06);
    dummy.updateMatrix();
    trunks.setMatrixAt(index, dummy.matrix);
  });
  trunks.instanceMatrix.needsUpdate = true;
  trunks.castShadow = false;
  scene.add(trunks);

  const frondMaterial = cachedMaterial("palm-frond", () => new THREE.MeshStandardMaterial({ color: "#4b8b60", roughness: 0.98, side: THREE.DoubleSide }));
  const frondGeometry = new THREE.ConeGeometry(0.2, 1.7, 7, 2);
  const fronds = new THREE.InstancedMesh(frondGeometry, frondMaterial, placements.length * 8);
  let index = 0;
  placements.forEach((tree, treeIndex) => {
    for (let leaf = 0; leaf < 8; leaf++) {
      const angle = (leaf / 8) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), -0.42, Math.sin(angle)).normalize();
      dummy.position.set(
        tree.x + direction.x * 0.72 * tree.size,
        0.4 + (2.15 - 0.25) * tree.size,
        tree.z + direction.z * 0.72 * tree.size,
      );
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      dummy.rotateY(treeIndex * 0.17);
      dummy.scale.set(tree.size * (0.9 + (leaf % 3) * 0.06), tree.size, tree.size * 0.7);
      dummy.updateMatrix();
      fronds.setMatrixAt(index, dummy.matrix);
      fronds.setColorAt(index, new THREE.Color(["#397956", "#4b9065", "#2f694b", "#65966b"][(treeIndex + leaf) % 4]));
      index++;
    }
  });
  fronds.instanceMatrix.needsUpdate = true;
  if (fronds.instanceColor) fronds.instanceColor.needsUpdate = true;
  fronds.castShadow = false;
  scene.add(fronds);
  placements.length = 0;
}
function makeHedge(scene: THREE.Scene, x: number, z: number, width = 1.4, depth = 0.55) {
  const placements = (scene.userData.hedgePlacements ??= []) as { x: number; z: number; width: number; depth: number }[];
  placements.push({ x, z, width, depth });
}

function createHedgeBatch(scene: THREE.Scene) {
  const placements = (scene.userData.hedgePlacements ?? []) as { x: number; z: number; width: number; depth: number }[];
  if (!placements.length) return;
  const dummy = new THREE.Object3D();
  const soil = new THREE.InstancedMesh(unitBoxGeometry(), mat("#685540", 1), placements.length);
  placements.forEach((item, index) => {
    dummy.position.set(item.x, 0.47, item.z);
    dummy.scale.set(item.width + 0.18, 0.14, item.depth + 0.18);
    dummy.updateMatrix();
    soil.setMatrixAt(index, dummy.matrix);
  });
  soil.instanceMatrix.needsUpdate = true;
  scene.add(soil);
  const total = placements.reduce((sum, item) => sum + Math.max(3, Math.floor(item.width * 4)), 0);
  const foliage = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.23, 1),
    cachedMaterial("hedge-leaves", () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.99 })),
    total,
  );
  let index = 0;
  placements.forEach((item, hedgeIndex) => {
    const count = Math.max(3, Math.floor(item.width * 4));
    for (let plant = 0; plant < count; plant++) {
      dummy.position.set(
        item.x - item.width / 2 + 0.15 + plant * (item.width - 0.3) / Math.max(1, count - 1),
        0.7 + (plant % 3) * 0.035,
        item.z + Math.sin(plant * 2) * 0.12,
      );
      dummy.scale.set(1.15, 0.82, 1.0);
      dummy.rotation.set(0, (plant + hedgeIndex) * 0.24, 0);
      dummy.updateMatrix();
      foliage.setMatrixAt(index, dummy.matrix);
      foliage.setColorAt(index, new THREE.Color((plant + hedgeIndex) % 2 ? "#44784f" : "#57885b"));
      index++;
    }
  });
  foliage.instanceMatrix.needsUpdate = true;
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  scene.add(foliage);
  placements.length = 0;
}

function createFacadeMaterial(baseColor: string, seed: number, rounded = false) {
  return cachedMaterial(`facade:${seed % 5}:${rounded}`, () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return mat(baseColor, 0.3, 0.55);

  const palette = ["#36505c", "#48616d", "#637a82", "#8c8c83", "#5d7077"];
  const base = palette[seed % palette.length];
  context.fillStyle = base;
  context.fillRect(0, 0, 512, 512);
  const columns = rounded ? 9 : 8;
  const rows = 22;
  const cellW = 512 / columns;
  const cellH = 512 / rows;

  for (let row = 0; row < rows; row++) {
    const floorY = row * cellH;
    context.fillStyle = row % 4 === 0 ? "rgba(18,31,37,.56)" : "rgba(20,33,39,.35)";
    context.fillRect(0, floorY, 512, 4);
    for (let column = 0; column < columns; column++) {
      const x = column * cellW;
      const lit = ((row * 17 + column * 29 + seed * 13) % 11) < 3;
      const tone = lit ? "#e4d6ad" : (row + column) % 3 === 0 ? "#9bb7ba" : "#52717c";
      const gradient = context.createLinearGradient(x, floorY + 4, x + cellW, floorY + cellH - 4);
      gradient.addColorStop(0, lit ? "#f4e5c3" : "#7997a0");
      gradient.addColorStop(0.22, tone);
      gradient.addColorStop(1, lit ? "#c3b18a" : "#294550");
      context.fillStyle = gradient;
      context.fillRect(x + 7, floorY + 5, cellW - 14, Math.max(5, cellH - 9));
      context.fillStyle = "rgba(229,241,235,.28)";
      context.fillRect(x + 9, floorY + 6, Math.max(1, cellW * 0.025), Math.max(4, cellH - 11));
      context.fillStyle = "rgba(14,28,34,.5)";
      context.fillRect(x + cellW - 9, floorY + 5, 2, Math.max(5, cellH - 9));
    }
  }

  // Vertical anodised mullions and a subtle stone / metal spandrel grid.
  context.fillStyle = "rgba(18,31,37,.72)";
  for (let column = 0; column <= columns; column++) {
    context.fillRect(column * cellW - 4, 0, 4, 512);
  }
  context.fillStyle = "rgba(216,194,151,.36)";
  for (let row = 0; row <= rows; row++) {
    context.fillRect(0, row * cellH - 2, 512, 2);
  }

  // Fine, non-repeating facade grain prevents the glass tower from looking like flat plastic.
  let random = (seed + 1) * 9187;
  const next = () => {
    random = (random * 16807) % 2147483647;
    return random / 2147483647;
  };
  for (let i = 0; i < 1500; i++) {
    const x = next() * 512;
    const y = next() * 512;
    context.fillStyle = next() > 0.5 ? "rgba(255,255,255,.045)" : "rgba(0,0,0,.05)";
    context.fillRect(x, y, 1 + next() * 2, 1 + next() * 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    map: texture,
    bumpMap: getFurNoiseTexture(),
    bumpScale: 0.006,
    roughness: rounded ? 0.25 : 0.3,
    metalness: 0.42,
    clearcoat: 0.52,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.9,
    emissive: "#172c33",
    emissiveIntensity: 0.1,
  });
  });
}

function createAsphaltMaterial() {
  return cachedMaterial("asphalt:high", () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return mat("#343a42", 0.97);
  context.fillStyle = "#343a3d";
  context.fillRect(0, 0, 512, 512);
  let seed = 87231;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let index = 0; index < 12000; index++) {
    const value = random();
    context.fillStyle = value > 0.82 ? "rgba(205,207,193,.18)" : value > 0.48 ? "rgba(10,19,23,.12)" : "rgba(118,126,121,.13)";
    const radius = 0.5 + random() * 1.7;
    context.beginPath();
    context.arc(random() * 512, random() * 512, radius, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: texture,
    bumpMap: texture,
    bumpScale: 0.012,
    roughness: 0.96,
    metalness: 0.01,
  });
  });
}

function createPaverMaterial() {
  return cachedMaterial("paver:city", () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return mat("#c9c6b9", 0.95);
  context.fillStyle = "#c9c6b9";
  context.fillRect(0, 0, 512, 512);
  const size = 64;
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const shade = (row + column) % 3;
      context.fillStyle = shade === 0 ? "#d4d0c4" : shade === 1 ? "#c4c1b7" : "#cbc8bd";
      context.fillRect(column * size + 2, row * size + 2, size - 4, size - 4);
      context.fillStyle = "rgba(255,255,255,.24)";
      context.fillRect(column * size + 4, row * size + 4, size - 8, 2);
      context.fillStyle = "rgba(63,68,67,.12)";
      context.fillRect(column * size + 3, row * size + size - 5, size - 6, 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: texture,
    bumpMap: texture,
    bumpScale: 0.018,
    roughness: 0.94,
  });
  });
}

function roundedPrismGeometry(width: number, depth: number, height: number, radius: number) {
  const key = "rounded-prism:" + [width, depth, height, radius].map((value) => value.toFixed(2)).join(":");
  return cachedGeometry(key, () => {
    const r = Math.min(radius, width * 0.22, depth * 0.22);
    const halfW = width / 2;
    const halfD = depth / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-halfW + r, -halfD);
    shape.lineTo(halfW - r, -halfD);
    shape.quadraticCurveTo(halfW, -halfD, halfW, -halfD + r);
    shape.lineTo(halfW, halfD - r);
    shape.quadraticCurveTo(halfW, halfD, halfW - r, halfD);
    shape.lineTo(-halfW + r, halfD);
    shape.quadraticCurveTo(-halfW, halfD, -halfW, halfD - r);
    shape.lineTo(-halfW, -halfD + r);
    shape.quadraticCurveTo(-halfW, -halfD, -halfW + r, -halfD);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: Math.min(0.075, r * 0.18),
      bevelThickness: 0.07,
      curveSegments: 8,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    return geometry;
  });
}

function makeTower(scene: THREE.Scene, x: number, z: number, width: number, depth: number, floors: number, hue: string, rounded = false) {
  const group = new THREE.Group();
  const floorHeight = 0.72;
  const height = floors * floorHeight;
  const seed = Math.round(Math.abs(x * 7 + z * 11)) % 19;
  const style = seed % 4;
  const baseY = 1.35;
  const darkFrame = mat("#2d4149", 0.42, 0.38);
  const bronze = cachedMaterial("architectural-warm-bronze", () => new THREE.MeshPhysicalMaterial({
    color: "#c5a16b", roughness: 0.28, metalness: 0.72, clearcoat: 0.4,
  }));
  const paleStone = createStuccoMaterial("#d8c9ad", seed + 4);
  const podium = createStuccoMaterial("#66787a", seed + 8);
  const glass = cachedMaterial("architectural-film-glass", () => new THREE.MeshPhysicalMaterial({
    color: "#85aebe",
    roughness: 0.14,
    metalness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.22,
    ior: 1.48,
    specularIntensity: 0.95,
  }));
  const shadedGlass = cachedMaterial("architectural-film-glass-shaded", () => new THREE.MeshPhysicalMaterial({
    color: "#385967",
    roughness: 0.18,
    metalness: 0.32,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.08,
  }));

  // Wide, layered podiums and a rounded plinth remove the hard "box on a box" look.
  const lowerPodium = new THREE.Mesh(roundedPrismGeometry(width + 1.1, depth + 1.1, 0.52, 0.28), podium);
  lowerPodium.position.y = 0.14;
  lowerPodium.castShadow = true;
  lowerPodium.receiveShadow = true;
  group.add(lowerPodium);
  const upperPodium = new THREE.Mesh(roundedPrismGeometry(width + 0.52, depth + 0.52, 0.46, 0.22), paleStone);
  upperPodium.position.y = 0.62;
  upperPodium.castShadow = true;
  upperPodium.receiveShadow = true;
  group.add(upperPodium);
  addBox(group, width + 0.34, 0.12, depth + 0.34, bronze, 0, 1.14, 0, false);

  if (rounded) {
    // Cylindrical signature towers use curved glass, slim vertical fins and champagne floor rings.
    const radius = Math.max(width, depth) * 0.51;
    const body = new THREE.Mesh(
      cachedGeometry("sculpted-round-tower:" + radius.toFixed(2) + ":" + height.toFixed(2), () => new THREE.CylinderGeometry(radius, radius * 1.02, height, 56, 1, false)),
      style % 2 === 0 ? shadedGlass : glass,
    );
    body.position.y = baseY + height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const ringGeometry = cachedGeometry("tower-champagne-ring:" + radius.toFixed(2), () => new THREE.TorusGeometry(radius + 0.015, 0.065, 9, 56));
    const ringCount = Math.ceil(floors / 2) + 1;
    const rings = new THREE.InstancedMesh(ringGeometry, bronze, ringCount);
    const dummy = new THREE.Object3D();
    for (let index = 0; index < ringCount; index++) {
      dummy.position.set(0, baseY + Math.min(floors, index * 2) * floorHeight, 0);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      rings.setMatrixAt(index, dummy.matrix);
    }
    rings.instanceMatrix.needsUpdate = true;
    group.add(rings);

    const windows: { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }[] = [];
    const fins: { position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }[] = [];
    const panels = 18;
    for (let floor = 0; floor < floors; floor++) {
      const y = baseY + floor * floorHeight + floorHeight * 0.53;
      for (let panel = 0; panel < panels; panel++) {
        const angle = (panel / panels) * Math.PI * 2;
        const panelWidth = (Math.PI * 2 * radius / panels) * 0.68;
        windows.push({
          position: [Math.sin(angle) * (radius + 0.028), y, Math.cos(angle) * (radius + 0.028)],
          scale: [panelWidth, floorHeight * 0.58, 0.045],
          rotation: [0, angle, 0],
        });
      }
    }
    for (let fin = 0; fin < panels; fin++) {
      const angle = (fin / panels) * Math.PI * 2;
      fins.push({
        position: [Math.sin(angle) * (radius + 0.04), baseY + height / 2, Math.cos(angle) * (radius + 0.04)],
        scale: [0.045, height, 0.055],
        rotation: [0, angle, 0],
      });
    }
    addInstancedBoxes(group, glass, windows);
    addInstancedBoxes(group, bronze, fins);

    // A curved upper crown and a small planted terrace complete the cylindrical silhouette.
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius * 1.04, 0.22, 48), bronze);
    crown.position.y = baseY + height + 0.1;
    group.add(crown);
    const roofGarden = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.76, radius * 0.78, 0.16, 40), paleStone);
    roofGarden.position.y = baseY + height + 0.28;
    group.add(roofGarden);
    for (let plant = 0; plant < 8; plant++) {
      const angle = (plant / 8) * Math.PI * 2;
      addSphere(group, 0.18, mat(plant % 2 ? "#6f9d69" : "#83ad75", 0.96), Math.sin(angle) * radius * 0.64, baseY + height + 0.46, Math.cos(angle) * radius * 0.64, 1, 0.72, 1);
    }
  } else {
    // Rounded rectangular towers have soft corners and more distinctive architectural profiles.
    const stepped = style === 0 && floors >= 11;
    const lowerFloors = stepped ? Math.ceil(floors * 0.72) : floors;
    const lowerHeight = lowerFloors * floorHeight;
    const upperHeight = height - lowerHeight;
    const upperWidth = width * 0.78;
    const upperDepth = depth * 0.8;
    const bodyMaterial = style === 2 ? createFacadeMaterial(hue, seed + 5, false) : createFacadeMaterial(hue, seed, false);
    const core = new THREE.Mesh(roundedPrismGeometry(width, depth, lowerHeight, Math.min(width, depth) * 0.12), bodyMaterial);
    core.position.y = baseY;
    core.castShadow = true;
    core.receiveShadow = true;
    group.add(core);

    if (stepped && upperHeight > 0.1) {
      const crownBody = new THREE.Mesh(roundedPrismGeometry(upperWidth, upperDepth, upperHeight, 0.3), createFacadeMaterial(hue, seed + 9, false));
      crownBody.position.set(width * 0.075, baseY + lowerHeight, -depth * 0.035);
      crownBody.castShadow = true;
      crownBody.receiveShadow = true;
      group.add(crownBody);
    }

    const windowPanels: { position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number] }[] = [];
    const floorBands: { position: [number, number, number]; scale: [number, number, number] }[] = [];
    const mullions: { position: [number, number, number]; scale: [number, number, number]; rotation?: [number, number, number] }[] = [];
    const balconies: { position: [number, number, number]; scale: [number, number, number] }[] = [];
    const columns = Math.max(4, Math.min(8, Math.floor(width / 0.52)));

    for (let floor = 0; floor < floors; floor++) {
      const upper = stepped && floor >= lowerFloors;
      const activeWidth = upper ? upperWidth : width;
      const activeDepth = upper ? upperDepth : depth;
      const offsetX = upper ? width * 0.075 : 0;
      const offsetZ = upper ? -depth * 0.035 : 0;
      const y = baseY + floor * floorHeight + floorHeight * 0.54;
      const frontZ = offsetZ + activeDepth / 2 + 0.035;
      const backZ = offsetZ - activeDepth / 2 - 0.035;
      const sideX = offsetX + activeWidth / 2 + 0.035;
      const paneWidth = activeWidth / columns;
      for (let column = 0; column < columns; column++) {
        const px = offsetX - activeWidth / 2 + paneWidth * (column + 0.5);
        windowPanels.push({ position: [px, y, frontZ], scale: [paneWidth * 0.72, floorHeight * 0.62, 0.048] });
        windowPanels.push({ position: [px, y, backZ], scale: [paneWidth * 0.72, floorHeight * 0.62, 0.048] });
        const pz = offsetZ - activeDepth / 2 + activeDepth * (column + 0.5) / columns;
        windowPanels.push({ position: [sideX, y, pz], scale: [paneWidth * 0.7, floorHeight * 0.62, 0.048], rotation: [0, Math.PI / 2, 0] });
        windowPanels.push({ position: [-sideX + offsetX * 2, y, pz], scale: [paneWidth * 0.7, floorHeight * 0.62, 0.048], rotation: [0, Math.PI / 2, 0] });
      }
      const bandY = baseY + (floor + 1) * floorHeight;
      floorBands.push({ position: [0, bandY, frontZ - 0.018], scale: [activeWidth + 0.09, 0.06, 0.1] });
      floorBands.push({ position: [0, bandY, backZ + 0.018], scale: [activeWidth + 0.09, 0.06, 0.1] });
      floorBands.push({ position: [sideX - 0.02, bandY, offsetZ], scale: [0.1, 0.06, activeDepth + 0.08] });
      floorBands.push({ position: [-sideX + offsetX * 2 + 0.02, bandY, offsetZ], scale: [0.1, 0.06, activeDepth + 0.08] });

      if ((style === 1 || style === 3) && floor > 1 && floor < floors - 1 && floor % 4 === 1) {
        balconies.push({ position: [0, baseY + floor * floorHeight + 0.1, frontZ + 0.18], scale: [activeWidth * 0.82, 0.085, 0.48] });
        balconies.push({ position: [0, baseY + floor * floorHeight + 0.29, frontZ + 0.4], scale: [activeWidth * 0.82, 0.32, 0.035] });
      }
    }

    for (let column = 0; column <= columns; column++) {
      const px = -width / 2 + (column / columns) * width;
      mullions.push({ position: [px, baseY + lowerHeight / 2, depth / 2 + 0.065], scale: [0.045, lowerHeight, 0.07] });
      mullions.push({ position: [px, baseY + lowerHeight / 2, -depth / 2 - 0.065], scale: [0.045, lowerHeight, 0.07] });
      const pz = -depth / 2 + (column / columns) * depth;
      mullions.push({ position: [width / 2 + 0.065, baseY + lowerHeight / 2, pz], scale: [0.07, lowerHeight, 0.045], rotation: [0, Math.PI / 2, 0] });
      mullions.push({ position: [-width / 2 - 0.065, baseY + lowerHeight / 2, pz], scale: [0.07, lowerHeight, 0.045], rotation: [0, Math.PI / 2, 0] });
    }
    addInstancedBoxes(group, glass, windowPanels);
    addInstancedBoxes(group, bronze, floorBands);
    addInstancedBoxes(group, darkFrame, mullions);
    if (balconies.length) addInstancedBoxes(group, style === 1 ? bronze : mat("#536b68", 0.58, 0.2), balconies);

    // Soft corner pilasters, a sculpted cornice and a rooftop garden break up the flat grid.
    const cornerRadius = 0.09;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(cornerRadius, cornerRadius * 1.12, lowerHeight, 12),
          style === 2 ? bronze : darkFrame,
        );
        pillar.position.set(sx * (width / 2 - cornerRadius * 0.5), baseY + lowerHeight / 2, sz * (depth / 2 - cornerRadius * 0.5));
        group.add(pillar);
      }
    }
    const crownY = baseY + height;
    addBox(group, width + 0.32, 0.2, depth + 0.32, bronze, 0, crownY + 0.08, 0);
    addBox(group, width * 0.5, 0.34, depth * 0.48, style === 2 ? paleStone : darkFrame, width * 0.08, crownY + 0.34, -depth * 0.08);
    addBox(group, width * 0.22, 0.08, depth * 0.22, mat("#72917c", 0.95), -width * 0.22, crownY + 0.25, depth * 0.18, false);
    for (const plantX of [-width * 0.27, width * 0.27]) {
      addSphere(group, 0.15, mat("#719d72", 0.98), plantX, crownY + 0.4, depth * 0.19, 1, 0.76, 1);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.035, 0.78, 10), bronze);
    antenna.position.set(width * 0.13, crownY + 0.85, 0);
    group.add(antenna);
    addSphere(group, 0.07, mat("#e4b969", 0.34, 0.36), width * 0.13, crownY + 1.26, 0, 1, 1, 1);
  }

  group.position.set(x, 0.35, z);
  scene.add(group);
}
function createStuccoMaterial(color: string, seed: number) {
  return cachedMaterial(`stucco:${color}:${seed % 4}`, () => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return mat(color, 0.96);
  context.fillStyle = color;
  context.fillRect(0, 0, 256, 256);
  let randomSeed = (seed + 17) * 3911;
  const random = () => {
    randomSeed = (randomSeed * 16807) % 2147483647;
    return randomSeed / 2147483647;
  };
  for (let index = 0; index < 5500; index++) {
    const light = random() > 0.48;
    context.fillStyle = light ? "rgba(255,255,255,.12)" : "rgba(46,54,52,.095)";
    const radius = 0.4 + random() * 1.4;
    context.beginPath();
    context.arc(random() * 256, random() * 256, radius, 0, Math.PI * 2);
    context.fill();
  }
  // Fine horizontal plaster variation and a lightly irregular mineral grain.
  for (let line = 0; line < 36; line++) {
    context.fillStyle = line % 2 ? "rgba(255,255,255,.035)" : "rgba(45,52,50,.025)";
    context.fillRect(0, random() * 256, 256, 0.5 + random() * 1.2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.6, 1.6);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: texture,
    bumpMap: texture,
    bumpScale: 0.014,
    roughness: 0.94,
  });
  });
}

function makeHouse(parent: THREE.Object3D, x: number, z: number, variant: number, detail: "full" | "simple" = "full") {
  const group = new THREE.Group();
  const wallColors = ["#f3e9d9", "#e4efea", "#eadac4", "#eee7dc"];
  const roofColors = ["#a95f48", "#4f7777", "#796b5a", "#bc8055"];
  const wall = createStuccoMaterial(wallColors[variant % wallColors.length], variant + 17);
  const roof = cachedMaterial("neighbourhood-roof:" + variant % 4, () => new THREE.MeshPhysicalMaterial({
    color: roofColors[variant % roofColors.length],
    roughness: 0.72,
    metalness: 0.015,
    clearcoat: 0.18,
    clearcoatRoughness: 0.62,
  }));
  const darkTrim = mat("#405657", 0.5, 0.18);
  const warmWood = mat("#8a6145", 0.78, 0);
  const stone = mat("#c8c4b6", 0.84, 0);
  const brass = mat("#bd925a", 0.32, 0.62);
  const glass = cachedMaterial("neighbourhood-window-glass", () => new THREE.MeshPhysicalMaterial({
    color: "#8bb9c4",
    roughness: 0.14,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.075,
    envMapIntensity: 1.08,
  }));
  const width = 2.55 + (variant % 2) * 0.22;
  const depth = 2.05;
  const twoStorey = variant === 2;
  const height = twoStorey ? 1.82 : 1.38;
  const floorTop = 0.18 + height;
  const gabledRoof = variant !== 1;
  const roofRise = gabledRoof ? 0.62 : 0.22;

  // Stone footing, damp-proof course and softly textured walls.
  const footing = new THREE.Mesh(roundedPrismGeometry(width + 0.42, depth + 0.42, 0.2, 0.18), stone);
  footing.position.y = 0.04;
  footing.castShadow = true;
  group.add(footing);
  const plinth = new THREE.Mesh(roundedPrismGeometry(width + 0.16, depth + 0.16, 0.16, 0.12), darkTrim);
  plinth.position.y = 0.18;
  group.add(plinth);
  addBox(group, width, height, depth, wall, 0, 0.18 + height / 2, 0, true);

  // A gable front gives the small homes a real roofline; modern homes use a deep floating parapet.
  if (gabledRoof) {
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-width / 2, 0);
    gableShape.lineTo(width / 2, 0);
    gableShape.lineTo(0, roofRise);
    gableShape.closePath();
    const gableGeometry = cachedGeometry("home-gable:" + variant + ":" + width.toFixed(2), () => new THREE.ShapeGeometry(gableShape));
    const frontGable = new THREE.Mesh(gableGeometry, wall);
    frontGable.position.set(0, floorTop - 0.03, depth / 2 + 0.025);
    frontGable.castShadow = true;
    group.add(frontGable);
    const backGable = frontGable.clone();
    backGable.position.z = -depth / 2 - 0.025;
    backGable.rotation.y = Math.PI;
    group.add(backGable);

    const panelDepth = depth * 0.72;
    const frontRoof = addBox(group, width + 0.36, 0.15, panelDepth, roof, 0, floorTop + roofRise * 0.58, depth * 0.22, true);
    frontRoof.rotation.x = 0.48;
    const backRoof = addBox(group, width + 0.36, 0.15, panelDepth, roof, 0, floorTop + roofRise * 0.58, -depth * 0.22, true);
    backRoof.rotation.x = -0.48;
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, width + 0.42, 12), darkTrim);
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set(0, floorTop + roofRise + 0.03, 0);
    group.add(ridge);
    if (detail === "full") {
      for (let tileLine = 0; tileLine < 3; tileLine++) {
        const zFront = depth * 0.08 + tileLine * 0.22;
        const frontTile = addBox(group, width + 0.22, 0.025, 0.028, brass, 0, floorTop + roofRise * 0.9 - tileLine * 0.16, zFront, false);
        frontTile.rotation.x = 0.48;
        const backTile = addBox(group, width + 0.22, 0.025, 0.028, brass, 0, floorTop + roofRise * 0.9 - tileLine * 0.16, -zFront, false);
        backTile.rotation.x = -0.48;
      }
    }
  } else {
    addBox(group, width + 0.42, 0.2, depth + 0.42, roof, 0, floorTop + 0.12, 0, true);
    addBox(group, width + 0.2, 0.08, depth + 0.2, brass, 0, floorTop + 0.25, 0, false);
    addBox(group, width * 0.42, 0.18, depth * 0.38, darkTrim, 0.25, floorTop + 0.33, -0.12, false);
    addBox(group, width * 0.32, 0.08, depth * 0.27, glass, 0.25, floorTop + 0.45, -0.12, false);
    addBox(group, width * 0.2, 0.12, depth * 0.25, mat("#78957d", 0.96), -0.7, floorTop + 0.25, 0.3, false);
  }

  // Front windows are deep-set with metal frames, warm timber sills and vertical mullions.
  const windowY = 0.18 + Math.min(height - 0.45, 0.76);
  for (const px of [-0.68, 0.62]) {
    addBox(group, 0.68, 0.58, 0.085, darkTrim, px, windowY, depth / 2 + 0.02, false);
    addBox(group, 0.56, 0.46, 0.045, glass, px, windowY + 0.015, depth / 2 + 0.075, false);
    addBox(group, 0.027, 0.46, 0.028, brass, px, windowY + 0.015, depth / 2 + 0.105, false);
    addBox(group, 0.65, 0.05, 0.17, warmWood, px, windowY - 0.31, depth / 2 + 0.09, false);
    addBox(group, 0.64, 0.035, 0.055, brass, px, windowY + 0.315, depth / 2 + 0.085, false);
  }
  // Side glazing adds real depth when seen from the isometric camera.
  for (const side of [-1, 1]) {
    addBox(group, 0.075, 0.47, 0.7, darkTrim, side * (width / 2 + 0.025), windowY, -0.26, false);
    addBox(group, 0.045, 0.37, 0.58, glass, side * (width / 2 + 0.075), windowY, -0.26, false);
    addBox(group, 0.025, 0.37, 0.58, brass, side * (width / 2 + 0.105), windowY, -0.26, false);
  }

  // A timber front door has a glazed inset, a brass handle and a two-step stone porch.
  addBox(group, 0.48, 0.91, 0.1, warmWood, -0.92, 0.64, depth / 2 + 0.06, true);
  addBox(group, 0.32, 0.69, 0.04, glass, -0.92, 0.68, depth / 2 + 0.12, false);
  addBox(group, 0.035, 0.7, 0.045, brass, -0.92, 0.68, depth / 2 + 0.15, false);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), brass);
  handle.position.set(-0.75, 0.66, depth / 2 + 0.17);
  group.add(handle);
  addBox(group, 0.72, 0.12, 0.46, stone, -0.92, 0.22, depth / 2 + 0.22);
  addBox(group, 0.86, 0.12, 0.54, warmWood, -0.92, 0.1, depth / 2 + 0.28);

  // A small porch canopy, slim columns and a warm wall sconce create a lived-in entrance.
  const porchRoof = addBox(group, 1.02, 0.1, 0.72, roof, -0.92, 1.16, depth / 2 + 0.27, true);
  porchRoof.rotation.x = -0.035;
  for (const side of [-1, 1]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.82, 10), stone);
    column.position.set(-0.92 + side * 0.42, 0.71, depth / 2 + 0.52);
    group.add(column);
    addSphere(group, 0.065, brass, -0.92 + side * 0.42, 1.14, depth / 2 + 0.52, 1, 0.5, 1);
  }
  const sconce = cachedMaterial("home-porch-light", () => new THREE.MeshStandardMaterial({
    color: "#fff0ca", emissive: "#e1a958", emissiveIntensity: 0.62, roughness: 0.28,
  }));
  addBox(group, 0.105, 0.2, 0.07, darkTrim, -1.2, 1.16, depth / 2 + 0.08, false);
  addBox(group, 0.065, 0.13, 0.045, sconce, -1.2, 1.16, depth / 2 + 0.13, false);

  if (twoStorey && detail === "full") {
    // A shallow upper balcony with a glass balustrade makes the premium home visibly different.
    addBox(group, 1.22, 0.1, 0.68, stone, 0.9, 1.65, depth / 2 + 0.28, true);
    addBox(group, 1.18, 0.34, 0.045, glass, 0.9, 1.87, depth / 2 + 0.59, false);
    for (const side of [-1, 1]) addBox(group, 0.055, 0.34, 0.055, brass, 0.9 + side * 0.57, 1.87, depth / 2 + 0.59, false);
  }

  // Compact landscaping gives every home a personal front garden without crowding the walkways.
  addBox(group, 0.58, 0.22, 0.38, mat("#8eaa79", 0.98), width / 2 + 0.19, 0.29, depth / 2 + 0.18, false);
  for (let leaf = 0; leaf < 4; leaf++) {
    addSphere(group, 0.14, mat(["#5f8e63", "#79a975", "#4e8358", "#8caf75"][leaf], 0.96), width / 2 + 0.19 + (leaf - 1.5) * 0.1, 0.49 + (leaf % 2) * 0.035, depth / 2 + 0.18, 1, 1.08, 0.92);
  }
  addBox(group, 0.7, 0.08, 0.42, stone, 0.88, floorTop + 0.25, -0.2, false);
  addBox(group, 0.42, 0.09, 0.32, mat("#809b7d", 0.98), 0.88, floorTop + 0.33, -0.2, false);

  group.position.set(x, 0.42, z);
  parent.add(group);
  return group;
}
function addRoadMarkings(scene: THREE.Scene) {
  const asphalt = createAsphaltMaterial();
  const sidewalk = createPaverMaterial();
  const line = mat("#f5eee0", 0.7);
  const yellow = mat("#e7c777", 0.7);
  const horizontal = new THREE.Mesh(new THREE.PlaneGeometry(52, 3.6), asphalt);
  horizontal.rotation.x = -Math.PI / 2;
  horizontal.position.set(0, 0.405, 1.8);
  scene.add(horizontal);
  const vertical = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 52), asphalt);
  vertical.rotation.x = -Math.PI / 2;
  vertical.position.set(0, 0.408, 0);
  scene.add(vertical);
  for (let x = -24; x <= 24; x += 3) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.08), yellow);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.415, 1.8);
    scene.add(dash);
  }
  for (let z = -24; z <= 24; z += 3) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.25), line);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.416, z);
    scene.add(dash);
  }
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const stripeX = sign * (2.2 + i * 0.24);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.0), line);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(stripeX, 0.42, -0.25);
      scene.add(stripe);
    }
    for (let i = 0; i < 7; i++) {
      const stripeZ = sign * (2.2 + i * 0.24);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.16), line);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-0.25, 0.42, stripeZ);
      scene.add(stripe);
    }
  }
  const northWalk = new THREE.Mesh(new THREE.PlaneGeometry(52, 0.82), sidewalk);
  northWalk.rotation.x = -Math.PI / 2;
  northWalk.position.set(0, 0.407, -0.62);
  scene.add(northWalk);
  const southWalk = northWalk.clone();
  southWalk.position.z = 4.22;
  scene.add(southWalk);
  const sideWalkLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 52), sidewalk);
  sideWalkLeft.rotation.x = -Math.PI / 2;
  sideWalkLeft.position.set(-2.22, 0.407, 0);
  scene.add(sideWalkLeft);
  const sideWalkRight = sideWalkLeft.clone();
  sideWalkRight.position.x = 2.22;
  scene.add(sideWalkRight);
  const curb = mat("#ece9df", 0.78);
  for (const side of [-1, 1]) {
    const horizontalCurb = new THREE.Mesh(new THREE.BoxGeometry(52, 0.13, 0.11), curb);
    horizontalCurb.position.set(0, 0.48, side * 2.0);
    scene.add(horizontalCurb);
    const verticalCurb = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 52), curb);
    verticalCurb.position.set(side * 2.0, 0.48, 0);
    scene.add(verticalCurb);
  }

  // Flush cast-iron manholes and storm drains make the streets read as built infrastructure.
  const iron = mat("#424b4c", 0.78, 0.32);
  const drain = mat("#252f32", 0.72, 0.24);
  for (const [x, z] of [[-5.4, 1.8], [5.6, 1.8], [0, -6.8], [0, 8.3]] as [number, number][]) {
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.035, 28), iron);
    cover.position.set(x, 0.43, z);
    scene.add(cover);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.025, 7, 28), mat("#9b9d91", 0.62, 0.4));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 0.452, z);
    scene.add(rim);
    for (let mark = 0; mark < 7; mark++) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.42), drain);
      groove.position.set(x - 0.17 + mark * 0.056, 0.453, z);
      scene.add(groove);
    }
  }
  for (const [x, z, horizontalDrain] of [[-3.1, -2.06, true], [3.1, -2.06, true], [-2.06, -3.1, false], [-2.06, 3.1, false]] as [number, number, boolean][]) {
    const grate = new THREE.Mesh(new THREE.BoxGeometry(horizontalDrain ? 0.8 : 0.16, 0.028, horizontalDrain ? 0.16 : 0.8), drain);
    grate.position.set(x, 0.455, z);
    scene.add(grate);
    for (let bar = 0; bar < 8; bar++) {
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(horizontalDrain ? 0.035 : 0.18, 0.012, horizontalDrain ? 0.18 : 0.035),
        mat("#8c9690", 0.7, 0.22),
      );
      slot.position.set(x + (horizontalDrain ? -0.34 + bar * 0.095 : 0), 0.472, z + (horizontalDrain ? 0 : -0.34 + bar * 0.095));
      scene.add(slot);
    }
  }
}

function makeTreeCluster(scene: THREE.Scene, centerX: number, centerZ: number, width: number, depth: number, count: number) {
  for (let index = 0; index < count; index++) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = centerX - width / 2 + 0.8 + col * (width - 1.6) / 3 + Math.sin(index * 2.1) * 0.25;
    const z = centerZ - depth / 2 + 0.8 + row * (depth - 1.6) / Math.max(1, Math.ceil(count / 4) - 1);
    makeTree(scene, x, z, 0.68 + (index % 3) * 0.1);
  }
}

function createCar(scene: THREE.Scene, x: number, z: number, color: string) {
  const car = new THREE.Group();
  const body = cachedMaterial(`car-body:${color}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 0.18, clearcoat: 0.88, clearcoatRoughness: 0.16 }));
  const glass = cachedMaterial("car-glass", () => new THREE.MeshPhysicalMaterial({ color: "#7199a5", roughness: 0.11, metalness: 0.42, transparent: true, opacity: 0.92, clearcoat: 1 }));
  const rubber = mat("#202528", 0.96);
  const chrome = mat("#bcc8c4", 0.22, 0.82);
  const darkChrome = mat("#263437", 0.45, 0.54);
  const headlamp = cachedMaterial("car-headlamp", () => new THREE.MeshStandardMaterial({ color: "#fff4cf", emissive: "#ffdc91", emissiveIntensity: 0.78, roughness: 0.2 }));
  const tailLamp = cachedMaterial("car-tail-lamp", () => new THREE.MeshStandardMaterial({ color: "#d34b42", emissive: "#a72a26", emissiveIntensity: 0.48 }));

  // Sculpted body shell with a curved bonnet, roofline and boot.
  const shell = new THREE.Shape();
  shell.moveTo(-0.98, 0.2);
  shell.lineTo(-0.96, 0.4);
  shell.quadraticCurveTo(-0.94, 0.55, -0.72, 0.57);
  shell.lineTo(-0.44, 0.59);
  shell.lineTo(-0.22, 0.94);
  shell.quadraticCurveTo(0.0, 1.04, 0.23, 0.94);
  shell.lineTo(0.52, 0.58);
  shell.lineTo(0.82, 0.56);
  shell.quadraticCurveTo(1.0, 0.53, 1.0, 0.32);
  shell.lineTo(0.94, 0.2);
  shell.closePath();
  const shellGeometry = cachedGeometry("car-shell-extrude", () => new THREE.ExtrudeGeometry(shell, {
    depth: 0.82,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.04,
    curveSegments: 10,
  }));
  const shellMesh = new THREE.Mesh(shellGeometry, body);
  shellMesh.position.z = -0.41;
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  car.add(shellMesh);

  // Dark panoramic roof and windshield surround.
  const cabin = new THREE.Shape();
  cabin.moveTo(-0.43, 0.61);
  cabin.lineTo(-0.18, 0.91);
  cabin.quadraticCurveTo(0.0, 0.98, 0.18, 0.91);
  cabin.lineTo(0.45, 0.61);
  cabin.closePath();
  const cabinMesh = new THREE.Mesh(
    cachedGeometry("car-cabin-extrude", () => new THREE.ExtrudeGeometry(cabin, { depth: 0.58, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.018, bevelThickness: 0.025, curveSegments: 10 })),
    darkChrome,
  );
  cabinMesh.position.z = -0.29;
  cabinMesh.castShadow = true;
  car.add(cabinMesh);
  addBox(car, 0.44, 0.29, 0.02, glass, 0.19, 0.75, 0, false);
  addBox(car, 0.39, 0.25, 0.02, glass, -0.25, 0.74, 0, false);
  for (const side of [-1, 1]) {
    addBox(car, 0.29, 0.19, 0.025, glass, -0.23, 0.76, side * 0.306, false);
    addBox(car, 0.31, 0.19, 0.025, glass, 0.19, 0.76, side * 0.306, false);
    addBox(car, 0.045, 0.26, 0.035, darkChrome, -0.02, 0.76, side * 0.319, false);
    addBox(car, 0.04, 0.26, 0.035, darkChrome, -0.45, 0.73, side * 0.3, false);
    addBox(car, 0.04, 0.2, 0.035, darkChrome, 0.44, 0.72, side * 0.3, false);
    // Wing mirrors with a small glass insert.
    addBox(car, 0.16, 0.09, 0.13, body, 0.38, 0.73, side * 0.46);
    addBox(car, 0.085, 0.045, 0.035, glass, 0.4, 0.75, side * 0.53, false);
    // Door seams, chrome handles and a lower side sill.
    addBox(car, 0.018, 0.29, 0.012, darkChrome, 0.0, 0.43, side * 0.415, false);
    addBox(car, 0.15, 0.025, 0.018, chrome, -0.24, 0.51, side * 0.421, false);
    addBox(car, 0.15, 0.025, 0.018, chrome, 0.24, 0.51, side * 0.421, false);
    addBox(car, 1.35, 0.055, 0.065, darkChrome, 0, 0.24, side * 0.42);
  }

  // Front grille, metallic bumpers, headlamps and rear light clusters.
  addBox(car, 0.07, 0.15, 0.52, darkChrome, 1.0, 0.37, 0, false);
  addBox(car, 0.045, 0.1, 0.28, chrome, 1.04, 0.37, 0, false);
  for (let slat = 0; slat < 4; slat++) addBox(car, 0.018, 0.014, 0.29, chrome, 1.055, 0.31 + slat * 0.04, 0, false);
  addBox(car, 0.07, 0.11, 0.92, chrome, 0.96, 0.25, 0, false);
  addBox(car, 0.07, 0.1, 0.82, darkChrome, -0.98, 0.26, 0, false);
  for (const side of [-1, 1]) {
    addBox(car, 0.055, 0.13, 0.2, headlamp, 0.91, 0.49, side * 0.28, false);
    addBox(car, 0.055, 0.13, 0.18, tailLamp, -0.91, 0.47, side * 0.29, false);
    addBox(car, 0.04, 0.045, 0.1, mat("#f0dfb3", 0.34, 0.12), -0.92, 0.33, side * 0.34, false);
  }

  // Reusable wheel assemblies: a tyre, polished alloy face and sidewall ring per wheel.
  const wheels: THREE.Group[] = [];
  const tyreGeometry = cachedGeometry("car-tyre-geometry", () => new THREE.CylinderGeometry(0.19, 0.19, 0.14, 20));
  const ringGeometry = cachedGeometry("car-sidewall-ring", () => new THREE.TorusGeometry(0.145, 0.018, 7, 20));
  const alloyGeometry = cachedGeometry("car-alloy-face", () => {
    const shape = new THREE.Shape();
    const points = 10;
    for (let point = 0; point < points; point++) {
      const angle = (point / points) * Math.PI * 2 - Math.PI / 2;
      const radius = point % 2 === 0 ? 0.115 : 0.05;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (point === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: 0.026, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.006, bevelThickness: 0.006, curveSegments: 5 });
  });
  const wheelFaceMaterial = cachedMaterial("car-alloy-material", () => new THREE.MeshStandardMaterial({ color: "#dce2dc", roughness: 0.25, metalness: 0.78 }));
  const hub = mat("#263437", 0.42, 0.58);
  for (const side of [-1, 1]) {
    for (const axle of [-0.62, 0.62]) {
      const assembly = new THREE.Group();
      const tyre = new THREE.Mesh(tyreGeometry, rubber);
      tyre.rotation.x = Math.PI / 2;
      assembly.add(tyre);
      const sidewall = new THREE.Mesh(ringGeometry, darkChrome);
      sidewall.position.z = side * 0.076;
      assembly.add(sidewall);
      const alloy = new THREE.Mesh(alloyGeometry, wheelFaceMaterial);
      alloy.position.z = side * 0.079;
      assembly.add(alloy);
      const centre = new THREE.Mesh(cachedGeometry("car-wheel-hub-cap", () => new THREE.CylinderGeometry(0.043, 0.043, 0.028, 14)), hub);
      centre.rotation.x = Math.PI / 2;
      centre.position.z = side * 0.096;
      assembly.add(centre);
      assembly.position.set(axle, 0.2, side * 0.405);
      car.add(assembly);
      wheels.push(assembly);
    }
  }

  // Glass sunroof, slim roof antenna and registration plate.
  const sunroof = addBox(car, 0.32, 0.025, 0.3, glass, -0.03, 0.96, 0, false);
  sunroof.material = glass;
  const plate = addBox(car, 0.22, 0.07, 0.025, mat("#e8e5d6", 0.5), 1.06, 0.28, 0, false);
  plate.castShadow = false;
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.16, 6), darkChrome);
  antenna.position.set(-0.35, 1.0, -0.18);
  antenna.rotation.z = -0.3;
  car.add(antenna);

  car.position.set(x, 0.42, z);
  car.userData.wheels = wheels;
  scene.add(car);
  return car;
}
function createBench(scene: THREE.Scene, x: number, z: number, rotation = 0) {
  const bench = new THREE.Group();
  const wood = mat("#956d4d", 0.72);
  const metal = mat("#34494a", 0.58, 0.3);
  for (let slat = 0; slat < 4; slat++) {
    addBox(bench, 1.15, 0.055, 0.12, wood, 0, 0.48 + slat * 0.07, -0.18 + slat * 0.12);
  }
  addBox(bench, 1.15, 0.055, 0.12, wood, 0, 0.42, -0.15);
  for (const side of [-1, 1]) {
    addBox(bench, 0.075, 0.46, 0.075, metal, side * 0.43, 0.23, -0.12);
    addBox(bench, 0.075, 0.48, 0.075, metal, side * 0.43, 0.64, 0.18);
    addBox(bench, 0.075, 0.075, 0.42, metal, side * 0.43, 0.43, 0.01);
  }
  bench.position.set(x, 0.42, z);
  bench.rotation.y = rotation;
  scene.add(bench);
}

function createPlanter(scene: THREE.Scene, x: number, z: number, width = 1.25) {
  const placements = (scene.userData.planterPlacements ??= []) as { x: number; z: number; width: number }[];
  placements.push({ x, z, width });
}

function createPlanterBatch(scene: THREE.Scene) {
  const placements = (scene.userData.planterPlacements ?? []) as { x: number; z: number; width: number }[];
  if (!placements.length) return;
  const base = new THREE.InstancedMesh(unitBoxGeometry(), mat("#b8b7a9", 0.95), placements.length);
  const soil = new THREE.InstancedMesh(unitBoxGeometry(), mat("#594a3a", 1), placements.length);
  const dummy = new THREE.Object3D();
  placements.forEach((item, index) => {
    dummy.position.set(item.x, 0.61, item.z);
    dummy.scale.set(item.width, 0.42, 0.72);
    dummy.updateMatrix();
    base.setMatrixAt(index, dummy.matrix);
    dummy.position.y = 0.83;
    dummy.scale.set(item.width - 0.14, 0.06, 0.56);
    dummy.updateMatrix();
    soil.setMatrixAt(index, dummy.matrix);
  });
  base.instanceMatrix.needsUpdate = true;
  soil.instanceMatrix.needsUpdate = true;
  scene.add(base, soil);

  const plantGeometry = unitSphereGeometry();
  const plantMaterial = cachedMaterial("planter-greenery", () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.98 }));
  const plantCount = placements.length * 5;
  const plants = new THREE.InstancedMesh(plantGeometry, plantMaterial, plantCount);
  const greens = ["#56865d", "#679467", "#477e57"].map((color) => new THREE.Color(color));
  let index = 0;
  placements.forEach((item, planterIndex) => {
    for (let plant = 0; plant < 5; plant++) {
      dummy.position.set(
        item.x + (plant - 2) * (item.width - 0.28) / 4,
        1.04 + (plant % 2) * 0.06,
        item.z + Math.sin(plant) * 0.13,
      );
      dummy.scale.set(0.19, 0.1425, 0.1615);
      dummy.updateMatrix();
      plants.setMatrixAt(index, dummy.matrix);
      plants.setColorAt(index, greens[(plant + planterIndex) % greens.length]);
      index++;
    }
  });
  plants.instanceMatrix.needsUpdate = true;
  if (plants.instanceColor) plants.instanceColor.needsUpdate = true;
  scene.add(plants);
  placements.length = 0;
}

function createStreetLamp(scene: THREE.Scene, x: number, z: number, height = 2.9) {
  const lamp = new THREE.Group();
  const iron = mat("#34494a", 0.48, 0.38);
  const warm = new THREE.MeshPhysicalMaterial({
    color: "#fff0c7",
    emissive: "#e9b75d",
    emissiveIntensity: 0.82,
    roughness: 0.22,
    clearcoat: 0.7,
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, height, 10), iron);
  pole.position.y = height / 2;
  lamp.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.48, 8), iron);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.2, height - 0.12, 0);
  lamp.add(arm);
  addSphere(lamp, 0.13, warm, 0.42, height - 0.15, 0, 1.25, 0.62, 1.1);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.08, 12), iron);
  shade.position.set(0.42, height - 0.06, 0);
  lamp.add(shade);
  lamp.position.set(x, 0.4, z);
  scene.add(lamp);
}

function createTrafficSignal(scene: THREE.Scene, x: number, z: number, rotation = 0) {
  const signal = new THREE.Group();
  const pole = mat("#3a4547", 0.48, 0.3);
  const casing = mat("#252f33", 0.6, 0.2);
  const red = new THREE.MeshStandardMaterial({ color: "#e24c42", emissive: "#b92e28", emissiveIntensity: 0.45 });
  const amber = new THREE.MeshStandardMaterial({ color: "#e9b548", emissive: "#c18a20", emissiveIntensity: 0.34 });
  const green = new THREE.MeshStandardMaterial({ color: "#5da978", emissive: "#3c8f5c", emissiveIntensity: 0.3 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.55, 9), pole);
  stem.position.y = 1.28;
  signal.add(stem);
  addBox(signal, 0.28, 0.78, 0.22, casing, 0, 2.52, 0);
  addSphere(signal, 0.075, red, 0, 2.78, 0.12);
  addSphere(signal, 0.075, amber, 0, 2.53, 0.12);
  addSphere(signal, 0.075, green, 0, 2.28, 0.12);
  signal.position.set(x, 0.4, z);
  signal.rotation.y = rotation;
  scene.add(signal);
}

function createBusShelter(scene: THREE.Scene, x: number, z: number) {
  const shelter = new THREE.Group();
  const steel = mat("#344c50", 0.42, 0.46);
  const bronze = mat("#c39b63", 0.35, 0.52);
  const glass = new THREE.MeshPhysicalMaterial({ color: "#a8c8c8", roughness: 0.12, metalness: 0.46, transparent: true, opacity: 0.58, transmission: 0.12 });
  const stone = mat("#bbb8aa", 0.88);
  addBox(shelter, 3.7, 0.14, 1.55, stone, 0, 0.08, 0);
  addBox(shelter, 3.5, 0.12, 1.38, steel, 0, 2.3, 0);
  addBox(shelter, 3.3, 0.07, 1.22, bronze, 0, 2.22, 0);
  for (const side of [-1, 1]) {
    addBox(shelter, 0.09, 2.1, 0.09, steel, side * 1.62, 1.15, -0.52);
    addBox(shelter, 0.09, 2.1, 0.09, steel, side * 1.62, 1.15, 0.52);
    addBox(shelter, 0.035, 1.78, 0.82, glass, side * 1.62, 1.18, 0, false);
    addBox(shelter, 0.09, 2.1, 0.09, steel, side * 1.62, 1.15, 0);
  }
  addBox(shelter, 3.0, 0.08, 0.09, steel, 0, 1.75, -0.66);
  // Wood-and-metal bench with individually modelled slats.
  for (let slat = 0; slat < 5; slat++) {
    addBox(shelter, 1.75, 0.045, 0.12, mat(slat % 2 ? "#9a7755" : "#896a4e", 0.76), 0, 0.61, -0.32 + slat * 0.13);
  }
  addBox(shelter, 1.75, 0.055, 0.12, steel, 0, 0.43, 0.03);
  for (const side of [-1, 1]) addBox(shelter, 0.08, 0.52, 0.42, steel, side * 0.72, 0.55, -0.08);
  // Printed bus timetable with a clean destination board.
  const boardCanvas = document.createElement("canvas");
  boardCanvas.width = 256;
  boardCanvas.height = 384;
  const context = boardCanvas.getContext("2d");
  if (context) {
    context.fillStyle = "#edf0e6";
    context.fillRect(0, 0, 256, 384);
    context.fillStyle = "#205153";
    context.fillRect(0, 0, 256, 82);
    context.fillStyle = "#f4e7c9";
    context.font = "bold 28px Arial";
    context.textAlign = "center";
    context.fillText("NOVARIA", 128, 35);
    context.font = "bold 17px Arial";
    context.fillText("CITY TRANSIT", 128, 62);
    context.fillStyle = "#3e5756";
    context.font = "bold 18px Arial";
    context.fillText("CENTRAL LOOP", 128, 122);
    context.font = "16px Arial";
    context.fillText("CITY HALL  ·  04", 128, 165);
    context.fillText("MARINA      ·  08", 128, 204);
    context.fillText("HARBOR      ·  12", 128, 243);
    context.fillText("EVERY 10 MIN", 128, 318);
    const texture = new THREE.CanvasTexture(boardCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.92), new THREE.MeshBasicMaterial({ map: texture }));
    board.position.set(-1.24, 1.35, 0.68);
    board.rotation.y = -0.12;
    shelter.add(board);
  }
  shelter.position.set(x, 0.4, z);
  shelter.rotation.y = Math.PI;
  scene.add(shelter);
}

function createRoadArrow(scene: THREE.Scene, x: number, z: number, rotation = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.52, -0.19);
  shape.lineTo(0.08, -0.19);
  shape.lineTo(0.08, -0.42);
  shape.lineTo(0.58, 0);
  shape.lineTo(0.08, 0.42);
  shape.lineTo(0.08, 0.19);
  shape.lineTo(-0.52, 0.19);
  shape.closePath();
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat("#eee9d7", 0.74));
  arrow.rotation.x = -Math.PI / 2;
  arrow.rotation.z = rotation;
  arrow.position.set(x, 0.426, z);
  arrow.receiveShadow = true;
  scene.add(arrow);
}

function addStreetFurniture(scene: THREE.Scene) {
  createBench(scene, -12.8, 8.9, Math.PI / 2);
  createBench(scene, -7.2, 8.9, -Math.PI / 2);
  createBench(scene, -10, 13.2, 0);
  createPlanter(scene, -5.8, 8.4, 1.4);
  createPlanter(scene, -14.1, 8.4, 1.4);
  createPlanter(scene, 6.2, 11.7, 1.25);
  createPlanter(scene, 13.8, 7.2, 1.25);
  createStreetLamp(scene, -15, 5.3, 2.7);
  createStreetLamp(scene, -5, 5.3, 2.7);
  createStreetLamp(scene, 5, 5.5, 2.7);
  createStreetLamp(scene, 15, 5.5, 2.7);
  createStreetLamp(scene, -15, 14.8, 2.7);
  createStreetLamp(scene, -5, 14.8, 2.7);
  createStreetLamp(scene, 5, 14.8, 2.7);
  createStreetLamp(scene, 15, 14.8, 2.7);
  createTrafficSignal(scene, -2.2, 3.9, 0);
  createTrafficSignal(scene, 2.2, -0.3, Math.PI);
}
function createShopKiosk(scene: THREE.Scene, x: number, z: number, label: string, accent: string) {
  const shop = new THREE.Group();
  const plaster = mat("#e9e4d9", 0.84);
  const stone = mat("#a9a99e", 0.92);
  const trim = mat("#3d5354", 0.48, 0.2);
  const glass = new THREE.MeshStandardMaterial({ color: "#a2c7c9", roughness: 0.12, metalness: 0.35 });
  const accentMat = mat(accent, 0.52, 0.08);
  addBox(shop, 2.45, 0.16, 1.9, stone, 0, 0.08, 0);
  addBox(shop, 2.3, 1.45, 1.72, plaster, 0, 0.9, 0);
  addBox(shop, 2.42, 0.13, 1.84, trim, 0, 1.64, 0);
  addBox(shop, 2.36, 0.14, 1.8, accentMat, 0, 1.78, 0);
  // Full-height storefront glass framed in dark anodised metal.
  addBox(shop, 1.55, 0.97, 0.045, glass, -0.25, 0.78, 0.88, false);
  addBox(shop, 0.42, 1.02, 0.065, trim, 0.78, 0.79, 0.89);
  addBox(shop, 0.055, 1.04, 0.07, trim, -1.05, 0.79, 0.9, false);
  addBox(shop, 0.055, 1.04, 0.07, trim, 0.54, 0.79, 0.9, false);
  addBox(shop, 0.055, 0.98, 0.07, trim, -0.25, 0.79, 0.92, false);
  // Interior shelving and product displays remain visible behind the storefront glass.
  const shelf = mat("#775c45", 0.78);
  const productColors = ["#c98b56", "#6d9e92", "#d4b875", "#9b779d", "#7093ad"];
  addBox(shop, 1.35, 0.08, 0.28, shelf, -0.18, 0.48, 0.57);
  addBox(shop, 1.35, 0.08, 0.28, shelf, -0.18, 0.92, 0.57);
  addBox(shop, 0.08, 0.82, 0.25, trim, -0.88, 0.84, 0.57);
  addBox(shop, 0.08, 0.82, 0.25, trim, 0.52, 0.84, 0.57);
  for (let product = 0; product < 10; product++) {
    const x = -0.78 + (product % 5) * 0.28;
    const y = product < 5 ? 0.67 : 1.12;
    const packageBox = addBox(shop, 0.15, 0.23 + (product % 3) * 0.035, 0.12, mat(productColors[product % productColors.length], 0.62), x, y, 0.53);
    packageBox.castShadow = true;
    if (product % 2 === 0) addBox(shop, 0.075, 0.04, 0.13, mat("#f3ead8", 0.54), x, y + 0.14, 0.53, false);
  }
  addBox(shop, 0.52, 0.48, 0.28, mat("#b9a07a", 0.8), 0.78, 0.48, 0.55);
  addBox(shop, 0.54, 0.06, 0.3, accentMat, 0.78, 0.74, 0.55);
  // Warm ceiling lights create a welcoming glow inside the shop.
  const interiorLight = new THREE.MeshStandardMaterial({ color: "#f3dba9", emissive: "#c99b55", emissiveIntensity: 0.28 });
  for (const x of [-0.65, 0.0, 0.55]) addSphere(shop, 0.045, interiorLight, x, 1.4, 0.45, 1, 0.5, 1);
  addBox(shop, 1.9, 0.09, 0.58, accentMat, 0, 1.48, 1.13);
  addBox(shop, 2.05, 0.1, 0.12, trim, 0, 1.39, 1.22);
  for (const side of [-1, 1]) {
    addBox(shop, 0.1, 1.3, 0.1, trim, side * 1.08, 0.88, 0.86);
    addBox(shop, 0.42, 0.055, 1.25, trim, side * 1.12, 0.2, 0, false);
  }
  // Illuminated sign above the canopy.
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 180;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#203a3b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#d7b577";
    context.lineWidth = 8;
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    context.fillStyle = "#f5ecd9";
    context.font = "800 54px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label.toUpperCase(), 320, 90);
    const texture = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.44), new THREE.MeshBasicMaterial({ map: texture }));
    sign.position.set(-0.08, 1.9, 0.91);
    shop.add(sign);
  }
  shop.position.set(x, 0.4, z);
  scene.add(shop);
}

function addDistrictLabel(scene: THREE.Scene, label: string, x: number, z: number, tint = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (!context) return;

  // Floating sign typography follows the city reference: clean, readable and integrated into the world.
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "900 76px Arial";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(39, 48, 48, .72)";
  context.lineWidth = 16;
  context.shadowColor = "rgba(23, 32, 35, .38)";
  context.shadowBlur = 16;
  context.shadowOffsetY = 8;
  context.strokeText(label, 384, 92);
  context.shadowColor = "transparent";
  context.fillStyle = "#fff8e9";
  context.fillText(label, 384, 92);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    color: tint,
    toneMapped: false,
  }));
  sprite.position.set(x, 3.35, z);
  sprite.scale.set(5.8, 1.45, 1);
  scene.add(sprite);
}
function createSkyDome(scene: THREE.Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#5d9be8");
    gradient.addColorStop(0.38, "#a5c8e8");
    gradient.addColorStop(0.68, "#e8d3bb");
    gradient.addColorStop(1, "#f6dcc0");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 512);
    // A warm, low sun and layered high-altitude cloud banks give the city a cinematic horizon.
    const sunGlow = context.createRadialGradient(765, 260, 10, 765, 260, 210);
    sunGlow.addColorStop(0, "rgba(255,245,216,.96)");
    sunGlow.addColorStop(0.18, "rgba(255,225,177,.46)");
    sunGlow.addColorStop(1, "rgba(255,225,177,0)");
    context.fillStyle = sunGlow;
    context.fillRect(535, 30, 460, 460);
    context.globalAlpha = 0.24;
    for (let index = 0; index < 9; index++) {
      const x = 55 + index * 118;
      const y = 145 + (index % 4) * 24;
      context.fillStyle = index % 2 ? "#fff8e8" : "#e9f1ed";
      context.beginPath();
      context.ellipse(x, y, 68 + (index % 3) * 13, 11 + (index % 2) * 5, -0.06, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.ellipse(x + 25, y + 6, 40, 8, 0.04, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 0.14;
    const haze = context.createLinearGradient(0, 260, 0, 512);
    haze.addColorStop(0, "rgba(246,223,186,0)");
    haze.addColorStop(1, "rgba(249,225,190,.92)");
    context.fillStyle = haze;
    context.fillRect(0, 260, 1024, 252);
    context.globalAlpha = 1;
  }
  if (!context) return;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(145, 36, 24),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false }),
  );
  sky.renderOrder = -10;
  scene.userData.skyDome = sky;
  scene.add(sky);
  return texture;
}

function createWaterfrontPier(scene: THREE.Scene) {
  const pier = new THREE.Group();
  const decking = mat("#947858", 0.78);
  const sideRail = mat("#354c4d", 0.5, 0.25);
  const brass = mat("#c4a16b", 0.36, 0.4);
  addBox(pier, 2.25, 0.2, 10.5, decking, 0, 0.58, 0);
  for (let plank = 0; plank < 18; plank++) {
    const board = addBox(pier, 2.2, 0.025, 0.48, mat(plank % 2 ? "#a78965" : "#8f7355", 0.82), 0, 0.695, -4.78 + plank * 0.56, false);
    board.receiveShadow = true;
  }
  for (const side of [-1, 1]) {
    addBox(pier, 0.08, 0.72, 10.5, sideRail, side * 1.04, 0.98, 0);
    for (let post = 0; post < 8; post++) {
      addBox(pier, 0.1, 0.78, 0.1, brass, side * 1.04, 1.0, -4.55 + post * 1.3);
    }
    addBox(pier, 0.07, 0.07, 10.3, brass, side * 1.04, 1.38, 0, false);
    for (const z of [-4.2, -1.4, 1.4, 4.2]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.2, 10), mat("#5a554c", 0.98));
      pile.position.set(side * 0.86, -0.02, z);
      pier.add(pile);
    }
  }
  pier.position.set(10.5, 0, 23.4);
  scene.add(pier);
  createStreetLamp(scene, 9.35, 20.1, 2.8);
  createStreetLamp(scene, 11.65, 26.8, 2.8);

  // A compact passenger launch gives the waterfront a recognisable maritime landmark.
  const boat = new THREE.Group();
  const hull = mat("#f0eee4", 0.42, 0.16);
  const navy = mat("#315765", 0.28, 0.3);
  const cabinGlass = new THREE.MeshStandardMaterial({ color: "#8eb8c3", roughness: 0.1, metalness: 0.55 });
  const hullShape = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), navy);
  hullShape.scale.set(1.9, 0.28, 0.72);
  hullShape.position.y = 0.25;
  boat.add(hullShape);
  addBox(boat, 3.0, 0.18, 1.05, hull, 0, 0.4, 0);
  addBox(boat, 1.5, 0.6, 0.78, cabinGlass, -0.25, 0.78, 0);
  addBox(boat, 2.2, 0.08, 1.1, hull, -0.25, 1.12, 0);
  addBox(boat, 0.15, 0.48, 0.95, navy, 1.2, 0.62, 0);
  for (const side of [-1, 1]) {
    for (let window = 0; window < 3; window++) {
      addBox(boat, 0.28, 0.18, 0.025, cabinGlass, -0.75 + window * 0.48, 0.82, side * 0.405, false);
    }
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.15, 8), brass);
  mast.position.set(-0.78, 1.55, 0);
  boat.add(mast);
  addBox(boat, 0.44, 0.28, 0.035, mat("#e6d7b5", 0.82), -0.55, 1.85, 0, false);
  boat.position.set(13.5, -0.1, 29.3);
  boat.rotation.y = -0.14;
  scene.add(boat);
}

function makeCity(scene: THREE.Scene, houseGroup: THREE.Group, lowPowerDevice = false) {
  createSkyDome(scene);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150, 48, 48),
    new THREE.MeshPhysicalMaterial({ color: "#477f88", roughness: 0.19, metalness: 0.22, clearcoat: 0.82, clearcoatRoughness: 0.12, envMapIntensity: 0.8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.32;
  scene.add(sea);

  const land = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), createPaverMaterial());
  land.rotation.x = -Math.PI / 2;
  land.position.y = 0.35;
  land.receiveShadow = true;
  scene.add(land);

  const blockLines = mat("#b6b5aa");
  for (let offset = -24; offset <= 24; offset += 6) {
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(52, 0.018), blockLines);
    seam.rotation.x = -Math.PI / 2;
    seam.position.set(0, 0.362, offset);
    scene.add(seam);
  }

  addRoadMarkings(scene);

  // A landscaped public park, a modern market plaza and a waterfront square.
  const park = new THREE.Mesh(new THREE.PlaneGeometry(11, 10), mat("#a3c08f", 0.98));
  park.rotation.x = -Math.PI / 2;
  park.position.set(-10, 0.39, 9);
  scene.add(park);
  const parkPath = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 9.4), mat("#e5dcc8", 0.94));
  parkPath.rotation.x = -Math.PI / 2;
  parkPath.position.set(-10, 0.405, 9);
  scene.add(parkPath);
  const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 0.9), mat("#e5dcc8", 0.94));
  crossPath.rotation.x = -Math.PI / 2;
  crossPath.position.set(-10, 0.407, 9);
  scene.add(crossPath);
  const parkEdge = mat("#7b9a70", 0.95);
  for (const [x, z, width, depth] of [[-10, 4.0, 11.2, 0.13], [-10, 14.0, 11.2, 0.13], [-15.5, 9, 0.13, 10], [-4.5, 9, 0.13, 10]] as [number, number, number, number][]) {
    const edging = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, depth), parkEdge);
    edging.position.set(x, 0.45, z);
    scene.add(edging);
  }
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.26, 0.28, 40), mat("#d0c7b6", 0.66, 0.08));
  fountainBase.position.set(-10, 0.55, 9);
  scene.add(fountainBase);
  const fountainRim = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.08, 9, 40), mat("#eee5d3", 0.48, 0.12));
  fountainRim.rotation.x = Math.PI / 2;
  fountainRim.position.set(-10, 0.72, 9);
  scene.add(fountainRim);
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.98, 0.08, 36), new THREE.MeshStandardMaterial({ color: "#78c1ce", roughness: 0.16, metalness: 0.24, transparent: true, opacity: 0.92 }));
  fountainWater.position.set(-10, 0.68, 9);
  scene.add(fountainWater);
  const fountainColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.72, 16), mat("#ded8c8", 0.52, 0.12));
  fountainColumn.position.set(-10, 1.08, 9);
  scene.add(fountainColumn);
  addSphere(scene, 0.22, mat("#8bd2d5", 0.16, 0.18), -10, 1.48, 9, 0.88, 1.2, 0.88);
  makeTreeCluster(scene, -10, 9, 10, 9, 12);

  const market = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), mat("#ded8ca", 0.94));
  market.rotation.x = -Math.PI / 2;
  market.position.set(10, 0.392, 9);
  scene.add(market);
  // Subtle stone bands and a circular centre medallion give the retail square a designed layout.
  const plazaBorder = mat("#b8ad99", 0.86);
  for (const [x, z, width, depth] of [[10, 4.75, 10, 0.08], [10, 13.25, 10, 0.08], [5, 9, 0.08, 8.5], [15, 9, 0.08, 8.5]] as [number, number, number, number][]) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), plazaBorder);
    band.rotation.x = -Math.PI / 2;
    band.position.set(x, 0.415, z);
    scene.add(band);
  }
  const medallion = new THREE.Mesh(new THREE.CircleGeometry(1.18, 48), mat("#c7b99f", 0.8));
  medallion.rotation.x = -Math.PI / 2;
  medallion.position.set(10, 0.417, 9);
  scene.add(medallion);
  const medallionRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.035, 8, 48), mat("#e0c38d", 0.4, 0.32));
  medallionRing.rotation.x = Math.PI / 2;
  medallionRing.position.set(10, 0.44, 9);
  scene.add(medallionRing);
  for (let tile = 0; tile < 8; tile++) {
    const angle = (tile / 8) * Math.PI * 2;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), mat("#9c8769", 0.6, 0.18));
    dot.position.set(10 + Math.cos(angle) * 0.83, 0.45, 9 + Math.sin(angle) * 0.83);
    scene.add(dot);
  }
  createShopKiosk(scene, 7.3, 7.0, "Harbor Café", "#b96e54");
  createShopKiosk(scene, 12.3, 10.5, "City Market", "#638d9b");
  createPlanter(scene, 7.0, 12.3, 1.35);
  createPlanter(scene, 13.1, 6.3, 1.35);
  addDistrictLabel(scene, "Green Park", -10, 14);
  addDistrictLabel(scene, "Modern Market", 10, 14);
  addDistrictLabel(scene, "Marina Promenade", 10.5, 18.2);

  // A denser skyline around the civic and commercial center.
  const towers: [number, number, number, number, number, string, boolean][] = [
    [-20, -18, 4.4, 4.1, 21, "#344b57", false],
    [-14, -18, 4.0, 4.0, 15, "#7d735f", true],
    [-8, -18, 3.8, 3.8, 11, "#536875", false],
    [7, -18, 4.0, 4.1, 18, "#51636c", false],
    [13, -17, 4.1, 4.0, 15, "#89745a", true],
    [20, -15, 4.6, 4.4, 22, "#2d4658", false],
    [-21, 4, 4.1, 4.0, 13, "#596d75", true],
    [20, 6, 4.1, 4.1, 18, "#516b73", false],
    [-19, 16, 4.0, 4.0, 11, "#8b775e", false],
    [-14, 18, 4.3, 4.0, 15, "#435c6b", true],
    [16, 17, 4.2, 4.2, 13, "#7d6b5a", false],
    [21, 17, 3.8, 3.7, 10, "#435b65", true],
    [1, 19, 4.0, 3.8, 10, "#5e7477", false],
    [-20, -5, 3.2, 3.3, 9, "#657780", true],
    [20, -6, 3.1, 3.2, 10, "#927b60", false],
    [-20, 10, 3.3, 3.1, 8, "#526c78", false],
    [20, 12, 3.2, 3.2, 9, "#7b776b", true],
    [-16.5, -1.5, 3.4, 3.1, 7, "#9a866c", false],
    [16.4, -10.5, 3.35, 3.1, 8, "#506b75", true],
    [-22, -24, 3.0, 3.1, 14, "#627982", true],
    [-15, -24, 3.3, 3.0, 9, "#a18a6e", false],
    [-7.5, -24, 3.0, 3.2, 12, "#486671", true],
    [1.5, -24, 3.3, 3.0, 17, "#536b77", false],
    [10, -23, 3.2, 3.1, 11, "#a28c6b", true],
    [17, -22, 3.2, 3.2, 16, "#405b67", false],
  ];
  for (const [x, z, width, depth, floors, hue, rounded] of towers) {
    makeTower(scene, x, z, width, depth, floors, hue, rounded);
  }

  // Residential quarter behind the avenue. Database-backed plots replace these samples.
  const homePositions: [number, number, number][] = [
    [-17, -11, 0], [-14, -11, 1], [-11, -11, 2], [-8, -11, 3],
    [-17, -7.5, 1], [-14, -7.5, 2], [-11, -7.5, 3], [-8, -7.5, 0],
  ];
  for (const [x, z, variant] of homePositions) makeHouse(houseGroup, x, z, variant);

  for (let index = 0; index < 15; index++) {
    const x = -22 + index * 3.1;
    // Preserve a clear opening for the marina boardwalk on the eastern shoreline.
    if (x > -2 && x < 15) continue;
    makeTree(scene, x, 21.2, 0.58 + (index % 3) * 0.08);
  }
  createWaterfrontPier(scene);
  // Tropical waterfront planting and layered hedgerows soften the hard urban edges.
  for (const [x, z, size] of [[6.7, 18.2, 0.9], [14.3, 18.1, 0.9], [18.2, 23.2, 0.82], [4.5, 23.8, 0.76]] as [number, number, number][]) {
    makePalmTree(scene, x, z, size);
  }
  makeHedge(scene, -15.1, 7.1, 2.1, 0.52);
  makeHedge(scene, -4.9, 7.1, 2.1, 0.52);
  makeHedge(scene, -15.1, 11.4, 2.1, 0.52);
  makeHedge(scene, -4.9, 11.4, 2.1, 0.52);
  makeHedge(scene, 6.1, 5.3, 1.7, 0.48);
  makeHedge(scene, 14.1, 12.8, 1.7, 0.48);
  createHedgeBatch(scene);

  // Premium street furniture, park benches, planters and traffic controls.
  addStreetFurniture(scene);
  createPlanterBatch(scene);
  createBusShelter(scene, 6.8, -1.5);
  createRoadArrow(scene, -11.5, 1.8, 0);
  createRoadArrow(scene, 11.5, 1.8, Math.PI);

  // Street lights, benches and bollards around the central plazas.
  const lampMaterial = mat("#38484a", 0.55, 0.25);
  const lampLight = new THREE.MeshStandardMaterial({ color: "#ffe7ad", emissive: "#d5a34d", emissiveIntensity: 0.65 });
  for (const x of [-4.2, 4.2]) {
    for (const z of [-18, -11, -4, 8, 15, 21]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.0, 7), lampMaterial);
      pole.position.set(x, 1.38, z);
      scene.add(pole);
      addSphere(scene, 0.12, lampLight, x, 2.42, z, 1.2, 0.55, 1.2);
    }
  }
  for (const [x, z] of [[-13, 5], [-7, 5], [-13, 13], [-7, 13], [7, 5], [13, 5], [7, 13], [13, 13]] as [number, number][]) {
    makeTree(scene, x, z, 0.58);
  }
  createTreeForest(scene);
  createPalmForest(scene);

  // A civic landmark with softened stone massing, a glass entry, layered roof and warm identity crest.
  const hall = new THREE.Group();
  const limestone = createStuccoMaterial("#e9e1d3", 41);
  const civicTeal = mat("#245e5d", 0.42, 0.18);
  const civicGold = mat("#c9a36b", 0.32, 0.55);
  const civicGlass = cachedMaterial("civic-hall-glass", () => new THREE.MeshPhysicalMaterial({
    color: "#a5cbd0", roughness: 0.12, metalness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06,
  }));
  const civicStone = createStuccoMaterial("#aeb4a8", 17);

  const hallBase = new THREE.Mesh(roundedPrismGeometry(5.55, 4.45, 0.34, 0.28), civicStone);
  hallBase.position.y = 0.17;
  hallBase.castShadow = true;
  hallBase.receiveShadow = true;
  hall.add(hallBase);
  const mainVolume = new THREE.Mesh(roundedPrismGeometry(4.78, 3.45, 2.05, 0.3), limestone);
  mainVolume.position.set(0, 0.34, -0.08);
  mainVolume.castShadow = true;
  mainVolume.receiveShadow = true;
  hall.add(mainVolume);

  // Layered roofline and a raised centre pavilion add a recognisable civic silhouette.
  const roofCornice = new THREE.Mesh(roundedPrismGeometry(5.05, 3.72, 0.2, 0.24), civicTeal);
  roofCornice.position.set(0, 2.38, -0.08);
  roofCornice.castShadow = true;
  hall.add(roofCornice);
  const roofCap = new THREE.Mesh(roundedPrismGeometry(4.72, 3.42, 0.11, 0.2), civicGold);
  roofCap.position.set(0, 2.54, -0.08);
  hall.add(roofCap);
  const pavilion = new THREE.Mesh(roundedPrismGeometry(1.85, 1.38, 0.62, 0.18), limestone);
  pavilion.position.set(0, 2.88, -0.2);
  pavilion.castShadow = true;
  hall.add(pavilion);
  const pavilionRoof = new THREE.Mesh(roundedPrismGeometry(2.05, 1.58, 0.12, 0.2), civicGold);
  pavilionRoof.position.set(0, 3.24, -0.2);
  hall.add(pavilionRoof);

  // Deep blue-green glazed entrance with a warm metal frame and rounded arch detail.
  addBox(hall, 2.72, 1.36, 0.08, civicTeal, 0, 1.15, 1.68, false);
  addBox(hall, 2.48, 1.18, 0.055, civicGlass, 0, 1.17, 1.73, false);
  addBox(hall, 0.075, 1.18, 0.06, civicGold, -0.82, 1.17, 1.77, false);
  addBox(hall, 0.075, 1.18, 0.06, civicGold, 0.82, 1.17, 1.77, false);
  addBox(hall, 0.055, 1.16, 0.06, civicGold, 0, 1.17, 1.78, false);
  const entranceArch = new THREE.Mesh(
    cachedGeometry("civic-entry-arch", () => new THREE.TorusGeometry(0.72, 0.055, 8, 32, Math.PI)),
    civicGold,
  );
  entranceArch.position.set(0, 1.8, 1.76);
  entranceArch.rotation.z = Math.PI;
  hall.add(entranceArch);

  // Five rounded columns sit in front of the glazed entry, with broad stone bases and capitals.
  for (const x of [-1.92, -0.96, 0, 0.96, 1.92]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 18), civicGold);
    base.position.set(x, 0.55, 1.92);
    hall.add(base);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.105, 1.52, 18), limestone);
    pillar.position.set(x, 1.33, 1.92);
    pillar.castShadow = true;
    hall.add(pillar);
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.1, 18), civicGold);
    capital.position.set(x, 2.12, 1.92);
    hall.add(capital);
  }
  addBox(hall, 2.85, 0.14, 0.82, limestone, 0, 0.42, 2.12);
  addBox(hall, 3.25, 0.14, 1.0, civicGold, 0, 0.25, 2.24);
  addBox(hall, 3.65, 0.14, 1.18, limestone, 0, 0.08, 2.36);

  // A dimensional crest and a small flag make the building feel inhabited, not generic.
  const crest = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 18), civicGold);
  crest.scale.set(1, 1, 0.32);
  crest.position.set(0, 2.05, 1.82);
  hall.add(crest);
  const crestCore = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), mat("#f4e8cf", 0.28, 0.18));
  crestCore.scale.set(1, 1, 0.5);
  crestCore.position.set(0, 2.05, 1.91);
  hall.add(crestCore);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.25, 9), civicGold);
  flagPole.position.set(0, 3.95, -0.2);
  hall.add(flagPole);
  addBox(hall, 0.72, 0.34, 0.045, civicTeal, 0.34, 4.24, -0.2, false);
  hall.position.set(0, 0.4, -7.8);
  scene.add(hall);
  addDistrictLabel(scene, "City Hall", 0, -5.1);
  for (let index = 0; index < (lowPowerDevice ? 2 : 5); index++) {
    const car = createCar(scene, -21 + index * 10, 2.75, ["#d94b43", "#2f8295", "#d5a43e", "#e8e6de", "#3e505d"][index]);
    car.userData.speed = 1.4 + (index % 3) * 0.35;
    car.userData.startX = car.position.x;
    const vehicles = (scene.userData.movingVehicles ??= []) as THREE.Group[];
    vehicles.push(car);
  }

}

export type WorldResident = {
  id: string;
  displayName: string;
  publicHandle: string;
  species: string;
  avatarStyle: AvatarStyle;
};

type WorldCanvasProps = {
  isNight: boolean;
  quality: "high" | "low";
  focusResident: WorldResident | null;
};

export default function WorldCanvas({ isNight, quality, focusResident }: WorldCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const movementRef = useRef({ x: 0, z: 0 });
  const nightRef = useRef(isNight);
  const qualityRef = useRef(quality);
  const focusResidentRef = useRef(focusResident);
  nightRef.current = isNight;
  qualityRef.current = quality;
  focusResidentRef.current = focusResident;
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

    acquireSharedSceneResources();
    const scene = new THREE.Scene();
    const daySky = new THREE.Color("#f6dcc0");
    const nightSky = new THREE.Color("#17243a");
    scene.background = daySky.clone();
    scene.fog = new THREE.Fog(daySky, 58, 118);

    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 220);
    camera.position.set(0, 26, 34);
    camera.lookAt(0, 0.6, 0);

    // Adaptive rendering profile: retain detail on desktop, reduce fill-rate and shadow cost on phones.
    const device = navigator as Navigator & { deviceMemory?: number };
    const compactDevice = window.matchMedia("(max-width: 760px)").matches;
    const lowPowerDevice = compactDevice || (device.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const reducedQuality = compactDevice || lowPowerDevice;
    const maxPixelRatio = lowPowerDevice ? 1.15 : 1.5;
    const frameInterval = lowPowerDevice ? 1000 / 30 : 0;
    const renderer = new THREE.WebGLRenderer({
      antialias: !lowPowerDevice,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.shadowMap.enabled = !lowPowerDevice;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = "world-canvas";
    host.appendChild(renderer.domElement);

    // One-time PMREM studio environment gives glass, lacquer and metal convincing reflections.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = lowPowerDevice ? 0.5 : 0.82;
    pmremGenerator.dispose();
    roomEnvironment.dispose();

    const hemisphere = new THREE.HemisphereLight("#fff6e9", "#647178", 1.85);
    scene.add(hemisphere);
    const ambient = new THREE.AmbientLight("#f0e9db", 0.26);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight("#ffe7c9", 3.0);
    sun.position.set(-15, 28, 16);
    sun.castShadow = !lowPowerDevice;
    sun.shadow.mapSize.set(lowPowerDevice ? 512 : reducedQuality ? 1024 : 1536, lowPowerDevice ? 512 : reducedQuality ? 1024 : 1536);
    sun.shadow.bias = -0.00016;
    sun.shadow.normalBias = 0.035;
    sun.shadow.radius = 4;
    sun.shadow.camera.left = -32;
    sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 32;
    sun.shadow.camera.bottom = -32;
    scene.add(sun);

    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    makeCity(scene, houseGroup, lowPowerDevice);
    const movingVehicles = (scene.userData.movingVehicles ?? []) as THREE.Group[];

    let homesAbort: AbortController | null = new AbortController();
    fetch("/api/city/world", { cache: "no-store", signal: homesAbort.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as {
          source?: string;
          homes?: { id: string; type: string; x: number; z: number; rotation: number }[];
        };
      })
      .then((data) => {
        if (!data || data.source !== "database" || !data.homes?.length) return;
        clearGroup(houseGroup);
        const visibleHomes = data.homes.slice(0, lowPowerDevice ? 12 : 32);
        visibleHomes.forEach((home, index) => {
          const x = home.x * 0.4 - 10;
          const z = home.z * 0.55 - 8.5;
          const variant = home.type === "premium" ? 2 : home.type === "patron" ? 3 : index % 4;
          const detail = !lowPowerDevice && index < 8 ? "full" : "simple";
          const homeModel = makeHouse(houseGroup, x, z, variant, detail);
          homeModel.rotation.y = home.rotation || 0;
        });
      })
      .catch(() => {
        // The founding residential quarter remains visible if the database request fails.
      });

    const npcGroups: THREE.Group[] = [];
    const npcSpots: [number, number][] = [
      // Park visitors and people around the fountain.
      [-11, 7], [-8, 10], [-12, 12], [-7, 7], [-10, 5], [-5, 11], [-13.7, 9.2], [-6.4, 8.7],
      // Market shoppers and café visitors.
      [8, 6], [10, 9], [12, 11], [7, 12], [13, 7], [9, 14], [6.2, 9.5], [13.8, 8.6],
      // Civic square and central avenue.
      [-2.5, -3.6], [2.8, -3.8], [4.5, 5.4], [-4.6, 6.2], [15, 2], [-16, 2], [3.8, 15.7], [-4.5, 15.4],
      // Marina walk and transit stop.
      [7.2, 19.2], [14.4, 19.0], [5.2, -1.1], [8.2, -1.2],
    ];
    const npcSpecies = [...CITIZEN_SPECIES].sort(() => Math.random() - 0.5);
    const visibleNpcSpots = lowPowerDevice ? npcSpots.slice(0, 18) : npcSpots;
    visibleNpcSpots.forEach(([x, z], index) => {
      const npc = new THREE.Group();
      createMascot(npc, npcSpecies[index % npcSpecies.length], {
        outfit: ["citizen-teal", "explorer", "builder", "harbor-guard"][index % 4],
        accessory: ["none", "scarf", "cap", "backpack"][index % 4],
      }, undefined, "crowd");
      const size = 0.68 + (index % 4) * 0.035;
      npc.scale.setScalar(size);
      npc.position.set(x, 0.42, z);
      npc.userData.anchorX = x;
      npc.userData.anchorZ = z;
      npc.userData.phase = index * 1.73;
      npc.userData.walkRadius = 0.35 + (index % 3) * 0.22;
      scene.add(npc);
      npcGroups.push(npc);
    });

    const animateMascot = (mascot: THREE.Group, phase: number, intensity: number) => {
      const arms = mascot.userData.animatedArms as THREE.Object3D[] | undefined;
      const legs = mascot.userData.animatedLegs as THREE.Object3D[] | undefined;
      const ears = mascot.userData.animatedEars as THREE.Object3D[] | undefined;
      const head = mascot.userData.headRig as THREE.Group | undefined;
      const body = mascot.userData.bodyRig as THREE.Group | undefined;
      const tail = mascot.userData.tailRig as THREE.Group | undefined;
      arms?.forEach((arm, index) => {
        const side = index === 0 ? 1 : -1;
        arm.rotation.z = side * (0.08 + Math.sin(phase + index * 0.45) * intensity * 0.62);
        arm.rotation.x = 0.08 + Math.cos(phase * 0.82 + index * Math.PI) * intensity * 0.28;
      });
      legs?.forEach((leg, index) => {
        leg.rotation.x = Math.sin(phase + index * Math.PI) * intensity * 0.58;
        leg.rotation.z = Math.cos(phase + index * Math.PI) * intensity * 0.04;
      });
      if (head) {
        head.rotation.z = Math.sin(phase * 0.46) * (0.025 + intensity * 0.12);
        head.rotation.y = Math.cos(phase * 0.3) * (0.012 + intensity * 0.035);
      }
      if (body) body.scale.y = 1 + Math.sin(phase * 1.7) * (0.012 + intensity * 0.018);
      if (tail) {
        tail.rotation.x = Math.sin(phase * 1.3) * (0.08 + intensity * 0.22);
        tail.rotation.y = Math.cos(phase * 0.9) * (0.035 + intensity * 0.12);
      }
      ears?.forEach((ear, index) => {
        ear.rotation.z = Math.sin(phase * 0.82 + index * 1.2) * (0.018 + intensity * 0.08);
      });
    };

    const player = new THREE.Group();
    createMascot(player, "fox", { outfit: "citizen-teal", accessory: "none" });
    player.position.set(-1.7, 0.42, 4.9);
    player.scale.setScalar(1.02);
    scene.add(player);

    // The city leader is a bear; the wider citizen population remains a diverse mix of animal species.
    const mayor = new THREE.Group();
    createMascot(mayor, "bear", { outfit: "harbor-guard", accessory: "none" }, "#244e49");
    mayor.scale.setScalar(1.0);
    mayor.position.set(2.1, 0.42, -5.0);
    const mayorBadge = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), mat("#e9c16d", 0.35, 0.28));
    mayorBadge.position.set(0.16, 0.82, 0.31);
    mayor.add(mayorBadge);
    const mayorTie = new THREE.Mesh(
      new THREE.ConeGeometry(0.095, 0.27, 4),
      mat("#b94b42", 0.48, 0.08),
    );
    mayorTie.position.set(0, 0.92, 0.39);
    mayorTie.rotation.x = Math.PI;
    mayor.add(mayorTie);
    const mayorTieKnot = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 8),
      mat("#d7b36e", 0.36, 0.24),
    );
    mayorTieKnot.position.set(0, 1.1, 0.39);
    mayor.add(mayorTieKnot);
    scene.add(mayor);

    // A dedicated model is reused when a public citizen is selected from the uploaded-style finder.
    const selectedResidentModel = new THREE.Group();
    selectedResidentModel.visible = false;
    scene.add(selectedResidentModel);
    const selectedResidentMascot = new THREE.Group();
    selectedResidentModel.add(selectedResidentMascot);
    const selectedResidentMarker = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.075, 8, 28),
      new THREE.MeshStandardMaterial({ color: "#f2c36f", metalness: 0.5, roughness: 0.32, emissive: "#8e642d", emissiveIntensity: 0.22 }),
    );
    selectedResidentMarker.rotation.x = Math.PI / 2;
    selectedResidentModel.add(selectedResidentMarker);
    let activeResidentId: string | null = null;
    let activeNight = nightRef.current;
    let activeQuality = qualityRef.current;

    let avatarAbort: AbortController | null = new AbortController();
    fetch("/api/citizen/profile", { cache: "no-store", signal: avatarAbort.signal })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { profile?: { species?: string; avatarStyle?: AvatarStyle } };
      })
      .then((data) => {
        if (!data?.profile) return;
        createMascot(player, data.profile.species ?? "fox", data.profile.avatarStyle ?? {});
        // Keep movement transform while updating only the mascot geometry.
      })
      .catch(() => {
        // Guests explore with the sample animal. Signed-in residents load their permanent species.
      });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let rotation = 0.28;
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
      rotation += dx * 0.005;
      camera.position.y = THREE.MathUtils.clamp(camera.position.y + dy * 0.025, 13.5, 32);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = () => { dragging = false; };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom + event.deltaY * 0.001, 0.72, 1.55);
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

    let lastRenderedAt = 0;
    let slowFrameStreak = 0;
    let adaptiveReduced = false;
    const animate = (time: number) => {
      if (document.hidden) {
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(animate);
      if (frameInterval > 0 && time - lastRenderedAt < frameInterval) return;
      lastRenderedAt = time;
      const frameDuration = previousTime === 0 ? 0 : time - previousTime;
      const delta = previousTime === 0 ? 0 : Math.min(frameDuration / 1000, 0.05);
      previousTime = time;

      if (nightRef.current !== activeNight) {
        activeNight = nightRef.current;
        const target = activeNight ? nightSky : daySky;
        scene.background = target.clone();
        scene.fog?.color.copy(target);
        const skyDome = scene.userData.skyDome as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | undefined;
        if (skyDome?.material) skyDome.material.color.set(activeNight ? "#344064" : "#ffffff");
        sun.color.set(activeNight ? "#a9c4ff" : "#ffe3bb");
        sun.intensity = activeNight ? 0.78 : 3.0;
        hemisphere.intensity = activeNight ? 0.85 : 1.85;
        ambient.intensity = activeNight ? 0.52 : 0.26;
        scene.environmentIntensity = activeNight ? (lowPowerDevice ? 0.3 : 0.42) : (lowPowerDevice ? 0.5 : 0.82);
      }

      if (qualityRef.current !== activeQuality) {
        activeQuality = qualityRef.current;
        const highQuality = activeQuality === "high";
        const effectivePixelRatio = lowPowerDevice
          ? Math.min(window.devicePixelRatio, highQuality ? 1.15 : 0.85)
          : Math.min(window.devicePixelRatio, highQuality ? 1.5 : 1.0);
        renderer.setPixelRatio(effectivePixelRatio);
        renderer.shadowMap.enabled = highQuality && !lowPowerDevice;
        sun.castShadow = highQuality && !lowPowerDevice;
      }

      const requestedResident = focusResidentRef.current;
      if (requestedResident?.id !== activeResidentId) {
        activeResidentId = requestedResident?.id ?? null;
        selectedResidentModel.visible = Boolean(requestedResident);
        if (requestedResident) {
          createMascot(selectedResidentMascot, requestedResident.species || "fox", requestedResident.avatarStyle || {});
          selectedResidentModel.visible = true;
          const seed = [...requestedResident.id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
          const district = seed % 4;
          const residentSpots: [number, number][] = [
            [-11.2, 9.1],
            [10.5, 9.2],
            [-11.0, -10.8],
            [10.8, -10.4],
          ];
          const [residentX, residentZ] = residentSpots[district];
          selectedResidentModel.position.set(residentX, 0.42, residentZ);
          selectedResidentModel.rotation.y = (seed % 628) / 100;
        }
      }
      // One-time fallback for devices that still struggle: lower fill-rate, remove dynamic shadows,
      // and trim a few distant citizens instead of letting the frame rate collapse.
      if (!lowPowerDevice && !adaptiveReduced && frameDuration > 25) slowFrameStreak++;
      else if (frameDuration < 21) slowFrameStreak = Math.max(0, slowFrameStreak - 2);
      if (!lowPowerDevice && !adaptiveReduced && slowFrameStreak >= 18) {
        adaptiveReduced = true;
        renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() * 0.82));
        renderer.shadowMap.enabled = false;
        sun.castShadow = false;
        npcGroups.slice(20).forEach((npc) => { npc.visible = false; });
      }
      const keyX = (pressedKeys.has("d") || pressedKeys.has("arrowright") ? 1 : 0) - (pressedKeys.has("a") || pressedKeys.has("arrowleft") ? 1 : 0);
      const keyZ = (pressedKeys.has("s") || pressedKeys.has("arrowdown") ? 1 : 0) - (pressedKeys.has("w") || pressedKeys.has("arrowup") ? 1 : 0);
      let moveX = keyX + movementRef.current.x;
      let moveZ = keyZ + movementRef.current.z;
      const magnitude = Math.hypot(moveX, moveZ);
      if (magnitude > 1) {
        moveX /= magnitude;
        moveZ /= magnitude;
      }
      const moving = magnitude > 0.08;
      if (moving) {
        player.position.x = THREE.MathUtils.clamp(player.position.x + moveX * 3.4 * delta, -23, 23);
        player.position.z = THREE.MathUtils.clamp(player.position.z + moveZ * 3.4 * delta, -23, 23);
        player.rotation.y = Math.atan2(moveX, moveZ);
        player.rotation.z = Math.sin(time * 0.018) * 0.035;
      } else {
        player.rotation.z += (0 - player.rotation.z) * Math.min(delta * 2, 1);
        player.rotation.y += (Math.sin(time * 0.0007) * 0.08 - player.rotation.y) * Math.min(delta * 1.8, 1);
      }
      player.position.y = 0.42 + Math.sin(time * (moving ? 0.014 : 0.0022)) * (moving ? 0.075 : 0.025);
      animateMascot(player, time * (moving ? 0.015 : 0.002), moving ? 0.52 : 0.035);
      animateMascot(mayor, time * 0.0018, 0.025);
      if (selectedResidentModel.visible) animateMascot(selectedResidentMascot, time * 0.005, 0.08);

      npcGroups.forEach((npc, index) => {
        const phase = Number(npc.userData.phase ?? 0);
        const radius = Number(npc.userData.walkRadius ?? 0.4);
        const angle = time * 0.00023 + phase;
        const nextX = Number(npc.userData.anchorX) + Math.sin(angle) * radius;
        const nextZ = Number(npc.userData.anchorZ) + Math.cos(angle * 0.83) * radius;
        npc.position.x = nextX;
        npc.position.z = nextZ;
        npc.position.y = 0.42 + Math.abs(Math.sin(time * 0.003 + index)) * 0.025;
        npc.rotation.y = Math.atan2(Math.cos(angle) * radius, -Math.sin(angle * 0.83) * radius);
        animateMascot(npc, time * 0.009 + phase, 0.15);
      });

      movingVehicles.forEach((vehicle) => {
        const speed = Number(vehicle.userData.speed ?? 0);
        vehicle.position.x += speed * delta;
        if (vehicle.position.x > 25) vehicle.position.x = -25;
        const wheels = vehicle.userData.wheels as THREE.Group[] | undefined;
        wheels?.forEach((wheel) => { wheel.rotation.z -= speed * delta / 0.19; });
      });

      const hasFocusedResident = Boolean(focusResidentRef.current && selectedResidentModel.visible);
      const focusActor = hasFocusedResident ? selectedResidentModel : player;
      if (hasFocusedResident) {
        selectedResidentMarker.position.y = 0.08 + Math.sin(time * 0.004) * 0.04;
        selectedResidentMarker.rotation.z += delta * 0.35;
      }
      const radius = (hasFocusedResident ? 17 : 34) / zoom;
      camera.position.x = focusActor.position.x + Math.sin(rotation + 0.42) * radius * 0.62;
      camera.position.z = focusActor.position.z + Math.cos(rotation + 0.42) * radius * 0.72;
      camera.lookAt(focusActor.position.x, hasFocusedResident ? 1.1 : 0.45, focusActor.position.z);
      renderer.render(scene, camera);
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame) {
        previousTime = 0;
        frame = window.requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      homesAbort?.abort();
      homesAbort = null;
      avatarAbort?.abort();
      avatarAbort = null;
      observer.disconnect();
      environmentTarget.dispose();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          if (!sharedGeometries.has(object.geometry)) object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((entry) => {
            if (!sharedMaterials.has(entry)) entry.dispose();
          });
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      releaseSharedSceneResources();
    };
  }, []);

  return (
    <>
      <div className="world-canvas-host" ref={hostRef} aria-label="NOVARIA 3D metropolitan city. Move your animal mascot with WASD or the on-screen controls." />
      <div
        className={`joystick-shell town-joystick${stickActive ? " is-active" : ""}`}
        role="application"
        aria-label="Touch joystick to walk your animal mascot"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setStickActive(true); updateStick(event); }}
        onPointerMove={(event) => { if (stickActive) updateStick(event); }}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        onLostPointerCapture={resetStick}
      >
        <span className="joystick-label">MOVE</span>
        <span className="joystick-thumb" style={{ transform: `translate(calc(-50% + ${stickPosition.x}px), calc(-50% + ${stickPosition.y}px))` }} />
      </div>
      <div className="desktop-move-hint town-move-hint">W A S D / ARROW KEYS TO WALK · DRAG TO ROTATE · SCROLL TO ZOOM</div>
    </>
  );
}

