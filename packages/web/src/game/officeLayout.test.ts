import type { AgentSnapshot } from "@token-floor/protocol";
import { describe, expect, it } from "vitest";
import { resolveMovement } from "../lib/movement.js";
import { AVATAR_COLLISION_RADIUS } from "./avatarFactory.js";
import {
  collisionObstacles,
  GRID_SIZE,
  isLoungePoint,
  mainWorkSpots,
  officeLabels,
  officeProps,
  officeRooms,
  officeWalls,
  PLAYER_BOUNDS,
  restSpots,
  spawnSpotForAgent,
  spotForAgent,
  subagentWorkSpots,
  WALL_SIZE
} from "./officeLayout.js";

const main = { status: "active", kind: "main" } as AgentSnapshot;
const sub = { status: "active", kind: "subagent" } as AgentSnapshot;
const bounds = { minX: 0, maxX: 832, minY: 0, maxY: 528 };

describe("office layout", () => {
  it("defines wider rooms and textured room passages", () => {
    expect(officeRooms.map((room) => room.id)).toEqual([
      "workspace",
      "meeting-passage",
      "lounge-passage",
      "executive-codex",
      "executive-claude",
      "meeting-right",
      "meeting-lounge-passage",
      "lounge",
      "future"
    ]);
    expect(officeRooms.find((room) => room.id === "workspace")).toMatchObject({
      width: 288,
      height: 240
    });
    expect(officeRooms.find((room) => room.id === "meeting-right")).toMatchObject({
      width: 256,
      height: 128
    });
    expect(officeRooms.find((room) => room.id === "future")).toMatchObject({ height: 128 });
    expect(officeRooms.find((room) => room.id === "executive-codex")).toMatchObject({
      x: 112,
      height: 128
    });
    expect(officeRooms.find((room) => room.id === "future")).toMatchObject({
      x: 416,
      width: 256
    });
  });

  it("pins occupied-room titles to the top-left and leaves future space untitled", () => {
    const titledRooms = new Set(officeLabels.map((label) => label.roomId));
    const rooms = officeRooms
      .filter((room) => !room.id.includes("passage") && room.id !== "future")
      .map((room) => room.id);
    expect([...titledRooms].sort()).toEqual(rooms.sort());
    expect(titledRooms.has("future")).toBe(false);
    for (const label of officeLabels) {
      const room = officeRooms.find((candidate) => candidate.id === label.roomId)!;
      const dividerOffset = label.roomId === "executive-claude" ? 16 : 8;
      expect(label.x).toBe(room.x + dividerOffset);
      expect(label.y).toBe(room.y + 8);
    }
  });

  it("keeps the Claude title eight pixels clear of the executive divider", () => {
    const divider = officeWalls.find((wall) => wall.x === 232 && wall.width === WALL_SIZE)!;
    const label = officeLabels.find((candidate) => candidate.roomId === "executive-claude")!;
    expect(label.x - (divider.x + divider.width)).toBe(8);
  });

  it("keeps rooms on 32-pixel units with explicit 16-pixel wall and whiteboard exceptions", () => {
    for (const item of officeRooms) {
      expect(item.width % GRID_SIZE).toBe(0);
      const heightUnit =
        item.id === "workspace" || item.id === "meeting-lounge-passage" ? WALL_SIZE : GRID_SIZE;
      expect(item.height % heightUnit).toBe(0);
    }
    for (const prop of officeProps) {
      expect(prop.width % GRID_SIZE).toBe(0);
      expect(prop.height % (prop.id === "whiteboard" ? WALL_SIZE : GRID_SIZE)).toBe(0);
    }
    for (const wall of officeWalls) {
      expect(wall.width % WALL_SIZE).toBe(0);
      expect(wall.height % WALL_SIZE).toBe(0);
    }
    expect(officeWalls.some((wall) => wall.width === WALL_SIZE || wall.height === WALL_SIZE)).toBe(
      true
    );
  });

  it("keeps passage textures inside their destination rooms without cross-floor overlap", () => {
    expect(officeRooms.find((room) => room.id === "meeting-passage")).toMatchObject({
      x: 400,
      texture: "floor-passage"
    });
    expect(officeRooms.find((room) => room.id === "lounge-passage")).toMatchObject({
      x: 400,
      y: 240,
      height: 64,
      texture: "floor-lounge"
    });
    expect(officeRooms.find((room) => room.id === "meeting-lounge-passage")).toMatchObject({
      x: 448,
      y: 192,
      width: 192,
      height: 16,
      texture: "floor-lounge"
    });
    expect(officeRooms.find((room) => room.id === "future")).toMatchObject({
      texture: "floor-work"
    });

    for (const [index, room] of officeRooms.entries()) {
      for (const other of officeRooms.slice(index + 1)) {
        const overlaps =
          room.x < other.x + other.width &&
          room.x + room.width > other.x &&
          room.y < other.y + other.height &&
          room.y + room.height > other.y;
        if (overlaps) expect(room.texture).toBe(other.texture);
      }
    }
  });

  it("removes the meeting-room plant and moves the larger whiteboard to the upper right", () => {
    expect(officeProps.some((prop) => prop.id === "meeting-plant")).toBe(false);
    expect(officeProps.find((prop) => prop.id === "whiteboard")).toMatchObject({
      x: 624,
      y: 96,
      width: 64,
      height: 48
    });
  });

  it("assigns stable work and lounge destinations", () => {
    expect(spotForAgent(main, 0)).toEqual({ x: 144, y: 128 });
    expect(spotForAgent(sub, 0)).toEqual({ x: 144, y: 256 });
    expect(spotForAgent({ ...main, status: "completed" }, 0)).toEqual({ x: 448, y: 256 });
  });

  it("keeps four unique destinations for main and subagents", () => {
    expect(new Set(mainWorkSpots.map((spot) => JSON.stringify(spot))).size).toBe(4);
    expect(new Set(subagentWorkSpots.map((spot) => JSON.stringify(spot))).size).toBe(4);
  });

  it("retains the meeting-table collision without a workstation collision", () => {
    const workSpot = mainWorkSpots[0]!;
    expect(resolveMovement(workSpot, { x: 5, y: 0 }, bounds, collisionObstacles)).toEqual({
      x: workSpot.x + 5,
      y: workSpot.y
    });
    expect(resolveMovement({ x: 475, y: 144 }, { x: 5, y: 0 }, bounds, collisionObstacles)).toEqual(
      { x: 475, y: 144 }
    );
  });

  it("keeps both executive offices inaccessible from the workspace", () => {
    expect(resolveMovement({ x: 176, y: 299 }, { x: 0, y: 6 }, bounds, collisionObstacles)).toEqual(
      { x: 176, y: 299 }
    );
  });

  it("provides an office-to-meeting passage while adjacent wall remains solid", () => {
    expect(
      resolveMovement({ x: 395, y: 160 }, { x: 10, y: 0 }, bounds, collisionObstacles)
    ).toEqual({ x: 405, y: 160 });
    expect(resolveMovement({ x: 395, y: 96 }, { x: 10, y: 0 }, bounds, collisionObstacles)).toEqual(
      { x: 395, y: 96 }
    );
  });

  it("keeps the compact player body outside internal wall edges", () => {
    expect(
      resolveMovement(
        { x: 392, y: 224 },
        { x: 1, y: 0 },
        PLAYER_BOUNDS,
        collisionObstacles,
        AVATAR_COLLISION_RADIUS
      )
    ).toEqual({ x: 392, y: 224 });
    expect(
      resolveMovement(
        { x: 440, y: 216 },
        { x: 0, y: -1 },
        PLAYER_BOUNDS,
        collisionObstacles,
        AVATAR_COLLISION_RADIUS
      )
    ).toEqual({ x: 440, y: 216 });
  });

  it("lets the player cross the widened meeting-to-lounge passage in both directions", () => {
    const downward = resolveMovement(
      { x: 544, y: 184 },
      { x: 0, y: 32 },
      PLAYER_BOUNDS,
      collisionObstacles,
      AVATAR_COLLISION_RADIUS
    );
    expect(downward).toEqual({ x: 544, y: 216 });
    expect(
      resolveMovement(
        downward,
        { x: 0, y: -32 },
        PLAYER_BOUNDS,
        collisionObstacles,
        AVATAR_COLLISION_RADIUS
      )
    ).toEqual({ x: 544, y: 184 });
  });

  it("lets a player caught on the passage corner move sideways and then enter the lounge", () => {
    const caughtAtLeftCorner = { x: 450, y: 200 };
    const escapedCorner = resolveMovement(
      caughtAtLeftCorner,
      { x: 2, y: 0 },
      PLAYER_BOUNDS,
      collisionObstacles,
      AVATAR_COLLISION_RADIUS
    );

    expect(escapedCorner).toEqual({ x: 452, y: 200 });
    expect(
      resolveMovement(
        { x: 464, y: 200 },
        { x: 0, y: 16 },
        PLAYER_BOUNDS,
        collisionObstacles,
        AVATAR_COLLISION_RADIUS
      )
    ).toEqual({ x: 464, y: 216 });
  });

  it("recognizes only lounge coordinates as idle conversation space", () => {
    expect(isLoungePoint({ x: 496, y: 256 })).toBe(true);
    expect(isLoungePoint({ x: 304, y: 256 })).toBe(false);
  });

  it("keeps every rest destination inside the lounge with non-overlapping spacing", () => {
    for (const spot of restSpots) {
      expect(isLoungePoint(spot)).toBe(true);
      expect(spot.x).toBeGreaterThanOrEqual(432);
      expect(spot.x).toBeLessThanOrEqual(656);
      expect(spot.y).toBeGreaterThanOrEqual(256);
      expect(spot.y).toBeLessThanOrEqual(288);
    }
    for (const [index, spot] of restSpots.entries()) {
      for (const other of restSpots.slice(index + 1)) {
        expect(Math.hypot(spot.x - other.x, spot.y - other.y)).toBeGreaterThanOrEqual(GRID_SIZE);
      }
    }
  });

  it("keeps all agent destinations unique", () => {
    const unique = (agent: AgentSnapshot, count: number) =>
      new Set(
        Array.from({ length: count }, (_, index) => JSON.stringify(spotForAgent(agent, index)))
      );
    expect(unique(main, 4).size).toBe(4);
    expect(unique(sub, 4).size).toBe(4);
    expect(unique({ ...main, status: "completed" }, 6).size).toBe(6);
    expect(restSpots).toHaveLength(6);
  });

  it("spawns agents at unique tile centers", () => {
    const spots = Array.from({ length: 4 }, (_, index) => spawnSpotForAgent(index));
    expect(new Set(spots.map((spot) => JSON.stringify(spot))).size).toBe(4);
    for (const spot of spots) {
      expect(spot.x % GRID_SIZE).toBe(GRID_SIZE / 2);
      expect(spot.y % GRID_SIZE).toBe(0);
    }
  });
});
