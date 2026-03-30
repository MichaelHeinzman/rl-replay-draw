import { render, screen, fireEvent } from "@testing-library/react";
import { ReactNode } from "react";
import SettingsPanel from "../SettingsPanel";
import { SettingsProvider } from "../../../contexts/SettingsContext";
import { DrawModeProvider } from "../../../contexts/DrawModeContext";

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <DrawModeProvider>{children}</DrawModeProvider>
    </SettingsProvider>
  );
}

describe("SettingsPanel", () => {
  it("renders the settings title", () => {
    render(<SettingsPanel />, { wrapper: AllProviders });
    expect(screen.getByText("SETTINGS")).toBeInTheDocument();
  });

  it("renders the 3x3 grid picker", () => {
    const { container } = render(<SettingsPanel />, { wrapper: AllProviders });
    const cells = container.querySelectorAll(".rl-settings__grid-cell");
    expect(cells).toHaveLength(9);
  });

  it("highlights the default grid position (top-center)", () => {
    const { container } = render(<SettingsPanel />, { wrapper: AllProviders });
    const activeCells = container.querySelectorAll(
      ".rl-settings__grid-cell--active",
    );
    expect(activeCells).toHaveLength(1);
  });

  it("renders all keybind rows", () => {
    render(<SettingsPanel />, { wrapper: AllProviders });
    expect(screen.getByText("Toggle Draw Mode")).toBeInTheDocument();
    expect(screen.getByText("Exit Draw Mode")).toBeInTheDocument();
    expect(screen.getByText("Freehand Tool")).toBeInTheDocument();
    expect(screen.getByText("Line Tool")).toBeInTheDocument();
    expect(screen.getByText("Rectangle Tool")).toBeInTheDocument();
    expect(screen.getByText("Circle Tool")).toBeInTheDocument();
    expect(screen.getByText("Arrow Tool")).toBeInTheDocument();
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
  });

  it("renders save and reset buttons", () => {
    render(<SettingsPanel />, { wrapper: AllProviders });
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Reset Defaults")).toBeInTheDocument();
  });

  it("renders close button", () => {
    render(<SettingsPanel />, { wrapper: AllProviders });
    const closeBtn = screen.getAllByText("✕");
    expect(closeBtn.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the grid hint text", () => {
    render(<SettingsPanel />, { wrapper: AllProviders });
    expect(
      screen.getByText(/Side columns.*vertical.*horizontal/i),
    ).toBeInTheDocument();
  });

  it("allows selecting a different grid cell", () => {
    const { container } = render(<SettingsPanel />, { wrapper: AllProviders });
    const cells = container.querySelectorAll(".rl-settings__grid-cell");
    // Click bottom-right cell (index 8)
    fireEvent.click(cells[8]);
    expect(cells[8].classList.contains("rl-settings__grid-cell--active")).toBe(
      true,
    );
  });
});
