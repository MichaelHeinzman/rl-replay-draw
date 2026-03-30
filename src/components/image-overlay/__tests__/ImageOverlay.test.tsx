import { render, screen, fireEvent } from "@testing-library/react";
import ImageOverlay from "../ImageOverlay";
import { PlacedImage } from "../../../types/drawing";

function makeImage(overrides: Partial<PlacedImage> = {}): PlacedImage {
  return {
    id: "test-img-1",
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    x: 50,
    y: 60,
    width: 100,
    height: 80,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("ImageOverlay", () => {
  it("renders an image element", () => {
    const img = makeImage();
    const { container } = render(
      <ImageOverlay image={img} onUpdate={vi.fn()} onRemove={vi.fn()} />,
    );
    const imgEl = container.querySelector("img") as HTMLImageElement;
    expect(imgEl).toBeInTheDocument();
    expect(imgEl.getAttribute("src")).toBe(img.src);
  });

  it("positions at image coordinates", () => {
    const img = makeImage({ x: 200, y: 300 });
    const { container } = render(
      <ImageOverlay image={img} onUpdate={vi.fn()} onRemove={vi.fn()} />,
    );
    const el = container.querySelector(".rl-image") as HTMLElement;
    expect(el.style.left).toBe("200px");
    expect(el.style.top).toBe("300px");
  });

  it("renders with correct dimensions", () => {
    const img = makeImage({ width: 150, height: 120 });
    const { container } = render(
      <ImageOverlay image={img} onUpdate={vi.fn()} onRemove={vi.fn()} />,
    );
    const imgEl = container.querySelector("img") as HTMLImageElement;
    expect(imgEl.style.width).toBe("150px");
    expect(imgEl.style.height).toBe("120px");
  });

  it("calls onRemove when close button is clicked", () => {
    const img = makeImage();
    const onRemove = vi.fn();
    render(<ImageOverlay image={img} onUpdate={vi.fn()} onRemove={onRemove} />);
    const closeBtn = screen.getByTitle("Remove image");
    fireEvent.click(closeBtn);
    expect(onRemove).toHaveBeenCalledWith("test-img-1");
  });

  it("has a resize handle", () => {
    const img = makeImage();
    const { container } = render(
      <ImageOverlay image={img} onUpdate={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(container.querySelector(".rl-image__resize")).toBeInTheDocument();
  });
});
