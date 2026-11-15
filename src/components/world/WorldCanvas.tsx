"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import { CITIZEN_SPECIES, type CitizenSpecies } from "@/lib/animals";

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

function mat(color: string, roughness = 0.82, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
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
  castShadow = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
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
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(scaleX, scaleY, scaleZ);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((entry) => entry.dispose());
      }
    });
  }
}

function createMascot(group: THREE.Group, speciesName: string, style: AvatarStyle = {}, outfitOverride?: string) {
  clearGroup(group);
  const species = ANIMAL_LOOKS[speciesName] ? speciesName : "fox";
  const look = ANIMAL_LOOKS[species];
  const coatColor = COAT_COLORS[style.furTone ?? ""] ?? look.coat;
  const coat = mat(coatColor);
  const belly = mat(look.belly);
  const muzzle = mat(look.muzzle);
  const dark = mat("#252b2b", 0.48);
  const eyeWhite = mat("#fffaf1", 0.3);
  const outfit = mat(outfitOverride ?? OUTFIT_COLORS[style.outfit ?? "citizen-teal"] ?? OUTFIT_COLORS["citizen-teal"]);
  const gold = mat("#e4b65f", 0.45, 0.2);

  // Compact mascot proportions: oversized head, rounded body, short limbs.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.43, 4, 9), outfit);
  torso.position.set(0, 0.66, 0);
  torso.scale.set(1, 1, 0.83);
  torso.castShadow = true;
  group.add(torso);
  addSphere(group, 0.25, belly, 0, 0.66, 0.235, 0.86, 1.06, 0.42);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.28, 3, 7), coat);
    arm.position.set(side * 0.36, 0.71, 0.02);
    arm.rotation.z = side * -0.35;
    group.add(arm);
    const foot = addSphere(group, 0.15, dark, side * 0.2, 0.12, 0.08, 1.08, 0.6, 1.35);
    foot.castShadow = true;
  }

  if (look.special === "mane") addSphere(group, 0.55, mat("#9a5e2d"), 0, 1.39, -0.035, 1.12, 1.08, 0.78);

  const head = addSphere(group, 0.43, coat, 0, 1.4, 0.015, 1.02, 0.97, 0.9);
  head.castShadow = true;

  for (const side of [-1, 1]) {
    if (look.ears === "point") {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.38, 7), coat);
      ear.position.set(side * 0.29, 1.78, 0.015);
      ear.rotation.z = side * -0.18;
      group.add(ear);
    } else if (look.ears === "long") {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.46, 4, 8), coat);
      ear.position.set(side * 0.2, 1.92, 0.01);
      ear.rotation.z = side * -0.1;
      group.add(ear);
    } else if (look.ears === "floppy") {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34, 4, 8), coat);
      ear.position.set(side * 0.36, 1.57, 0.015);
      ear.rotation.z = side * -0.72;
      group.add(ear);
    } else if (look.ears === "round" || look.ears === "antler") {
      addSphere(group, look.ears === "antler" ? 0.13 : 0.15, coat, side * 0.34, 1.72, 0.015, 1, 1, 0.72);
    }
  }

  // A few species-specific silhouettes make the residents recognisable at town scale.
  if (look.ears === "antler") {
    for (const side of [-1, 1]) {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.36, 6), gold);
      antler.position.set(side * 0.22, 1.99, 0.0);
      antler.rotation.z = side * 0.38;
      group.add(antler);
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.2, 6), gold);
      branch.position.set(side * 0.34, 2.08, 0.02);
      branch.rotation.z = side * -0.7;
      group.add(branch);
    }
  }
  if (look.face === "frog") {
    for (const side of [-1, 1]) {
      addSphere(group, 0.16, coat, side * 0.22, 1.76, 0.16);
    }
  }

  const eyeY = look.face === "frog" ? 1.78 : 1.48;
  for (const side of [-1, 1]) {
    if (look.face === "panda") addSphere(group, 0.115, dark, side * 0.17, eyeY, 0.355, 1, 1.12, 0.45);
    if (look.face === "raccoon") addSphere(group, 0.11, dark, side * 0.17, eyeY, 0.36, 1.3, 0.72, 0.34);
    const eye = addSphere(group, 0.064, eyeWhite, side * 0.16, eyeY, 0.373, 1, 1.1, 0.7);
    addSphere(group, 0.034, dark, side * 0.16, eyeY - 0.005, 0.421, 1, 1.15, 0.6);
    eye.castShadow = false;
  }

  if (look.special === "beak") {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 6), mat("#e99a32"));
    beak.position.set(0, 1.29, 0.48);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);
  } else if (look.special === "trunk") {
    const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 4, 8), coat);
    trunk.position.set(0, 1.22, 0.47);
    trunk.rotation.x = -0.24;
    group.add(trunk);
  } else {
    addSphere(group, 0.17, muzzle, 0, 1.28, 0.37, 1.18, 0.75, 0.62);
    addSphere(group, 0.045, dark, 0, 1.35, 0.52, 1.1, 0.7, 0.7);
  }

  if (look.face === "tiger") {
    for (const side of [-1, 1]) {
      for (let stripe = 0; stripe < 2; stripe++) {
        const mark = addBox(group, 0.055, 0.19, 0.025, dark, side * (0.28 + stripe * 0.045), 1.69 - stripe * 0.09, 0.33, false);
        mark.rotation.z = side * 0.2;
      }
    }
  }
  if (look.face === "cow") {
    addSphere(group, 0.13, dark, -0.25, 1.55, -0.03, 1, 1.2, 0.45);
    addSphere(group, 0.095, dark, 0.24, 1.22, -0.03, 1.2, 0.8, 0.45);
  }
  if (look.special === "spines") {
    for (let index = 0; index < 7; index++) {
      const x = (index - 3) * 0.085;
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 5), mat("#65452f"));
      spine.position.set(x, 1.76 + Math.abs(3 - index) * -0.012, -0.13);
      spine.rotation.z = x * 0.7;
      group.add(spine);
    }
  }
  if (look.special === "wings") {
    for (const side of [-1, 1]) {
      addSphere(group, 0.2, coat, side * 0.38, 0.82, -0.005, 0.68, 1.28, 0.46);
    }
  }

  if (look.tail === "bushy") {
    const tail = addSphere(group, 0.25, coat, 0, 0.42, -0.42, 0.8, 0.8, 1.7);
    tail.rotation.x = -0.35;
    addSphere(group, 0.13, belly, 0, 0.52, -0.72, 0.86, 0.86, 0.86);
  } else if (look.tail === "long") {
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.46, 4, 8), coat);
    tail.position.set(0, 0.42, -0.43);
    tail.rotation.x = Math.PI / 2.7;
    tail.rotation.z = -0.26;
    group.add(tail);
  } else if (look.tail === "short") {
    addSphere(group, 0.105, coat, 0, 0.42, -0.36, 1, 0.85, 1);
  }

  if (look.special === "trunk") {
    // Elephants receive broad ears to balance the trunk silhouette.
    for (const side of [-1, 1]) addSphere(group, 0.23, coat, side * 0.42, 1.4, -0.015, 1, 1.12, 0.42);
  }

  const accessory = style.accessory;
  if (accessory === "cap") {
    addSphere(group, 0.25, gold, 0, 1.82, 0.04, 1.2, 0.35, 1);
    addBox(group, 0.48, 0.055, 0.23, mat("#bd8e4d"), 0, 1.79, 0.22, false);
  } else if (accessory === "scarf") {
    addBox(group, 0.66, 0.13, 0.15, gold, 0, 1.05, 0.19);
    addBox(group, 0.14, 0.32, 0.1, gold, 0.2, 0.89, 0.24);
  } else if (accessory === "backpack") {
    addBox(group, 0.38, 0.48, 0.22, mat("#a66d43"), 0, 0.72, -0.34);
  }

  group.userData.species = species;
  group.userData.coatMaterial = coat;
  group.userData.outfitMaterial = outfit;
}

