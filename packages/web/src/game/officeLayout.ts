import type { AgentSnapshot } from "@token-floor/protocol";
import type { Point, Rectangle } from "../lib/movement.js";

export const GRID_SIZE = 32;
export const WALL_SIZE = 16;
export const OFFICE_WIDTH = 896;
export const OFFICE_HEIGHT = 528;
export const PLAYER_START = { x: 480, y: 112 } as const;
export const PLAYER_BOUNDS = { minX: 112, maxX: 704, minY: 64, maxY: 448 } as const;
export const PASSAGE_Y = 272;
export const LOUNGE_LANE_Y = 256;
export const LOUNGE_PASSAGE = { left: 416, right: 464 } as const;

export const officeRooms = [
  { id: "workspace", x: 112, y: 64, width: 320, height: 240, texture: "floor-work" },
  { id: "meeting-passage", x: 432, y: 96, width: 32, height: 64, texture: "floor-passage" },
  { id: "lounge-passage", x: 432, y: 240, width: 32, height: 64, texture: "floor-lounge" },
  { id: "executive-codex", x: 112, y: 320, width: 160, height: 128, texture: "floor-work" },
  { id: "executive-claude", x: 272, y: 320, width: 160, height: 128, texture: "floor-work" },
  { id: "meeting-right", x: 448, y: 64, width: 256, height: 96, texture: "floor-passage" },
  {
    id: "meeting-lounge-passage",
    x: 480,
    y: 160,
    width: 192,
    height: 16,
    texture: "floor-lounge"
  },
  { id: "lounge", x: 448, y: 176, width: 256, height: 128, texture: "floor-lounge" },
  { id: "future", x: 448, y: 320, width: 256, height: 128, texture: "floor-work" }
] as const;

export const officeLabels = [
  { roomId: "workspace", x: 120, y: 72, text: "AGENT WORKSPACE", color: 0x93c5fd },
  { roomId: "meeting-right", x: 456, y: 72, text: "MEETING ROOM", color: 0xc4b5fd },
  { roomId: "lounge", x: 456, y: 184, text: "COFFEE LOUNGE", color: 0x7bd88f },
  { roomId: "executive-codex", x: 120, y: 328, text: "CODEX", color: 0x60a5fa },
  { roomId: "executive-claude", x: 288, y: 328, text: "CLAUDE", color: 0xfb923c }
] as const;

export const officeWalls: readonly Rectangle[] = [
  { x: 96, y: 48, width: 624, height: 16 },
  { x: 96, y: 448, width: 624, height: 16 },
  { x: 96, y: 48, width: 16, height: 416 },
  { x: 704, y: 48, width: 16, height: 416 },
  { x: 432, y: 48, width: 16, height: 48 },
  { x: 432, y: 160, width: 16, height: 80 },
  { x: 432, y: 304, width: 16, height: 160 },
  { x: 96, y: 304, width: 352, height: 16 },
  { x: 448, y: 160, width: 32, height: 16 },
  { x: 672, y: 160, width: 48, height: 16 },
  { x: 448, y: 304, width: 272, height: 16 },
  { x: 264, y: 304, width: 16, height: 160 }
] as const;

export const officeProps = [
  {
    id: "meeting-table",
    texture: "meeting-table",
    x: 560,
    y: 112,
    width: 64,
    height: 64,
    solid: true
  },
  { id: "whiteboard", texture: "whiteboard", x: 640, y: 96, width: 64, height: 48, solid: true },
  {
    id: "lounge-plant",
    texture: "plant-small",
    x: 672,
    y: 208,
    width: 32,
    height: 32,
    solid: false
  }
] as const;

const workColumns = [144, 192, 240, 288, 336, 384] as const;
const workSpots = (rows: readonly number[]): readonly Point[] =>
  rows.flatMap((y) => workColumns.map((x) => ({ x, y })));

export const mainWorkSpots = workSpots([128, 96, 160]);
export const subagentWorkSpots = workSpots([256, 224, 288]);

export const restSpots: readonly Point[] = [
  { x: 528, y: 256 },
  { x: 592, y: 256 },
  { x: 688, y: 256 },
  { x: 528, y: 288 },
  { x: 624, y: 288 },
  { x: 672, y: 288 }
] as const;

export function isLoungePoint(point: Point): boolean {
  return point.x >= 448 && point.x <= 704 && point.y >= 176 && point.y <= 304;
}

export function isWorkspacePoint(point: Point): boolean {
  return point.x >= 112 && point.x <= 432 && point.y >= 64 && point.y <= 304;
}

export const usageSpots = {
  codex: { x: 192, y: 384 },
  "claude-code": { x: 352, y: 384 }
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
  return { x: 144 + (index % 9) * 32, y: 96 + Math.floor(index / 9) * 32 };
}
