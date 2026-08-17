// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const findLogoOptions = vi.fn();
vi.mock("@/lib/actions/logo-options", () => ({
  findLogoOptions: (url: string) => findLogoOptions(url),
}));

import { LogoOptions } from "../logo-options";

afterEach(() => {
  cleanup();
  findLogoOptions.mockReset();
});

/** Click the "Find logos" affordance and wait for the candidates to land. */
async function open(props: Partial<{ value: string; onSelect: () => void }> = {}) {
  render(
    <LogoOptions
      websiteUrl="https://wellsfargo.com"
      value={props.value ?? ""}
      onSelect={props.onSelect ?? (() => {})}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /find logos/i }));
  await waitFor(() => expect(findLogoOptions).toHaveBeenCalled());
}

describe("LogoOptions", () => {
  it("looks nothing up until asked", () => {
    render(
      <LogoOptions websiteUrl="https://acme.com" value="" onSelect={() => {}} />,
    );
    expect(findLogoOptions).not.toHaveBeenCalled();
  });

  it("shows every candidate on a light and a dark tile", async () => {
    findLogoOptions.mockResolvedValue({
      options: ["https://acme.com/wordmark-white.png", "https://acme.com/mark.png"],
    });
    await open();

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /use logo option/i })).toHaveLength(2),
    );
    // Two <img> per candidate: the white-ink wordmark has to be visible
    // against something, or it reads as a broken URL.
    const images = document.querySelectorAll("img");
    expect(images).toHaveLength(4);
  });

  it("hands the chosen candidate back", async () => {
    const onSelect = vi.fn();
    findLogoOptions.mockResolvedValue({ options: ["https://acme.com/a.png"] });
    await open({ onSelect });

    fireEvent.click(
      await screen.findByRole("button", { name: "Use logo option 1" }),
    );
    expect(onSelect).toHaveBeenCalledWith("https://acme.com/a.png");
  });

  it("marks the current logo as chosen", async () => {
    findLogoOptions.mockResolvedValue({ options: ["https://acme.com/a.png"] });
    await open({ value: "https://acme.com/a.png" });

    const tile = await screen.findByRole("button", {
      name: "Use logo option 1",
    });
    expect(tile.getAttribute("aria-pressed")).toBe("true");
  });

  it("drops a candidate whose image will not render", async () => {
    findLogoOptions.mockResolvedValue({ options: ["https://acme.com/gone.png"] });
    await open();

    const tile = await screen.findByRole("button", {
      name: "Use logo option 1",
    });
    fireEvent.error(tile.querySelector("img")!);

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /use logo option/i }),
      ).toBeNull(),
    );
    expect(screen.getByText(/no logos found/i)).toBeTruthy();
  });

  it("offers a retry when the lookup finds nothing", async () => {
    findLogoOptions.mockResolvedValue({ options: [], error: "403" });
    await open();

    expect(await screen.findByText("403")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => expect(findLogoOptions).toHaveBeenCalledTimes(2));
  });

  it("reports a thrown lookup instead of hanging on the spinner", async () => {
    findLogoOptions.mockRejectedValue(new Error("network"));
    await open();

    expect(await screen.findByText(/could not look up logos/i)).toBeTruthy();
  });
});