function makeTree(scene: THREE.Scene, x: number, z: number, size = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * size, 0.12 * size, 0.62 * size, 7), mat("#745139"));
  trunk.position.y = 0.31 * size;
  group.add(trunk);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48 * size, 1), mat("#39845f"));
  crown.position.y = 0.83 * size;
  crown.scale.set(1, 1.12, 0.9);
  crown.castShadow = true;
  group.add(crown);
  group.position.set(x, 0.42, z);
  scene.add(group);
}

function makeTower(scene: THREE.Scene, x: number, z: number, width: number, depth: number, floors: number, hue: string, rounded = false) {
  const group = new THREE.Group();
  const floorHeight = 0.37;
  const height = floors * floorHeight;
  const frame = mat(hue, 0.48, 0.28);
  const glass = new THREE.MeshStandardMaterial({
    color: "#597783",
    roughness: 0.2,
    metalness: 0.5,
    emissive: "#263d47",
    emissiveIntensity: 0.18,
  });
  const windowLight = new THREE.MeshStandardMaterial({
    color: "#f6dca4",
    roughness: 0.28,
    emissive: "#c99c52",
    emissiveIntensity: 0.22,
  });
  addBox(group, width + 0.7, 0.48, depth + 0.7, mat("#333d3d"), 0, 0.24, 0);
  addBox(group, width + 0.25, 0.24, depth + 0.25, frame, 0, 0.58, 0);
  if (rounded) {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.52, width * 0.52, height, 16), glass);
    core.position.y = 0.7 + height / 2;
    core.castShadow = true;
    group.add(core);
    for (let floor = 0; floor < floors; floor++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.535, width * 0.535, 0.045, 16), frame);
      band.position.y = 0.72 + floor * floorHeight;
      group.add(band);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.54, width * 0.54, 0.018, 16), windowLight);
      ring.position.y = 0.78 + floor * floorHeight;
      group.add(ring);
    }
  } else {
    addBox(group, width, height, depth, glass, 0, 0.7 + height / 2, 0);
    for (let floor = 0; floor < floors; floor++) {
      const y = 0.78 + floor * floorHeight;
      addBox(group, width + 0.08, 0.035, depth + 0.08, frame, 0, y, 0, false);
      const columns = Math.max(3, Math.floor(width / 0.72));
      for (let column = 0; column < columns; column++) {
        const wx = -width / 2 + (column + 0.5) * width / columns;
        addBox(group, width / columns * 0.68, 0.19, 0.035, (floor + column) % 4 === 0 ? windowLight : glass, wx, y + 0.15, depth / 2 + 0.025, false);
      }
    }
  }
  // A stepped roof, crown, and antenna give each skyline silhouette its own profile.
  addBox(group, width + 0.28, 0.2, depth + 0.28, frame, 0, 0.7 + height, 0);
  addBox(group, width * 0.5, 0.38, depth * 0.52, glass, width * 0.12, 0.98 + height, -depth * 0.08);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.72, 7), mat("#d6b16c", 0.4, 0.35));
  antenna.position.set(width * 0.12, 1.52 + height, 0);
  group.add(antenna);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat("#d64c43", 0.35));
  beacon.position.set(width * 0.12, 1.9 + height, 0);
  group.add(beacon);
  group.position.set(x, 0, z);
  scene.add(group);
}

