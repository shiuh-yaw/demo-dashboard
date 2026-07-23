import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { QrSurface } from "../src/components/qr-surface";

afterEach(() => {
  cleanup();
});

describe("QrSurface", () => {
  it("renders title, caption, and a QR svg encoding the value", () => {
    const { container } = render(
      <QrSurface
        value="bc1qexampleaddress"
        title="Send BTC"
        caption="Scan with any wallet"
        onBack={() => {}}
        backLabel="Back to sources"
      />,
    );
    expect(screen.getByText("Send BTC")).toBeTruthy();
    expect(screen.getByText("Scan with any wallet")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("fires onBack from the back button", () => {
    const onBack = vi.fn();
    render(
      <QrSurface
        value="x"
        title="t"
        caption="c"
        onBack={onBack}
        backLabel="Back to sources"
      />,
    );
    fireEvent.click(screen.getByText("Back to sources"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("renders the icon when iconUrl is provided", () => {
    const { container } = render(
      <QrSurface
        value="x"
        title="t"
        iconUrl="https://example.com/icon.png"
        caption="c"
        onBack={() => {}}
        backLabel="b"
      />,
    );
    expect(container.querySelector("img")).toBeTruthy();
  });
});
