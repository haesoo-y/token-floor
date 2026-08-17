import type { AgentSnapshot } from "@token-floor/protocol";
import { describe, expect, it } from "vitest";
import { resolveMovement } from "../lib/movement.js";
import { AVATAR_COLLISION_RADIUS } from "./avatarFactory.js";
import {
  collisionObstacles,
  GRID_SIZE,
  isLoungePoint,
  LOUNGE_PASSAGE,
  mainWorkSpots,
  officeLabels,
  officeProps,
  officeRooms,
  officeWalls,
  OFFICE_WIDTH,
  PLAYER_BOUNDS,
  PLAYER_START,
  restSpots,
  spawnSpotForAgent,
  spotForAgent,
  subagentWorkSpots,
  WALL_SIZE
} from "./officeLayout.js";

const main = { status: "active", kind: "main" } as AgentSnapshot;
const sub = { status: "active", kind: "subagent" } as AgentSnapshot;
const bounds = { minX: 0, maxX: OFFICE_WIDTH, minY: 0, maxY: 528 };

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
      width: 320,
      height: 240
    });
    expect(officeRooms.find((room) => room.id === "meeting-right")).toMatchObject({
      width: 256,
      height: 96
    });
    expect(officeRooms.find((room) => room.id === "lounge")).toMatchObject({ height: 128 });
    expect(officeRooms.find((room) => room.id === "future")).toMatchObject({ height: 128 });
    expect(officeRooms.find((room) => room.id === "executive-codex")).toMatchObject({
      x: 112,
      width: 160,
      height: 128
    });
    expect(officeRooms.find((room) => room.id === "executive-claude")).toMatchObject({
      width: 160
    });
    expect(officeRooms.find((room) => room.id === "future")).toMatchObject({
      x: 448,
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
    const divider = officeWalls.find((wall) => wall.x === 264 && wall.width === WALL_SIZE)!;
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
      x: 432,
      y: 96,
      texture: "floor-passage"
    });
    expect(officeRooms.find((room) => room.id === "lounge-passage")).toMatchObject({
      x: 432,
      y: 240,
      height: 64,
      texture: "floor-lounge"
    });
    expect(officeRooms.find((room) => room.id === "meeting-lounge-passage")).toMatchObject({
      x: 480,
      y: 160,
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

  it("keeps the whiteboard on the meeting room's upper-right wall", () => {
    expect(officeProps.some((prop) => prop.id === "meeting-plant")).toBe(false);
    expect(officeProps.find((prop) => prop.id === "whiteboard")).toMatchObject({
      x: 640,
      y: 96,
      width: 64,
      height: 48
    });
  });

  it("spawns the player in the meeting room without intersecting a solid", () => {
    const meetingRoom = officeRooms.find((room) => room.id === "meeting-right")!;
    expect(PLAYER_START.x).toBeGreaterThanOrEqual(meetingRoom.x);
    expect(PLAYER_START.x).toBeLessThanOrEqual(meetingRoom.x + meetingRoom.width);
    expect(PLAYER_START.y).toBeGreaterThanOrEqual(meetingRoom.y);
    expect(PLAYER_START.y).toBeLessThanOrEqual(meetingRoom.y + meetingRoom.height);
    expect(
      collisionObstacles.some(
        (obstacle) =>
          PLAYER_START.x + AVATAR_COLLISION_RADIUS > obstacle.x &&
          PLAYER_START.x - AVATAR_COLLISION_RADIUS < obstacle.x + obstacle.width &&
          PLAYER_START.y + AVATAR_COLLISION_RADIUS > obstacle.y &&
          PLAYER_START.y - AVATAR_COLLISION_RADIUS < obstacle.y + obstacle.height
      )
    ).toBe(false);
  });

  it("assigns stable work and lounge destinations", () => {
    expect(spotForAgent(main, 0)).toEqual({ x: 144, y: 128 });
    expect(spotForAgent(sub, 0)).toEqual({ x: 144, y: 256 });
    expect(spotForAgent({ ...main, status: "completed" }, 0)).toEqual({ x: 528, y: 256 });
  });

  it("keeps eighteen unique destinations for each active role", () => {
    expect(new Set(mainWorkSpots.map((spot) => JSON.stringify(spot))).size).toBe(18);
    expect(new Set(subagentWorkSpots.map((spot) => JSON.stringify(spot))).size).toBe(18);
    expect(new Set(restSpots.map((spot) => JSON.stringify(spot))).size).toBe(restSpots.length);
  });

  it("gives thirty simultaneous actors distinct spawn positions", () => {
    const spawns = Array.from({ length: 30 }, (_, index) => spawnSpotForAgent(index));
    expect(new Set(spawns.map((spot) => JSON.stringify(spot))).size).toBe(30);
  });

  it("retains the meeting-table collision without a workstation collision", () => {
    const workSpot = mainWorkSpots[0]!;
    expect(resolveMovement(workSpot, { x: 5, y: 0 }, bounds, collisionObstacles)).toEqual({
      x: workSpot.x + 5,
      y: workSpot.y
    });
    expect(resolveMovement({ x: 523, y: 112 }, { x: 5, y: 0 }, bounds, collisionObstacles)).toEqual(
      { x: 523, y: 112 }
    );
  });

  it("keeps both executive offices inaccessible from the workspace", () => {
    expect(resolveMovement({ x: 192, y: 299 }, { x: 0, y: 6 }, bounds, collisionObstacles)).toEqual(
      { x: 192, y: 299 }
    );
  });

  it("provides an office-to-meeting passage while adjacent wall remains solid", () => {
    expect(
      resolveMovement({ x: 427, y: 128 }, { x: 10, y: 0 }, bounds, collisionObstacles)
    ).toEqual({ x: 437, y: 128 });
    expect(resolveMovement({ x: 427, y: 80 }, { x: 10, y: 0 }, bounds, collisionObstacles)).toEqual(
      { x: 427, y: 80 }
    );
  });

  it("keeps the compact player body outside internal wall edges", () => {
    expect(
      resolveMovement(
        { x: 424, y: 224 },
        { x: 1, y: 0 },
        PLAYER_BOUNDS,
        collisionObstacles,
        AVATAR_COLLISION_RADIUS
      )
    ).toEqual({ x: 424, y: 224 });
    expect(
      resolveMovement(
        { x: 472, y: 184 },
        { x: 0, y: -1 },
        PLAYER_BOUNDS,
        collisionObstacles,
        AVATAR_COLLISION_RADIUS
      )
    ).toEqual({ x: 472, y: 184 });
  });

  it("lets the player cross the widened meeting-to-lounge passage in both directions", () => {
    const downward = resolveMovement(
      { x: 592, y: 152 },
      { x: 0, y: 32 },
      PLAYER_BOUNDS,
      collisionObstacles,
      AVATAR_COLLISION_RADIUS
    );
    expect(downward).toEqual({ x: 592, y: 184 });
    expect(
      resolveMovement(
        downward,
        { x: 0, y: -32 },
        PLAYER_BOUNDS,
        collisionObstacles,
        AVATAR_COLLISION_RADIUS
      )
    ).toEqual({ x: 592, y: 152 });
  });

  it("lets a player caught on the passage corner move sideways and then enter the lounge", () => {
    const caughtAtLeftCorner = { x: 482, y: 168 };
    const escapedCorner = resolveMovement(
      caughtAtLeftCorner,
      { x: 2, y: 0 },
      PLAYER_BOUNDS,
      collisionObstacles,
      AVATAR_COLLISION_RADIUS
    );

    expect(escapedCorner).toEqual({ x: 484, y: 168 });
    expect(
      resolveMovement(
        { x: 496, y: 168 },
        { x: 0, y: 16 },
        PLAYER_BOUNDS,
        collisionObstacles,
        AVATAR_COLLISION_RADIUS
      )
    ).toEqual({ x: 496, y: 184 });
  });

  it("recognizes only lounge coordinates as idle conversation space", () => {
    expect(isLoungePoint({ x: 496, y: 192 })).toBe(true);
    expect(isLoungePoint({ x: 304, y: 256 })).toBe(false);
  });

  it("keeps every rest destination inside the lounge with non-overlapping spacing", () => {
    for (const spot of restSpots) {
      expect(isLoungePoint(spot)).toBe(true);
      expect(spot.x).toBeGreaterThanOrEqual(464);
      expect(spot.x).toBeLessThanOrEqual(720);
      expect(spot.y).toBeGreaterThanOrEqual(256);
      expect(spot.y).toBeLessThanOrEqual(288);
    }
    for (const spot of restSpots) {
      expect(Math.hypot(spot.x - LOUNGE_PASSAGE.right, spot.y - 256)).toBeGreaterThanOrEqual(48);
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