function makeHouse(scene: THREE.Scene, x: number, z: number, variant: number) {
  const group = new THREE.Group();
  const walls = ["#e8e1d4", "#d9e3df", "#e5d6c4", "#d5e0e0"];
  const roofs = ["#3e5b5a", "#786657", "#4e6671", "#9b7256"];
  const wall = mat(walls[variant % walls.length]);
  const roof = mat(roofs[variant % roofs.length]);
  const glass = mat("#93c5c9", 0.18, 0.24);
  addBox(group, 2.1, 0.12, 1.7, mat("#555e5a"), 0, 0.08, 0);
  addBox(group, 1.9, 1.16 + (variant % 3) * 0.24, 1.5, wall, 0, 0.68 + (variant % 3) * 0.12, 0);
  const levels = 1 + (variant % 3);
  for (let floor = 0; floor < levels; floor++) {
    for (const wx of [-0.58, 0.42]) addBox(group, 0.36, 0.27, 0.045, glass, wx, 0.54 + floor * 0.45, 0.77, false);
  }
  addBox(group, 2.05, 0.14, 1.65, roof, 0, 1.3 + (variant % 3) * 0.24, 0);
  addBox(group, 0.32, 0.58, 0.06, mat("#9b7658"), -0.52, 0.36, 0.78);
  if (variant % 2 === 0) {
    addBox(group, 0.9, 0.06, 0.4, roof, 0.28, 0.86, 0.98);
  }
  group.position.set(x, 0.42, z);
  scene.add(group);
}

