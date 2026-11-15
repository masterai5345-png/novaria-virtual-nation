"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
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

function createFurMaterial(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const fallback = new THREE.MeshPhysicalMaterial({ color, roughness: 0.94, sheen: 0.25, sheenRoughness: 0.92 });
  if (!context) return fallback;
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
    const x = random() * 256;
    const y = random() * 256;
    context.fillRect(x, y, 0.7 + random() * 1.6, 0.7 + random() * 2.2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1.8);
  texture.anisotropy = 4;
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.96,
    metalness: 0,
    sheen: 0.28,
    sheenColor: new THREE.Color(color).multiplyScalar(1.15),
    sheenRoughness: 0.94,
    bumpMap: texture,
    bumpScale: 0.018,
  });
}

function createMascot(group: THREE.Group, speciesName: string, style: AvatarStyle = {}, outfitOverride?: string) {
  clearGroup(group);
  const species = ANIMAL_LOOKS[speciesName] ? speciesName : "fox";
  const look = ANIMAL_LOOKS[species];
  // Citizens can personalise coat colour while their species silhouette and markings remain recognisable.
  const coatColor = COAT_COLORS[style.furTone ?? ""] ?? look.coat;
  const coat = createFurMaterial(coatColor);
  const belly = mat(look.belly, 0.96);
  const muzzle = mat(look.muzzle, 0.88);
  const dark = mat("#20282b", 0.42);
  const eyeWhite = mat("#fffaf0", 0.24);
  const iris = mat(species === "frog" ? "#6b8e44" : species === "wolf" || species === "cat" ? "#79a6a1" : "#9a6840", 0.25);
  const outfitColor = outfitOverride ?? OUTFIT_COLORS[style.outfit ?? "citizen-teal"] ?? OUTFIT_COLORS["citizen-teal"];
  const outfit = new THREE.MeshPhysicalMaterial({ color: outfitColor, roughness: 0.82, metalness: 0.02, sheen: 0.38, sheenColor: new THREE.Color(outfitColor).multiplyScalar(1.1), sheenRoughness: 0.9 });
  const trim = mat("#e9d1a0", 0.48, 0.12);
  const gold = mat("#d6ad68", 0.36, 0.32);
  const sole = mat("#263238", 0.9);
  const animatedArms: THREE.Object3D[] = [];
  const animatedLegs: THREE.Object3D[] = [];

  // Tail is placed behind the body first so it sits naturally in the silhouette.
  if (look.tail === "bushy") {
    const tailRoot = addSphere(group, 0.26, coat, 0.02, 0.48, -0.4, 0.9, 0.92, 1.45);
    tailRoot.rotation.x = -0.25;
    addSphere(group, 0.17, belly, 0.02, 0.5, -0.72, 0.82, 0.82, 0.8);
  } else if (look.tail === "long") {
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 5, 10), coat);
    tail.position.set(0, 0.43, -0.5);
    tail.rotation.x = Math.PI / 2.6;
    tail.rotation.z = -0.22;
    group.add(tail);
    addSphere(group, 0.09, coat, 0, 0.42, -0.82, 1, 0.9, 1.25);
  } else if (look.tail === "short") {
    addSphere(group, 0.11, coat, 0, 0.43, -0.39, 1, 0.88, 1);
  }

  // Soft rounded legs, tailored jacket and detailed shoes.
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.23, 4, 9), coat);
    leg.position.set(side * 0.18, 0.27, 0.015);
    group.add(leg);
    animatedLegs.push(leg);
    addSphere(group, 0.135, sole, side * 0.19, 0.105, 0.11, 1.18, 0.55, 1.45);
    addSphere(group, 0.105, outfit, side * 0.19, 0.16, 0.18, 1.05, 0.48, 1.2);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.31, 5, 9), coat);
    arm.position.set(side * 0.36, 0.78, 0.015);
    arm.rotation.z = side * -0.36;
    group.add(arm);
    animatedArms.push(arm);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.105, 16), trim);
    cuff.position.set(side * 0.465, 0.64, 0.04);
    cuff.rotation.z = side * -0.36;
    group.add(cuff);
    addSphere(group, 0.105, coat, side * 0.48, 0.55, 0.055, 1, 0.94, 0.95);
  }

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.46, 6, 12), outfit);
  torso.position.set(0, 0.67, 0);
  torso.scale.set(1.02, 1.0, 0.86);
  torso.castShadow = true;
  group.add(torso);

  // Tailored chest panel, lapels, buttons, pockets and a fine gold waist line.
  addSphere(group, 0.255, belly, 0, 0.69, 0.245, 0.83, 1.05, 0.38);
  addBox(group, 0.48, 0.055, 0.045, trim, 0, 1.025, 0.286, false);
  addBox(group, 0.17, 0.13, 0.035, outfit, -0.19, 0.88, 0.292, false);
  addBox(group, 0.17, 0.13, 0.035, outfit, 0.19, 0.88, 0.292, false);
  addBox(group, 0.075, 0.23, 0.045, trim, -0.18, 0.83, 0.31, false);
  addBox(group, 0.075, 0.23, 0.045, trim, 0.18, 0.83, 0.31, false);
  for (const y of [0.73, 0.86]) addSphere(group, 0.027, gold, 0.045, y, 0.325, 1, 1, 0.48);
  addBox(group, 0.18, 0.16, 0.035, outfit, -0.19, 0.57, 0.28, false);
  addBox(group, 0.18, 0.16, 0.035, outfit, 0.19, 0.57, 0.28, false);
  addBox(group, 0.2, 0.025, 0.04, gold, 0.19, 0.66, 0.302, false);

  // Neckline and a small official-style enamel badge make clothing feel finished.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 7, 24), trim);
  collar.position.set(0, 1.02, 0.035);
  collar.rotation.x = Math.PI / 2;
  group.add(collar);
  addSphere(group, 0.072, gold, 0.235, 0.91, 0.29, 1, 1, 0.55);
  addSphere(group, 0.033, mat("#fff0c4", 0.28, 0.28), 0.235, 0.91, 0.33, 1, 1, 0.45);

  // Lion's mane and the head are layered, giving the face a soft silhouette.
  if (look.special === "mane") {
    const mane = mat("#9a5e2d", 0.98);
    addSphere(group, 0.55, mane, 0, 1.47, -0.055, 1.14, 1.1, 0.82);
    for (let index = 0; index < 9; index++) {
      const angle = (index / 9) * Math.PI * 2;
      addSphere(group, 0.13, mane, Math.cos(angle) * 0.43, 1.47 + Math.sin(angle) * 0.42, -0.015, 0.9, 1.18, 0.8);
    }
  }
  const head = addSphere(group, 0.45, coat, 0, 1.47, 0.035, 1.04, 0.98, 0.9);
  head.castShadow = true;

  // Species-specific ears with inset inner-ear details.
  for (const side of [-1, 1]) {
    if (look.ears === "point") {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.4, 12), coat);
      ear.position.set(side * 0.29, 1.83, 0.015);
      ear.rotation.z = side * -0.18;
      group.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.25, 10), muzzle);
      inner.position.set(side * 0.29, 1.84, 0.12);
      inner.rotation.z = side * -0.18;
      group.add(inner);
    } else if (look.ears === "long") {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.5, 5, 10), coat);
      ear.position.set(side * 0.2, 1.94, 0.01);
      ear.rotation.z = side * -0.12;
      group.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.043, 0.34, 4, 8), muzzle);
      inner.position.set(side * 0.2, 1.96, 0.095);
      inner.rotation.z = side * -0.12;
      group.add(inner);
    } else if (look.ears === "floppy") {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.37, 5, 9), coat);
      ear.position.set(side * 0.37, 1.58, 0.015);
      ear.rotation.z = side * -0.76;
      group.add(ear);
      addSphere(group, 0.055, muzzle, side * 0.4, 1.57, 0.105, 0.8, 1.2, 0.55);
    } else if (look.ears === "round" || look.ears === "antler") {
      addSphere(group, look.ears === "antler" ? 0.13 : 0.15, coat, side * 0.34, 1.76, 0.015, 1, 1, 0.72);
      addSphere(group, 0.07, muzzle, side * 0.34, 1.765, 0.12, 1, 1, 0.4);
    }
  }

  // Deer antlers, frog eye turrets, elephant ears and owl wings.
  if (look.ears === "antler") {
    for (const side of [-1, 1]) {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.045, 0.38, 9), gold);
      antler.position.set(side * 0.22, 2.04, 0);
      antler.rotation.z = side * 0.36;
      group.add(antler);
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.22, 8), gold);
      branch.position.set(side * 0.34, 2.15, 0.015);
      branch.rotation.z = side * -0.66;
      group.add(branch);
    }
  }
  if (look.face === "frog") {
    for (const side of [-1, 1]) addSphere(group, 0.16, coat, side * 0.22, 1.82, 0.14);
  }
  if (look.special === "trunk") {
    for (const side of [-1, 1]) addSphere(group, 0.24, coat, side * 0.42, 1.47, -0.005, 1, 1.12, 0.45);
  }
  if (look.special === "wings") {
    for (const side of [-1, 1]) addSphere(group, 0.2, coat, side * 0.4, 0.83, -0.015, 0.68, 1.28, 0.48);
  }

  // Expressive eyes: dark socket, warm iris, glossy pupil and tiny catchlight.
  const eyeY = look.face === "frog" ? 1.83 : 1.53;
  for (const side of [-1, 1]) {
    if (look.face === "panda") addSphere(group, 0.125, dark, side * 0.175, eyeY, 0.36, 1, 1.18, 0.42);
    if (look.face === "raccoon") addSphere(group, 0.12, dark, side * 0.175, eyeY, 0.365, 1.36, 0.78, 0.36);
    const socket = addSphere(group, 0.093, dark, side * 0.165, eyeY, 0.37, 1, 1.12, 0.5);
    const sclera = addSphere(group, 0.073, eyeWhite, side * 0.165, eyeY, 0.415, 1, 1.08, 0.45);
    addSphere(group, 0.047, iris, side * 0.155, eyeY - 0.005, 0.451, 1, 1.08, 0.46);
    addSphere(group, 0.027, dark, side * 0.155, eyeY - 0.006, 0.471, 1, 1.1, 0.42);
    addSphere(group, 0.014, eyeWhite, side * 0.17 - 0.012, eyeY + 0.019, 0.49, 1, 1, 0.45);
    addTube(group, [
      new THREE.Vector3(side * 0.255, eyeY + 0.115, 0.38),
      new THREE.Vector3(side * 0.17, eyeY + 0.145, 0.4),
      new THREE.Vector3(side * 0.085, eyeY + 0.11, 0.38),
    ], 0.018, coat);
    socket.castShadow = false;
    sclera.castShadow = false;
  }

  // Cheeks, muzzle, nose and a curved smile add a friendly character expression.
  addSphere(group, 0.16, muzzle, -0.105, 1.3, 0.36, 1.03, 0.78, 0.72);
  addSphere(group, 0.16, muzzle, 0.105, 1.3, 0.36, 1.03, 0.78, 0.72);
  const noseColor = look.special === "beak" ? mat("#e99a32", 0.35) : dark;
  if (look.special === "beak") {
    const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.24, 8), noseColor);
    upperBeak.position.set(0, 1.34, 0.49);
    upperBeak.rotation.x = Math.PI / 2;
    group.add(upperBeak);
    addSphere(group, 0.09, noseColor, 0, 1.27, 0.46, 1.25, 0.45, 0.9);
  } else if (look.special === "trunk") {
    const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.43, 6, 10), coat);
    trunk.position.set(0, 1.18, 0.47);
    trunk.rotation.x = -0.16;
    group.add(trunk);
    addSphere(group, 0.086, muzzle, 0, 0.96, 0.51, 1, 0.7, 0.85);
  } else {
    addSphere(group, 0.052, noseColor, 0, 1.39, 0.51, 1.15, 0.83, 0.75);
    addTube(group, [
      new THREE.Vector3(0, 1.35, 0.51),
      new THREE.Vector3(0, 1.29, 0.53),
      new THREE.Vector3(-0.075, 1.25, 0.5),
    ], 0.012, dark);
    addTube(group, [
      new THREE.Vector3(0, 1.29, 0.53),
      new THREE.Vector3(0.075, 1.25, 0.5),
    ], 0.012, dark);
  }

  // Whisker pores and species markings.
  if (["cat", "fox", "otter", "tiger", "raccoon"].includes(species)) {
    for (const side of [-1, 1]) {
      for (let dot = 0; dot < 3; dot++) addSphere(group, 0.012, dark, side * (0.16 + (dot % 2) * 0.025), 1.27 - Math.floor(dot / 2) * 0.035, 0.49, 1, 1, 0.6);
    }
  }
  if (look.face === "tiger") {
    for (const side of [-1, 1]) {
      for (let stripe = 0; stripe < 3; stripe++) {
        const mark = addBox(group, 0.045, 0.18, 0.026, dark, side * (0.29 + stripe * 0.055), 1.77 - stripe * 0.1, 0.32, false);
        mark.rotation.z = side * (0.17 + stripe * 0.08);
      }
    }
  }
  if (look.face === "cow") {
    addSphere(group, 0.13, dark, -0.25, 1.6, -0.03, 1, 1.2, 0.45);
    addSphere(group, 0.09, dark, 0.24, 1.26, -0.03, 1.2, 0.8, 0.45);
  }
  if (look.special === "spines") {
    for (let index = 0; index < 9; index++) {
      const x = (index - 4) * 0.08;
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.047, 0.2, 7), mat("#65452f", 0.97));
      spine.position.set(x, 1.82 - Math.abs(4 - index) * 0.012, -0.14);
      spine.rotation.z = x * 0.62;
      group.add(spine);
    }
  }

  // Optional accessory. Metal and fabric tones are shared with the city design system.
  if (style.accessory === "cap") {
    addSphere(group, 0.26, gold, 0, 1.91, 0.025, 1.22, 0.34, 1);
    addBox(group, 0.5, 0.05, 0.23, mat("#b98d52", 0.52), 0, 1.88, 0.22, false);
  } else if (style.accessory === "scarf") {
    addBox(group, 0.67, 0.12, 0.15, gold, 0, 1.09, 0.2);
    addBox(group, 0.14, 0.31, 0.1, trim, 0.2, 0.91, 0.24);
  } else if (style.accessory === "backpack") {
    addBox(group, 0.39, 0.48, 0.22, mat("#98633e"), 0, 0.72, -0.34);
    addBox(group, 0.24, 0.08, 0.035, gold, 0, 0.77, -0.47, false);
  }

  group.userData.species = species;
  group.userData.coatMaterial = coat;
  group.userData.outfitMaterial = outfit;
  group.userData.animatedArms = animatedArms;
  group.userData.animatedLegs = animatedLegs;
}
function makeTree(scene: THREE.Scene, x: number, z: number, size = 1) {
  const group = new THREE.Group();
  const bark = mat("#745139", 0.98);
  const leaves = [
    mat("#367c59", 0.98),
    mat("#438b62", 0.97),
    mat("#2f704f", 0.98),
  ];
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * size, 0.16 * size, 0.82 * size, 12), bark);
  trunk.position.y = 0.42 * size;
  trunk.castShadow = true;
  group.add(trunk);
  for (const side of [-1, 1]) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * size, 0.055 * size, 0.5 * size, 8), bark);
    branch.position.set(side * 0.2 * size, 0.72 * size, 0);
    branch.rotation.z = side * -0.62;
    group.add(branch);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.58 * size, 22, 18), leaves[0]);
  crown.position.y = 1.18 * size;
  crown.scale.set(1.02, 1.12, 0.96);
  crown.castShadow = true;
  group.add(crown);
  const clusters: [number, number, number, number][] = [
    [-0.32, 1.04, 0.04, 0.72],
    [0.33, 1.08, -0.02, 0.7],
    [-0.12, 1.43, -0.09, 0.68],
    [0.23, 1.42, 0.08, 0.64],
  ];
  clusters.forEach(([cx, cy, cz, scale], index) => {
    const cluster = new THREE.Mesh(new THREE.SphereGeometry(0.39 * size, 16, 13), leaves[(index + 1) % leaves.length]);
    cluster.position.set(cx * size, cy * size, cz * size);
    cluster.scale.setScalar(scale);
    cluster.castShadow = true;
    group.add(cluster);
  });
  group.position.set(x, 0.4, z);
  scene.add(group);
}
function createFacadeMaterial(baseColor: string, seed: number, rounded = false) {
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
  return new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: texture,
    roughness: rounded ? 0.23 : 0.28,
    metalness: 0.58,
    emissive: "#172c33",
    emissiveIntensity: 0.16,
  });
}

