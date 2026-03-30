import { gridToLayout } from "../settings";

describe("gridToLayout", () => {
  it("returns vertical for left column", () => {
    expect(gridToLayout({ row: "top", col: "left" })).toBe("vertical");
    expect(gridToLayout({ row: "middle", col: "left" })).toBe("vertical");
    expect(gridToLayout({ row: "bottom", col: "left" })).toBe("vertical");
  });

  it("returns vertical for right column", () => {
    expect(gridToLayout({ row: "top", col: "right" })).toBe("vertical");
    expect(gridToLayout({ row: "middle", col: "right" })).toBe("vertical");
    expect(gridToLayout({ row: "bottom", col: "right" })).toBe("vertical");
  });

  it("returns horizontal for center column", () => {
    expect(gridToLayout({ row: "top", col: "center" })).toBe("horizontal");
    expect(gridToLayout({ row: "middle", col: "center" })).toBe("horizontal");
    expect(gridToLayout({ row: "bottom", col: "center" })).toBe("horizontal");
  });
});
