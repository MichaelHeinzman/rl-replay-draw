import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { SettingsProvider, useSettingsContext } from "../SettingsContext";

function wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

describe("SettingsContext", () => {
  it("provides default settings", () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper });
    expect(result.current.settings.toolbarGrid).toEqual({
      row: "top",
      col: "center",
    });
    expect(result.current.settings.customColors).toEqual([]);
  });

  it("adds a custom color", () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper });
    act(() => result.current.addCustomColor("#ff00ff"));
    expect(result.current.settings.customColors).toContain("#ff00ff");
  });

  it("does not add duplicate custom colors", () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper });
    act(() => result.current.addCustomColor("#ff00ff"));
    act(() => result.current.addCustomColor("#ff00ff"));
    expect(
      result.current.settings.customColors.filter((c) => c === "#ff00ff"),
    ).toHaveLength(1);
  });

  it("removes a custom color", () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper });
    act(() => result.current.addCustomColor("#ff00ff"));
    act(() => result.current.removeCustomColor("#ff00ff"));
    expect(result.current.settings.customColors).not.toContain("#ff00ff");
  });

  it("sets toolbar grid and resets drag position", () => {
    const { result } = renderHook(() => useSettingsContext(), { wrapper });
    act(() => result.current.setToolbarPosition({ x: 100, y: 200 }));
    expect(result.current.settings.toolbarPosition).toEqual({
      x: 100,
      y: 200,
    });

    act(() => result.current.setToolbarGrid({ row: "bottom", col: "right" }));
    expect(result.current.settings.toolbarGrid).toEqual({
      row: "bottom",
      col: "right",
    });
    expect(result.current.settings.toolbarPosition).toBeNull();
  });

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useSettingsContext())).toThrow(
      "useSettingsContext must be used within SettingsProvider",
    );
  });
});