function createAsphaltMaterial() {
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
  return new THREE.MeshStandardMaterial({ color: "#ffffff", map: texture, roughness: 0.98, metalness: 0.01 });
}

function createPaverMaterial() {
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
  return new THREE.MeshStandardMaterial({ color: "#ffffff", map: texture, roughness: 0.96 });
}

function makeTower(scene: THREE.Scene, x: number, z: number, width: number, depth: number, floors: number, hue: string, rounded = false) {
  const group = new THREE.Group();
  const floorHeight = 0.43;
  const height = floors * floorHeight;
  const frame = mat(hue, 0.44, 0.3);
  const darkFrame = mat("#27373c", 0.52, 0.22);
  const facade = createFacadeMaterial(hue, Math.round(Math.abs(x * 7 + z * 11)) % 19, rounded);
  const glass = new THREE.MeshStandardMaterial({
    color: "#587d8b",
    roughness: 0.16,
    metalness: 0.62,
    emissive: "#1d3541",
    emissiveIntensity: 0.1,
  });
  const litGlass = new THREE.MeshStandardMaterial({
    color: "#e9d8ae",
    roughness: 0.24,
    metalness: 0.22,
    emissive: "#d5a85e",
    emissiveIntensity: 0.34,
  });
  const podium = mat("#303e42", 0.62, 0.16);
  const goldTrim = mat("#bd9862", 0.36, 0.46);
  const roofHeight = 1.0 + height;

  // Deep podium and recessed glass lobby make each tower sit convincingly on its plot.
  addBox(group, width + 1.0, 0.6, depth + 1.0, darkFrame, 0, 0.3, 0);
  addBox(group, width + 0.48, 0.66, depth + 0.48, podium, 0, 0.86, 0);
  addBox(group, width + 0.2, 0.12, depth + 0.2, goldTrim, 0, 1.23, 0);
  addBox(group, width * 0.42, 0.72, 0.05, glass, 0, 0.82, depth / 2 + 0.255, false);
  addBox(group, width * 0.18, 0.78, 0.07, darkFrame, 0, 0.83, depth / 2 + 0.3, false);
  for (const side of [-1, 1]) {
    addBox(group, 0.14, 0.78, 0.08, goldTrim, side * width * 0.25, 0.83, depth / 2 + 0.3, false);
    addBox(group, 0.16, 0.62, depth * 0.62, glass, side * (width / 2 + 0.245), 0.84, 0, false);
  }
  // Entrance canopy and polished columns.
  addBox(group, width * 0.55, 0.1, 0.72, frame, 0, 1.34, depth / 2 + 0.34);
  for (const side of [-1, 1]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.7, 12), goldTrim);
    column.position.set(side * width * 0.2, 0.86, depth / 2 + 0.62);
    group.add(column);
  }

  if (rounded) {
    const radius = width * 0.52;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.02, height, 32, 1), glass);
    core.position.y = 1.38 + height / 2;
    core.castShadow = true;
    group.add(core);
    for (let floor = 0; floor < floors; floor++) {
      const y = 1.4 + floor * floorHeight;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.035, radius * 1.035, 0.055, 32), frame);
      band.position.y = y;
      group.add(band);
      const lightRing = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.04, radius * 1.04, 0.018, 32), goldTrim);
      lightRing.position.y = y + 0.055;
      group.add(lightRing);
      for (let pane = 0; pane < 10; pane++) {
        const angle = (pane / 10) * Math.PI * 2;
        const paneMaterial = (floor + pane) % 5 === 0 ? litGlass : glass;
        const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, floorHeight * 0.55), paneMaterial);
        windowPane.position.set(Math.sin(angle) * (radius + 0.012), y + floorHeight * 0.42, Math.cos(angle) * (radius + 0.012));
        windowPane.rotation.y = angle;
        group.add(windowPane);
      }
    }
    for (let fin = 0; fin < 8; fin++) {
      const angle = (fin / 8) * Math.PI * 2;
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.065, height, 0.08), goldTrim);
      mullion.position.set(Math.sin(angle) * (radius + 0.035), 1.38 + height / 2, Math.cos(angle) * (radius + 0.035));
      mullion.rotation.y = angle;
      group.add(mullion);
    }
  } else {
    const core = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), facade);
    core.position.set(0, 1.38 + height / 2, 0);
    core.castShadow = true;
    group.add(core);

    const columns = Math.max(4, Math.min(7, Math.floor(width / 0.66)));
    const frontPaneWidth = (width - 0.36) / columns;
    for (let floor = 0; floor < floors; floor++) {
      const floorY = 1.4 + floor * floorHeight;
      // Strong horizontal slab edges and a slender metallic spandrel.
      addBox(group, width + 0.13, 0.055, depth + 0.13, frame, 0, floorY, 0, false);
      addBox(group, width + 0.04, 0.018, depth + 0.04, goldTrim, 0, floorY + 0.045, 0, false);
      for (let column = 0; column < columns; column++) {
        const paneX = -width / 2 + 0.18 + (column + 0.5) * frontPaneWidth;
        const paneMaterial = (floor * 2 + column * 3) % 7 === 0 ? litGlass : glass;
        addBox(group, frontPaneWidth * 0.76, floorHeight * 0.53, 0.035, paneMaterial, paneX, floorY + floorHeight * 0.42, depth / 2 + 0.025, false);
        addBox(group, frontPaneWidth * 0.035, floorHeight * 0.7, 0.06, darkFrame, paneX - frontPaneWidth * 0.48, floorY + floorHeight * 0.4, depth / 2 + 0.04, false);
      }
      const sideColumns = 3;
      const sidePaneWidth = (depth - 0.3) / sideColumns;
      for (let side = -1; side <= 1; side += 2) {
        for (let column = 0; column < sideColumns; column++) {
          const paneZ = -depth / 2 + 0.15 + (column + 0.5) * sidePaneWidth;
          addBox(group, 0.035, floorHeight * 0.53, sidePaneWidth * 0.75, (floor + column) % 6 === 0 ? litGlass : glass, side * (width / 2 + 0.025), floorY + floorHeight * 0.42, paneZ, false);
        }
      }
    }
    // Vertical fins, corner piers and recessed rooftop glass create a premium facade.
    for (let column = 0; column <= columns; column++) {
      const finX = -width / 2 + (column / columns) * width;
      addBox(group, 0.055, height + 0.05, 0.11, goldTrim, finX, 1.4 + height / 2, depth / 2 + 0.055, false);
    }
    for (const side of [-1, 1]) {
      addBox(group, 0.11, height + 0.04, depth + 0.08, frame, side * (width / 2 + 0.035), 1.4 + height / 2, 0, false);
    }
  }

  // Crown, rooftop plant room, discreet mechanical services and aerial beacon.
  addBox(group, width + 0.42, 0.2, depth + 0.42, frame, 0, roofHeight + 1.32, 0);
  addBox(group, width * 0.38, 0.58, depth * 0.42, darkFrame, width * 0.1, roofHeight + 1.7, -depth * 0.08);
  addBox(group, width * 0.17, 0.24, depth * 0.2, goldTrim, -width * 0.22, roofHeight + 1.66, depth * 0.13);
  const hvac = mat("#788487", 0.7, 0.24);
  const fanDark = mat("#34454a", 0.66, 0.22);
  for (let unit = 0; unit < 3; unit++) {
    const unitX = -width * 0.34 + unit * width * 0.32;
    addBox(group, 0.46, 0.3, 0.42, hvac, unitX, roofHeight + 1.5, depth * 0.28);
    addBox(group, 0.35, 0.045, 0.32, fanDark, unitX, roofHeight + 1.67, depth * 0.28, false);
    const fan = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 16), goldTrim);
    fan.position.set(unitX, roofHeight + 1.7, depth * 0.28);
    group.add(fan);
  }
  // A small rooftop communications dish and safety rail distinguish the roof line.
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mat("#c5c9c3", 0.35, 0.5));
  dish.position.set(width * 0.34, roofHeight + 1.55, -depth * 0.25);
  dish.rotation.x = -Math.PI / 2.3;
  group.add(dish);
  for (const side of [-1, 1]) {
    addBox(group, 0.055, 0.3, depth * 0.7, goldTrim, side * width * 0.48, roofHeight + 1.47, 0, false);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.8, 9), goldTrim);
  antenna.position.set(width * 0.12, roofHeight + 2.18, 0);
  group.add(antenna);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), mat("#d64c43", 0.32));
  beacon.position.set(width * 0.12, roofHeight + 2.62, 0);
  group.add(beacon);
  group.position.set(x, 0, z);
  scene.add(group);
}
function createStuccoMaterial(color: string, seed: number) {
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
}

