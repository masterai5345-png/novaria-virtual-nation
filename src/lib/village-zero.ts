/**
 * Deterministic, no-AI parser for follower building commands.
 * Only explicit allowlisted commands can modify the village.
 * External Instagram ingestion requires a verified Meta API connector.
 */
export const VILLAGE_ACTIONS = ["BUILD HOUSE", "BUILD ROAD", "PLANT TREE", "BUILD PARK", "BUILD SHOP"] as const;
export type VillageAction = (typeof VILLAGE_ACTIONS)[number];
export type VillagePlot = { id: string; action: VillageAction; x: number; z: number; source: string };
export type VillageWorld = { version: 1; plots: VillagePlot[]; processedCommentIds: string[] };
export const EMPTY_VILLAGE: VillageWorld = { version: 1, plots: [], processedCommentIds: [] };
export const VILLAGE_GRID_SIZE = 9;
export const MAX_BUILDINGS = 70;

export function parseVillageCommand(comment: string): VillageAction | null {
  const normalized = comment.trim().toUpperCase().replace(/\s+/g, " ");
  const match = normalized.match(/^(?:!|\/)?(BUILD HOUSE|BUILD ROAD|PLANT TREE|BUILD PARK|BUILD SHOP)(?:[.!])?$/);
  return match ? match[1] as VillageAction : null;
}

export function applyVillageComment(
  current: VillageWorld, 
  comment: { id: string; text: string; source?: string },
): { world: VillageWorld; accepted: boolean; reason: string; plot?: VillagePlot } {
  if (!comment.id || comment.id.length > 160 || !/^[\w:.-]+$/.test(comment.id)) {
    return { world: current, accepted: false, reason: "Invalid comment identifier." };
  }
  if (current.processedCommentIds.includes(comment.id)) {
    return { world: current, accepted: false, reason: "Duplicate comment ignored." };
  }
  const action = parseVillageCommand(comment.text);
  if (!action) return { world: current, accepted: false, reason: "Unknown or unsafe command." };
  if (current.plots.length >= MAX_BUILDINGS) {
    return { world: current, accepted: false, reason: "Village is at capacity." };
  }
  // Deterministic spiral-like build slots. No random placement or overwriting.
  const slots: Array<[number, number]> = [];
  for (let radius = 0; radius <= Math.floor(VILLAGE_GRID_SIZE / 2); radius++) {
    for (let z = -radius; z <= radius; z++) {
      for (let x = -radius; x <= radius; x++) {
        if (Math.max(Math.abs(x), Math.abs(z)) === radius) slots.push([x, z]);
      }
    }
  }
  const occupied = new Set(current.plots.map(p => `${p.x},${p.z}`));
  const slot = slots.find(([x,z]) => !occupied.has(`${x},${z}`));
  if (!slot) return { world: current, accepted: false, reason: "No empty plot available." };
  const plot: VillagePlot = {
    id: `plot-${current.plots.length + 1}`, action, x: slot[0], z: slot[1],
    source: (comment.source || "demo").slice(0, 32),
  };
  return {
    world: { version: 1, plots: [...current.plots, plot], processedCommentIds: [...current.processedCommentIds, comment.id] },
    accepted: true, reason: "Command accepted.", plot,
  };
}