function addRoadMarkings(scene: THREE.Scene) {
  const asphalt = mat("#343a42", 0.94);
  const sidewalk = mat("#c4c4bc");
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
  const northWalk = new THREE.Mesh(new THREE.PlaneGeometry(52, 0.72), sidewalk);
  northWalk.rotation.x = -Math.PI / 2;
  northWalk.position.set(0, 0.407, -0.56);
  scene.add(northWalk);
  const southWalk = northWalk.clone();
  southWalk.position.z = 4.16;
  scene.add(southWalk);
  void sidewalk;
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
  const body = mat(color, 0.4, 0.2);
  const window = mat("#a8c6ca", 0.14, 0.38);
  const wheel = mat("#252a2d", 0.95);
  addBox(car, 1.55, 0.42, 0.78, body, 0, 0.38, 0);
  addBox(car, 0.82, 0.37, 0.65, window, -0.08, 0.76, 0);
  for (const side of [-1, 1]) {
    for (const axle of [-0.48, 0.48]) {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 12), wheel);
      tyre.rotation.z = Math.PI / 2;
      tyre.position.set(axle, 0.2, side * 0.39);
      car.add(tyre);
    }
  }
  car.position.set(x, 0.42, z);
  scene.add(car);
  return car;
}

function addDistrictLabel(scene: THREE.Scene, label: string, x: number, z: number, tint = "#183a3a") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "rgba(15, 35, 37, .86)";
  context.beginPath();
  context.roundRect(8, 8, 496, 96, 34);
  context.fill();
  context.fillStyle = "#f5f3e9";
  context.font = "700 42px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.toUpperCase(), 256, 58);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, color: tint }));
  sprite.position.set(x, 2.8, z);
  sprite.scale.set(4.3, 0.95, 1);
  scene.add(sprite);
}