function makeHouse(parent: THREE.Object3D, x: number, z: number, variant: number) {
  const group = new THREE.Group();
  const walls = ["#e8e1d4", "#d9e3df", "#e5d6c4", "#d5e0e0"];
  const roofs = ["#3e5b5a", "#786657", "#4e6671", "#9b7256"];
  const wall = createStuccoMaterial(walls[variant % walls.length], variant);
  const roof = mat(roofs[variant % roofs.length], 0.58, 0.2);
  const glass = new THREE.MeshStandardMaterial({ color: "#9ac5c8", roughness: 0.14, metalness: 0.42 });
  const frame = mat("#f3eee3", 0.65, 0.08);
  const bronze = mat("#9a7653", 0.42, 0.38);
  const floors = 1 + (variant % 3);
  const floorHeight = 0.72;
  const width = 2.15;
  const depth = 1.72;
  const height = floors * floorHeight;

  addBox(group, width + 0.42, 0.16, depth + 0.42, mat("#77796f"), 0, 0.08, 0);
  addBox(group, width + 0.08, 0.12, depth + 0.08, bronze, 0, 0.18, 0);
  addBox(group, width, height, depth, wall, 0, 0.22 + height / 2, 0);

  // Raised roof slab with a warm timber soffit and a clean architectural parapet.
  addBox(group, width + 0.32, 0.17, depth + 0.32, roof, 0, 0.22 + height + 0.08, 0);
  addBox(group, width + 0.18, 0.07, depth + 0.18, bronze, 0, 0.22 + height + 0.2, 0);
  addBox(group, width * 0.34, 0.16, depth * 0.36, roof, width * 0.23, 0.22 + height + 0.31, -depth * 0.2);
  // Roof garden, skylight and solar panels add believable residential utility details.
  addBox(group, 0.6, 0.06, 0.48, mat("#7ca0a2", 0.18, 0.5), -0.58, 0.22 + height + 0.28, -0.24, false);
  const solar = new THREE.MeshStandardMaterial({ color: "#294b59", roughness: 0.2, metalness: 0.58 });
  for (let panel = 0; panel < 2; panel++) {
    const solarPanel = addBox(group, 0.44, 0.045, 0.54, solar, 0.35 + panel * 0.48, 0.22 + height + 0.32, -0.28, false);
    solarPanel.rotation.x = -0.12;
    for (let line = 0; line < 3; line++) {
      const gridLine = addBox(group, 0.012, 0.012, 0.5, mat("#8cb5ba", 0.3, 0.4), 0.15 + panel * 0.48 + line * 0.15, 0.22 + height + 0.35, -0.28, false);
      gridLine.rotation.x = -0.12;
    }
  }

  for (let floor = 0; floor < floors; floor++) {
    const y = 0.34 + floor * floorHeight;
    addBox(group, width + 0.1, 0.045, depth + 0.1, frame, 0, y, 0, false);
    for (const windowX of [-0.65, 0.0, 0.65]) {
      addBox(group, 0.43, 0.42, 0.045, bronze, windowX, y + 0.35, depth / 2 + 0.035, false);
      addBox(group, 0.34, 0.34, 0.035, glass, windowX, y + 0.36, depth / 2 + 0.065, false);
      addBox(group, 0.035, 0.36, 0.035, frame, windowX, y + 0.36, depth / 2 + 0.09, false);
    }
    for (const side of [-1, 1]) {
      addBox(group, 0.045, 0.38, 0.48, bronze, side * (width / 2 + 0.025), y + 0.36, -0.38, false);
      addBox(group, 0.035, 0.3, 0.37, glass, side * (width / 2 + 0.055), y + 0.37, -0.38, false);
      addBox(group, 0.035, 0.32, 0.035, frame, side * (width / 2 + 0.08), y + 0.37, -0.38, false);
    }
  }

  // Recessed entrance, glass door, side lights and front steps.
  addBox(group, 0.58, 0.7, 0.07, bronze, -0.72, 0.58, depth / 2 + 0.05);
  addBox(group, 0.42, 0.58, 0.035, glass, -0.72, 0.59, depth / 2 + 0.1, false);
  addBox(group, 0.16, 0.65, 0.055, frame, -0.72, 0.6, depth / 2 + 0.13, false);
  addBox(group, 0.45, 0.13, 0.5, frame, -0.72, 0.25, depth / 2 + 0.28);
  addBox(group, 0.6, 0.1, 0.68, bronze, -0.72, 0.08, depth / 2 + 0.34);

  if (floors > 1) {
    // A full-width balcony with slim metal balustrade.
    addBox(group, 1.18, 0.09, 0.48, frame, 0.36, floorHeight + 0.38, depth / 2 + 0.22);
    addBox(group, 1.18, 0.045, 0.045, bronze, 0.36, floorHeight + 0.72, depth / 2 + 0.43, false);
    for (let post = 0; post < 6; post++) {
      addBox(group, 0.035, 0.31, 0.035, bronze, -0.2 + post * 0.22, floorHeight + 0.55, depth / 2 + 0.43, false);
    }
  }
  if (floors > 2) {
    addBox(group, width * 0.42, 0.08, 0.62, roof, -0.42, floorHeight * 2 + 0.44, depth / 2 + 0.18);
    addBox(group, 0.055, 0.31, 0.055, bronze, -0.42, floorHeight * 2 + 0.61, depth / 2 + 0.49);
  }

  // Landscape strip and entry lighting make every home feel occupied.
  addBox(group, 0.44, 0.3, 0.3, mat("#718d66"), 0.78, 0.33, depth / 2 + 0.34);
  addSphere(group, 0.15, mat("#56835d"), 0.78, 0.52, depth / 2 + 0.34, 1.1, 1.1, 0.9);
  const doorLight = new THREE.MeshStandardMaterial({ color: "#f7dfab", emissive: "#dca958", emissiveIntensity: 0.6 });
  addSphere(group, 0.045, doorLight, -1.1, 0.86, depth / 2 + 0.1, 0.75, 0.75, 0.75);

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
  const body = mat(color, 0.32, 0.24);
  const glass = new THREE.MeshStandardMaterial({
    color: "#8fb6c0",
    roughness: 0.14,
    metalness: 0.52,
    transparent: true,
    opacity: 0.94,
  });
  const rubber = mat("#20262a", 0.96);
  const chrome = mat("#b9c6c4", 0.24, 0.78);
  const headlamp = new THREE.MeshStandardMaterial({ color: "#fff4cf", emissive: "#ffdc91", emissiveIntensity: 0.65, roughness: 0.25 });
  const tailLamp = new THREE.MeshStandardMaterial({ color: "#c94842", emissive: "#9e2722", emissiveIntensity: 0.4 });
  addBox(car, 1.72, 0.38, 0.82, body, 0, 0.39, 0);
  addBox(car, 0.96, 0.43, 0.68, glass, -0.05, 0.76, 0);
  addBox(car, 0.13, 0.36, 0.72, body, -0.53, 0.68, 0);
  addBox(car, 0.12, 0.36, 0.72, body, 0.48, 0.68, 0);
  addBox(car, 0.15, 0.12, 0.9, chrome, 0.89, 0.34, 0, false);
  addBox(car, 0.15, 0.12, 0.9, darkFrameMaterial(), -0.89, 0.34, 0, false);
  addBox(car, 0.055, 0.12, 0.16, headlamp, 0.89, 0.47, -0.27, false);
  addBox(car, 0.055, 0.12, 0.16, headlamp, 0.89, 0.47, 0.27, false);
  addBox(car, 0.055, 0.14, 0.15, tailLamp, -0.88, 0.47, -0.28, false);
  addBox(car, 0.055, 0.14, 0.15, tailLamp, -0.88, 0.47, 0.28, false);
  addBox(car, 0.035, 0.16, 0.24, chrome, 0.92, 0.4, 0, false);
  addBox(car, 0.045, 0.035, 0.18, chrome, 0, 0.2, 0, false);
  for (const side of [-1, 1]) {
    for (const axle of [-0.56, 0.55]) {
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.13, 18), rubber);
      tyre.rotation.z = Math.PI / 2;
      tyre.position.set(axle, 0.2, side * 0.405);
      car.add(tyre);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.14, 16), chrome);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(tyre.position);
      car.add(hub);
    }
    for (const doorX of [-0.28, 0.26]) {
      addBox(car, 0.38, 0.018, 0.015, chrome, doorX, 0.53, side * 0.421, false);
    }
    addBox(car, 0.14, 0.09, 0.13, body, 0.36, 0.76, side * 0.41);
    addBox(car, 0.17, 0.035, 0.08, chrome, 0.36, 0.82, side * 0.47, false);
  }
  car.position.set(x, 0.42, z);
  scene.add(car);
  return car;
}

