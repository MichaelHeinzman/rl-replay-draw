import { render, screen, fireEvent } from "@testing-library/react";
import { ReactNode } from "react";
import Toolbar from "../Toolbar";
import { SettingsProvider } from "../../../contexts/SettingsContext";
import { DrawModeProvider } from "../../../contexts/DrawModeContext";
import { DrawingProvider } from "../../../contexts/DrawingContext";
import { OverlayProvider } from "../../../contexts/OverlayContext";

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <DrawModeProvider>
        <DrawingProvider>
          <OverlayProvider>{children}</OverlayProvider>
        </DrawingProvider>
      </DrawModeProvider>
    </SettingsProvider>
  );
}

describe("Toolbar", () => {
  it("renders the draw toggle button", () => {
    render(<Toolbar />, { wrapper: AllProviders });
    expect(screen.getByText("✦ On")).toBeInTheDocument();
  });

  it("renders all drawing tool buttons", () => {
    render(<Toolbar />, { wrapper: AllProviders });
    expect(screen.getByText("Freehand")).toBeInTheDocument();
    expect(screen.getByText("Line")).toBeInTheDocument();
    expect(screen.getByText("Rect")).toBeInTheDocument();
    expect(screen.getByText("Circle")).toBeInTheDocument();
    expect(screen.getByText("Arrow")).toBeInTheDocument();
  });

  it("renders note and image place buttons", () => {
    render(<Toolbar />, { wrapper: AllProviders });
    expect(screen.getByText(/Note/)).toBeInTheDocument();
    expect(screen.getByText(/Image/)).toBeInTheDocument();
  });

  it("renders undo, redo, and clear action buttons", () => {
    render(<Toolbar />, { wrapper: AllProviders });
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("renders view controls (hide, settings)", () => {
    render(<Toolbar />, { wrapper: AllProviders });
    expect(screen.getByTitle("Hide toolbar")).toBeInTheDocument();
    expect(screen.getByTitle("Settings")).toBeInTheDocument();
  });

  it("renders color swatches", () => {
    const { container } = render(<Toolbar />, { wrapper: AllProviders });
    const swatches = container.querySelectorAll(".rl-toolbar__color");
    // 6 default colors + 1 add button
    expect(swatches.length).toBeGreaterThanOrEqual(7);
  });

  it("renders add color button", () => {
    render(<Toolbar />, { wrapper: AllProviders });
    expect(screen.getByTitle("Add custom color")).toBeInTheDocument();
  });

  it("shows color picker when add color is clicked", () => {
    const { container } = render(<Toolbar />, { wrapper: AllProviders });
    fireEvent.click(screen.getByTitle("Add custom color"));
    expect(
      container.querySelector(".rl-toolbar__color-picker"),
    ).toBeInTheDocument();
  });

  it("renders stroke width buttons", () => {
    const { container } = render(<Toolbar />, { wrapper: AllProviders });
    const sizeDots = container.querySelectorAll(".rl-toolbar__size-dot");
    expect(sizeDots).toHaveLength(4);
  });

  it("applies default grid position class", () => {
    const { container } = render(<Toolbar />, { wrapper: AllProviders });
    const toolbar = container.querySelector(".rl-toolbar");
    expect(toolbar?.classList.contains("rl-toolbar--grid-top-center")).toBe(
      true,
    );
  });

  it("does not apply vertical class for default top-center position", () => {
    const { container } = render(<Toolbar />, { wrapper: AllProviders });
    const toolbar = container.querySelector(".rl-toolbar");
    expect(toolbar?.classList.contains("rl-toolbar--vertical")).toBe(false);
  });
});