function makeCity(scene: THREE.Scene, houseGroup: THREE.Group) {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat("#477f88", 0.32, 0.12));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.32;
  scene.add(sea);

  const land = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), mat("#c9c6b9"));
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
  const park = new THREE.Mesh(new THREE.PlaneGeometry(11, 10), mat("#9cb989"));
  park.rotation.x = -Math.PI / 2;
  park.position.set(-10, 0.39, 9);
  scene.add(park);
  const parkPath = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 9.4), mat("#e5dcc8"));
  parkPath.rotation.x = -Math.PI / 2;
  parkPath.position.set(-10, 0.405, 9);
  scene.add(parkPath);
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.22, 28), mat("#d9d2c4"));
  fountainBase.position.set(-10, 0.53, 9);
  scene.add(fountainBase);
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(0.83, 0.85, 0.08, 28), mat("#72b6c0", 0.22, 0.2));
  fountainWater.position.set(-10, 0.68, 9);
  scene.add(fountainWater);
  makeTreeCluster(scene, -10, 9, 10, 9, 12);

  const market = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), mat("#ddd5c6"));
  market.rotation.x = -Math.PI / 2;
  market.position.set(10, 0.392, 9);
  scene.add(market);
  addBox(scene, 2.3, 1.0, 1.35, mat("#e7e0d4"), 7.3, 0.92, 7.0);
  addBox(scene, 2.3, 0.12, 1.5, mat("#df8c59"), 7.3, 1.45, 7.0);
  addBox(scene, 2.3, 1.0, 1.35, mat("#d8e4e0"), 12.3, 0.92, 10.5);
  addBox(scene, 2.3, 0.12, 1.5, mat("#6d9aa7"), 12.3, 1.45, 10.5);
  addDistrictLabel(scene, "Green Park", -10, 14);
  addDistrictLabel(scene, "Modern Market", 10, 14);

  // A denser skyline around the civic and commercial center.
  const towers: [number, number, number, number, number, string, boolean][] = [
    [-20, -17, 4.4, 4.1, 18, "#344b57", false],
    [-14, -18, 4.0, 4.0, 13, "#7d735f", true],
    [-8, -18, 3.8, 3.8, 10, "#536875", false],
    [7, -18, 4.0, 4.1, 16, "#51636c", false],
    [13, -17, 4.1, 4.0, 13, "#89745a", true],
    [20, -15, 4.6, 4.4, 19, "#2d4658", false],
    [-21, 4, 4.1, 4.0, 12, "#596d75", true],
    [20, 6, 4.1, 4.1, 16, "#516b73", false],
    [-19, 16, 4.0, 4.0, 10, "#8b775e", false],
    [-14, 18, 4.3, 4.0, 14, "#435c6b", true],
    [16, 17, 4.2, 4.2, 12, "#7d6b5a", false],
    [21, 17, 3.8, 3.7, 9, "#435b65", true],
    [1, 19, 4.0, 3.8, 9, "#5e7477", false],
  ];
  for (const [x, z, width, depth, floors, hue, rounded] of towers) {
    makeTower(scene, x, z, width, depth, floors, hue, rounded);
  }

  // Residential quarter behind the avenue. Database-backed plots replace these samples.
  const homePositions: [number, number, number][] = [
    [-17, -11, 0], [-14, -11, 1], [-11, -11, 2], [-8, -11, 3],
    [-17, -7.5, 1], [-14, -7.5, 2], [-11, -7.5, 3], [-8, -7.5, 0],
  ];
  for (const [x, z, variant] of homePositions) makeHouse(scene, x, z, variant);

  for (let index = 0; index < 15; index++) {
    const x = -22 + index * 3.1;
    makeTree(scene, x, 21.2, 0.58 + (index % 3) * 0.08);
  }

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

  // A recognizable civic hall keeps Mayor Otti's place in the city distinct.
  const hall = new THREE.Group();
  addBox(hall, 4.2, 1.9, 3.1, mat("#eee7d9"), 0, 1.15, 0);
  addBox(hall, 4.55, 0.18, 3.4, mat("#1c5a5b"), 0, 2.18, 0);
  addBox(hall, 1.0, 1.3, 0.12, mat("#9a704c"), 0, 0.68, 1.62);
  for (const x of [-1.45, -0.5, 0.5, 1.45]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.52, 10), mat("#fff8eb"));
    pillar.position.set(x, 0.88, 1.7);
    hall.add(pillar);
  }
  hall.position.set(0, 0.4, -7.8);
  scene.add(hall);
  addDistrictLabel(scene, "City Hall", 0, -5.1);

  for (let index = 0; index < 5; index++) {
    const car = createCar(scene, -21 + index * 10, 2.75, ["#d94b43", "#2f8295", "#d5a43e", "#e8e6de", "#3e505d"][index]);
    car.userData.speed = 1.4 + (index % 3) * 0.35;
    car.userData.startX = car.position.x;
  }

  void houseGroup;
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
    scene.background = new THREE.Color("#c4c2ae");
    scene.fog = new THREE.Fog("#c4c2ae", 48, 90);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
    camera.position.set(0, 27, 34);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = "world-canvas";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff2df", "#55616a", 2.25));
    const sun = new THREE.DirectionalLight("#ffe2b7", 3.15);
    sun.position.set(-15, 28, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -32;
    sun.shadow.camera.right = 32;
    sun.shadow.camera.top = 32;
    sun.shadow.camera.bottom = -32;
    scene.add(sun);

    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    makeCity(scene, houseGroup);

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
        data.homes.forEach((home, index) => {
          const x = home.x * 0.4 - 10;
          const z = home.z * 0.55 - 8.5;
          const variant = home.type === "premium" ? 2 : home.type === "patron" ? 3 : index % 4;
          const homeModel = new THREE.Group();
          makeHouseInto(homeModel, variant);
          homeModel.position.set(x, 0.42, z);
          homeModel.rotation.y = home.rotation || 0;
          houseGroup.add(homeModel);
        });
      })
      .catch(() => {
        // The founding residential quarter remains visible if the database request fails.
      });

    const npcGroups: THREE.Group[] = [];
    const npcSpots: [number, number][] = [
      [-11, 7], [-8, 10], [-12, 12], [-7, 7], [-10, 5], [-5, 11],
      [8, 6], [10, 9], [12, 11], [7, 12], [13, 7], [9, 14],
      [-2.5, -3.6], [2.8, -3.8], [4.5, 5.4], [-4.6, 6.2], [15, 2], [-16, 2],
      [3.8, 15.7], [-4.5, 15.4],
    ];
    const npcSpecies = [...CITIZEN_SPECIES].sort(() => Math.random() - 0.5);
    npcSpots.forEach(([x, z], index) => {
      const npc = new THREE.Group();
      createMascot(npc, npcSpecies[index % npcSpecies.length], {
        outfit: ["citizen-teal", "explorer", "builder", "harbor-guard"][index % 4],
        accessory: ["none", "scarf", "cap", "backpack"][index % 4],
      });
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

    const player = new THREE.Group();
    createMascot(player, "fox", { outfit: "citizen-teal", accessory: "none" });
    player.position.set(-1.7, 0.42, 4.9);
    player.scale.setScalar(1.02);
    scene.add(player);

    // Mayor Otti remains the one and only official otter mayor.
    const mayor = new THREE.Group();
    createMascot(mayor, "otter", { outfit: "harbor-guard", accessory: "cap" }, "#155b59");
    mayor.scale.setScalar(1.0);
    mayor.position.set(2.1, 0.42, -5.0);
    const mayorBadge = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), mat("#e9c16d", 0.35, 0.28));
    mayorBadge.position.set(0.16, 0.82, 0.31);
    mayor.add(mayorBadge);
    scene.add(mayor);

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
      camera.position.y = THREE.MathUtils.clamp(camera.position.y + dy * 0.025, 15, 37);
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
      });

      scene.traverse((object) => {
        if (object instanceof THREE.Group && typeof object.userData.speed === "number") {
          object.position.x += Number(object.userData.speed) * delta;
          if (object.position.x > 25) object.position.x = -25;
        }
      });

      const radius = 34 / zoom;
      camera.position.x = player.position.x + Math.sin(rotation + 0.42) * radius * 0.62;
      camera.position.z = player.position.z + Math.cos(rotation + 0.42) * radius * 0.72;
      camera.lookAt(player.position.x, 0.45, player.position.z);
      renderer.render(scene, camera);
    };
    animate(performance.now());

    return () => {
      window.cancelAnimationFrame(frame);
      homesAbort?.abort();
      homesAbort = null;
      avatarAbort?.abort();
      avatarAbort = null;
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
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
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

function makeHouseInto(parent: THREE.Group, variant: number) {
  const walls = ["#e8e1d4", "#d9e3df", "#e5d6c4", "#d5e0e0"];
  const roofs = ["#3e5b5a", "#786657", "#4e6671", "#9b7256"];
  const wall = mat(walls[variant % walls.length]);
  const roof = mat(roofs[variant % roofs.length]);
  const glass = mat("#93c5c9", 0.18, 0.24);
  addBox(parent, 2.1, 0.12, 1.7, mat("#555e5a"), 0, 0.08, 0);
  addBox(parent, 1.9, 1.16 + (variant % 3) * 0.24, 1.5, wall, 0, 0.68 + (variant % 3) * 0.12, 0);
  const levels = 1 + (variant % 3);
  for (let floor = 0; floor < levels; floor++) {
    for (const wx of [-0.58, 0.42]) addBox(parent, 0.36, 0.27, 0.045, glass, wx, 0.54 + floor * 0.45, 0.77, false);
  }
  addBox(parent, 2.05, 0.14, 1.65, roof, 0, 1.3 + (variant % 3) * 0.24, 0);
  addBox(parent, 0.32, 0.58, 0.06, mat("#9b7658"), -0.52, 0.36, 0.78);
}
