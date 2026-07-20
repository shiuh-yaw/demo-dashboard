import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getShareContextMock = vi.fn();
vi.mock("../src/context", () => ({
  getShareContext: (...args: unknown[]) => getShareContextMock(...args),
}));

const stepMock = vi.fn();
vi.mock("../src/use-track", () => ({
  useTrack: () => ({ milestone: vi.fn(), step: stepMock }),
}));

import { BookACallCta } from "../src/cta";

beforeEach(() => {
  getShareContextMock.mockReset();
  stepMock.mockReset();
  document.cookie = "dd_share=; max-age=0; path=/";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BookACallCta", () => {
  it("renders nothing when the context has no cta", async () => {
    getShareContextMock.mockResolvedValue({});
    const { container } = render(<BookACallCta />);

    await waitFor(() => expect(getShareContextMock).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when getShareContext rejects", async () => {
    getShareContextMock.mockRejectedValue(new Error("boom"));
    const { container } = render(<BookACallCta />);

    await waitFor(() => expect(getShareContextMock).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });

  it("renders the CTA button and opens the url + emits step on click", async () => {
    getShareContextMock.mockResolvedValue({
      prospectName: "Acme",
      cta: { label: "Book a call", url: "https://cal.example.com/se" },
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<BookACallCta />);

    const button = await screen.findByRole("button", { name: "Book a call" });
    expect(button).toBeTruthy();

    fireEvent.click(button);

    expect(stepMock).toHaveBeenCalledWith("book_a_call_clicked");
    expect(openSpy).toHaveBeenCalledWith(
      "https://cal.example.com/se",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("passes the dd_share cookie token to getShareContext", async () => {
    document.cookie = "dd_share=tok_xyz; path=/";
    getShareContextMock.mockResolvedValue({});

    render(<BookACallCta />);

    await waitFor(() => expect(getShareContextMock).toHaveBeenCalledWith("tok_xyz"));
  });
});