function darkFrameMaterial() {
  return mat("#29383c", 0.68, 0.16);
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
  const planter = new THREE.Group();
  const stone = mat("#b8b7a9", 0.95);
  const soil = mat("#594a3a", 1);
  addBox(planter, width, 0.42, 0.72, stone, 0, 0.21, 0);
  addBox(planter, width - 0.14, 0.06, 0.56, soil, 0, 0.44, 0, false);
  for (let index = 0; index < 5; index++) {
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), mat(index % 2 ? "#56865d" : "#679467", 0.98));
    plant.position.set((index - 2) * (width - 0.28) / 4, 0.63 + (index % 2) * 0.06, Math.sin(index) * 0.13);
    plant.scale.set(1, 0.75, 0.85);
    planter.add(plant);
  }
  planter.position.set(x, 0.41, z);
  scene.add(planter);
}

function createStreetLamp(scene: THREE.Scene, x: number, z: number, height = 2.9) {
  const lamp = new THREE.Group();
  const iron = mat("#34494a", 0.48, 0.38);
  const warm = new THREE.MeshStandardMaterial({ color: "#fff0c7", emissive: "#e9b75d", emissiveIntensity: 0.75, roughness: 0.3 });
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

function createSkyDome(scene: THREE.Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#607d91");
    gradient.addColorStop(0.42, "#a7bdc2");
    gradient.addColorStop(0.72, "#d9c6a9");
    gradient.addColorStop(1, "#f1d1a8");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1024, 512);
    context.globalAlpha = 0.18;
    for (let index = 0; index < 7; index++) {
      const x = 100 + index * 150;
      context.fillStyle = "#fff7e6";
      context.beginPath();
      context.ellipse(x, 175 + (index % 3) * 28, 76, 18, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (!context) return;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(145, 36, 24),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false }),
  );
  sky.renderOrder = -10;
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

