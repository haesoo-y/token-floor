import type Phaser from "phaser";
import {
  OFFICE_HEIGHT,
  OFFICE_WIDTH,
  officeLabels,
  officeProps,
  officeRooms,
  officeWalls
} from "./officeLayout.js";

/** Builds a compact office whose rooms and retained props align to the 32-pixel grid. */
export function createOfficeWorld(scene: Phaser.Scene): void {
  scene.add.rectangle(0, 0, OFFICE_WIDTH, OFFICE_HEIGHT, 0x0b1118).setOrigin(0);
  officeRooms.forEach((room) =>
    scene.add.tileSprite(room.x, room.y, room.width, room.height, room.texture).setOrigin(0)
  );
  officeProps.forEach((prop) => {
    scene.add.image(prop.x, prop.y, prop.texture).setDepth(prop.y);
  });
  officeWalls.forEach((wall) =>
    scene.add
      .rectangle(wall.x, wall.y, wall.width, wall.height, 0x101820)
      .setOrigin(0)
      .setDepth(2000)
  );
  officeLabels.forEach((label) => addLabel(scene, label.x, label.y, label.text, label.color));
}

function addLabel(scene: Phaser.Scene, x: number, y: number, label: string, color: number): void {
  scene.add
    .text(x, y, label, {
      color: `#${color.toString(16).padStart(6, "0")}`,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      letterSpacing: 1,
      padding: { x: 6, y: 4 },
      backgroundColor: "#0d2033dd"
    })
    .setDepth(25);
}
