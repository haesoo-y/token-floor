import { describe, expect, it } from "vitest";
import { interactionForOfficeProp, nextMemoPanelOpenState } from "./officeInteraction.js";

describe("interactionForOfficeProp", () => {
  it("opens memos only from the retained whiteboard", () => {
    expect(interactionForOfficeProp("whiteboard")).toBe("memos");
    expect(interactionForOfficeProp("meeting-table")).toBeUndefined();
    expect(interactionForOfficeProp("plant")).toBeUndefined();
  });

  it("toggles the memo panel on repeated whiteboard interactions", () => {
    expect(nextMemoPanelOpenState(false)).toBe(true);
    expect(nextMemoPanelOpenState(true)).toBe(false);
  });
});