function makeCity(scene: THREE.Scene, houseGroup: THREE.Group) {
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
  createShopKiosk(scene, 7.3, 7.0, "Harbor Café", "#b96e54");
  createShopKiosk(scene, 12.3, 10.5, "City Market", "#638d9b");
  createPlanter(scene, 7.0, 12.3, 1.35);
  createPlanter(scene, 13.1, 6.3, 1.35);
  addDistrictLabel(scene, "Green Park", -10, 14);
  addDistrictLabel(scene, "Modern Market", 10, 14);
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
    [-20, -5, 3.2, 3.3, 8, "#657780", true],
    [20, -6, 3.1, 3.2, 9, "#927b60", false],
    [-20, 10, 3.3, 3.1, 7, "#526c78", false],
    [20, 12, 3.2, 3.2, 8, "#7b776b", true],
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

  // Premium street furniture, park benches, planters and traffic controls.
  addStreetFurniture(scene);
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

  // Monumental civic hall with a glass entry, colonnade, steps and a gold city crest.
  const hall = new THREE.Group();
  const limestone = mat("#e7e0d2", 0.82);
  const civicTeal = mat("#205a59", 0.52, 0.16);
  const civicGold = mat("#c9a36b", 0.34, 0.42);
  const civicGlass = new THREE.MeshStandardMaterial({ color: "#9bc2c8", roughness: 0.15, metalness: 0.46 });
  addBox(hall, 5.2, 0.26, 4.0, mat("#8f9388"), 0, 0.13, 0);
  addBox(hall, 4.65, 2.0, 3.2, limestone, 0, 1.25, -0.08);
  addBox(hall, 4.9, 0.2, 3.42, civicTeal, 0, 2.36, -0.08);
  addBox(hall, 4.42, 0.09, 3.1, civicGold, 0, 2.5, -0.08);
  addBox(hall, 2.3, 1.35, 0.05, civicGlass, 0, 1.05, 1.55, false);
  addBox(hall, 0.13, 1.42, 0.1, civicGold, -1.2, 1.02, 1.59, false);
  addBox(hall, 0.13, 1.42, 0.1, civicGold, 1.2, 1.02, 1.59, false);
  for (const x of [-1.8, -0.9, 0, 0.9, 1.8]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 1.65, 16), limestone);
    pillar.position.set(x, 0.96, 1.85);
    hall.add(pillar);
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), civicGold);
    capital.position.set(x, 1.78, 1.85);
    hall.add(capital);
  }
  for (const x of [-1.6, 0, 1.6]) {
    addBox(hall, 0.68, 0.56, 0.035, civicGlass, x, 1.38, 1.61, false);
    addBox(hall, 0.08, 0.6, 0.05, civicGold, x, 1.38, 1.64, false);
  }
  addBox(hall, 2.1, 0.13, 0.75, limestone, 0, 0.42, 2.02);
  addBox(hall, 2.6, 0.13, 0.9, civicGold, 0, 0.25, 2.12);
  addBox(hall, 3.0, 0.13, 1.05, limestone, 0, 0.08, 2.22);
  const crest = new THREE.Mesh(new THREE.CircleGeometry(0.27, 32), civicGold);
  crest.position.set(0, 2.08, 1.69);
  hall.add(crest);
  addSphere(hall, 0.14, mat("#f2e8cf", 0.38, 0.18), 0, 2.08, 1.72);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.6, 8), civicGold);
  flagPole.position.set(0, 3.35, -0.08);
  hall.add(flagPole);
  addBox(hall, 0.68, 0.34, 0.035, civicTeal, 0.34, 3.87, -0.08);
  hall.position.set(0, 0.4, -7.8);
  scene.add(hall);
  addDistrictLabel(scene, "City Hall", 0, -5.1);

  for (let index = 0; index < 5; index++) {
    const car = createCar(scene, -21 + index * 10, 2.75, ["#d94b43", "#2f8295", "#d5a43e", "#e8e6de", "#3e505d"][index]);
    car.userData.speed = 1.4 + (index % 3) * 0.35;
    car.userData.startX = car.position.x;
  }

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
    scene.background = new THREE.Color("#b9c9c7");
    scene.fog = new THREE.Fog("#b9c9c7", 58, 118);

    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 220);
    camera.position.set(0, 20, 34);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.domElement.className = "world-canvas";
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff5e8", "#53646a", 2.1));
    scene.add(new THREE.AmbientLight("#f0e9db", 0.34));
    const sun = new THREE.DirectionalLight("#ffe3bb", 3.35);
    sun.position.set(-15, 28, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
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
        clearGroup(houseGroup);
        data.homes.forEach((home, index) => {
          const x = home.x * 0.4 - 10;
          const z = home.z * 0.55 - 8.5;
          const variant = home.type === "premium" ? 2 : home.type === "patron" ? 3 : index % 4;
          const homeModel = makeHouse(houseGroup, x, z, variant);
          homeModel.rotation.y = home.rotation || 0;
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
      [3.8, 15.7], [-4.5, 15.4], [-13, 8.4], [-11.5, 12.8], [-8.5, 11.5],
      [6.5, 8.8], [11.5, 12], [-15, -8], [16, 14],
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

    const animateMascot = (mascot: THREE.Group, phase: number, intensity: number) => {
      const swing = Math.sin(phase) * intensity;
      const arms = mascot.userData.animatedArms as THREE.Object3D[] | undefined;
      const legs = mascot.userData.animatedLegs as THREE.Object3D[] | undefined;
      arms?.forEach((arm, index) => { arm.rotation.z = (index === 0 ? 1 : -1) * (0.16 + swing); });
      legs?.forEach((leg, index) => { leg.rotation.x = (index === 0 ? -1 : 1) * swing * 0.72; });
    };

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
      animateMascot(player, time * (moving ? 0.015 : 0.002), moving ? 0.52 : 0.035);
      animateMascot(mayor, time * 0.0018, 0.025);

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

