import type { AgentSnapshot } from "@token-floor/protocol";
import type { Point, Rectangle } from "../lib/movement.js";

export const GRID_SIZE = 32;
export const WALL_SIZE = 16;
export const OFFICE_WIDTH = 832;
export const OFFICE_HEIGHT = 528;
export const PLAYER_START = { x: 384, y: 272 } as const;
export const PLAYER_BOUNDS = { minX: 112, maxX: 672, minY: 64, maxY: 448 } as const;
export const PASSAGE_Y = 272;
export const LOUNGE_LANE_Y = 256;
export const LOUNGE_PASSAGE = { left: 384, right: 432 } as const;

export const officeRooms = [
  { id: "workspace", x: 112, y: 64, width: 288, height: 240, texture: "floor-work" },
  { id: "meeting-passage", x: 400, y: 128, width: 32, height: 64, texture: "floor-passage" },
  { id: "lounge-passage", x: 400, y: 240, width: 32, height: 64, texture: "floor-lounge" },
  { id: "executive-codex", x: 112, y: 320, width: 128, height: 128, texture: "floor-work" },
  { id: "executive-claude", x: 240, y: 320, width: 160, height: 128, texture: "floor-work" },
  { id: "meeting-right", x: 416, y: 64, width: 256, height: 128, texture: "floor-passage" },
  {
    id: "meeting-lounge-passage",
    x: 448,
    y: 192,
    width: 192,
    height: 16,
    texture: "floor-lounge"
  },
  { id: "lounge", x: 416, y: 208, width: 256, height: 96, texture: "floor-lounge" },
  { id: "future", x: 416, y: 320, width: 256, height: 128, texture: "floor-work" }
] as const;

export const officeLabels = [
  { roomId: "workspace", x: 120, y: 72, text: "AGENT WORKSPACE", color: 0x93c5fd },
  { roomId: "meeting-right", x: 424, y: 72, text: "MEETING ROOM", color: 0xc4b5fd },
  { roomId: "lounge", x: 424, y: 216, text: "COFFEE LOUNGE", color: 0x5eead4 },
  { roomId: "executive-codex", x: 120, y: 328, text: "CODEX", color: 0x60a5fa },
  { roomId: "executive-claude", x: 256, y: 328, text: "CLAUDE", color: 0xfb923c }
] as const;

export const officeWalls: readonly Rectangle[] = [
  { x: 96, y: 48, width: 592, height: 16 },
  { x: 96, y: 448, width: 592, height: 16 },
  { x: 96, y: 48, width: 16, height: 416 },
  { x: 672, y: 48, width: 16, height: 416 },
  { x: 400, y: 48, width: 16, height: 80 },
  { x: 400, y: 192, width: 16, height: 48 },
  { x: 400, y: 304, width: 16, height: 160 },
  { x: 96, y: 304, width: 320, height: 16 },
  { x: 416, y: 192, width: 32, height: 16 },
  { x: 640, y: 192, width: 48, height: 16 },
  { x: 416, y: 304, width: 272, height: 16 },
  { x: 232, y: 304, width: 16, height: 160 }
] as const;

export const officeProps = [
  {
    id: "meeting-table",
    texture: "meeting-table",
    x: 512,
    y: 144,
    width: 64,
    height: 64,
    solid: true
  },
  { id: "whiteboard", texture: "whiteboard", x: 624, y: 96, width: 64, height: 48, solid: true },
  {
    id: "lounge-plant",
    texture: "plant-small",
    x: 656,
    y: 224,
    width: 32,
    height: 32,
    solid: false
  }
] as const;

export const mainWorkSpots: readonly Point[] = [
  { x: 144, y: 128 },
  { x: 208, y: 128 },
  { x: 272, y: 128 },
  { x: 336, y: 128 }
] as const;

export const subagentWorkSpots: readonly Point[] = [
  { x: 144, y: 256 },
  { x: 208, y: 256 },
  { x: 272, y: 256 },
  { x: 336, y: 256 }
] as const;

export const restSpots: readonly Point[] = [
  { x: 448, y: 256 },
  { x: 544, y: 256 },
  { x: 640, y: 256 },
  { x: 480, y: 288 },
  { x: 576, y: 288 },
  { x: 624, y: 288 }
] as const;

export function isLoungePoint(point: Point): boolean {
  return point.x >= 416 && point.x <= 672 && point.y >= 208 && point.y <= 304;
}

export const usageSpots = {
  codex: { x: 176, y: 384 },
  "claude-code": { x: 320, y: 384 }
} as const;

export const collisionObstacles: readonly Rectangle[] = [
  ...officeWalls,
  ...officeProps
    .filter((prop) => prop.solid)
    .map((prop) => ({
      x: prop.x - prop.width / 2,
      y: prop.y - prop.height / 2,
      width: prop.width,
      height: prop.height
    }))
];

/** Assigns stable work and rest destinations on the compact office grid. */
export function spotForAgent(agent: AgentSnapshot, index: number): Point {
  if (agent.status === "completed") return restSpots[index % restSpots.length]!;
  if (agent.kind === "subagent") return subagentWorkSpots[index % subagentWorkSpots.length]!;
  return mainWorkSpots[index % mainWorkSpots.length]!;
}

export function spawnSpotForAgent(index: number): Point {
  return { x: 336 - (index % 4) * 64, y: 192 + (index % 3) * 32 };
}
