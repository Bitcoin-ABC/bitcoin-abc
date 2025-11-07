// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { render, screen, waitFor, cleanup, act } from "@testing-library/react";

import UpgradeCountdown from "../UpgradeCountdown";

const TARGET_PAST_DATE = new Date("2025-11-15T12:00:01Z");
const TARGET_FUTURE_DATE = new Date("2025-11-14T12:00:00Z");
const TARGET_GRACE_PERIOD_DATE = new Date("2025-11-15T18:00:01Z");
const API_URL = "https://avalanche.cash/api/info/XEC";

const POST_DATE_TEXT =
  "Upgrade complete! Avalanche Pre-Consensus now live on mainnet!";

const originalFetch = global.fetch;
const RealDate = Date;

const getMockFetch = () => global.fetch as jest.MockedFunction<typeof fetch>;

const setCurrentDate = (date: Date) => {
  const time = date.getTime();
  class MockDate extends Date {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(time);
        return;
      }

      super(...(args as ConstructorParameters<typeof Date>));
    }

    static now(): number {
      return time;
    }
  }

  global.Date = MockDate as unknown as DateConstructor;
};

const resetDate = () => {
  global.Date = RealDate;
};

describe("UpgradeCountdown", () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    resetDate();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    resetDate();
  });

  it("shows the countdown banner before the target date without fetching", () => {
    setCurrentDate(TARGET_FUTURE_DATE);

    render(<UpgradeCountdown />);

    expect(
      screen.getByText("Avalanche Pre-Consensus coming to mainnet!")
    ).toBeInTheDocument();
    expect(getMockFetch()).not.toHaveBeenCalled();
  });

  it("fetches blocks when the target date has passed and displays the remaining count", async () => {
    setCurrentDate(TARGET_PAST_DATE);
    expect(Date.now()).toBe(TARGET_PAST_DATE.getTime());

    getMockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ blocksUntilUpgrade: 5 }),
    } as unknown as Response);

    render(<UpgradeCountdown />);

    await act(async () => Promise.resolve());

    await waitFor(() => expect(getMockFetch()).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(
        screen.getByText((content) =>
          content
            .replace(/\s+/g, " ")
            .includes("5 blocks until Avalanche Pre-consensus is live!")
        )
      ).toBeInTheDocument()
    );

    expect(getMockFetch()).toHaveBeenCalledWith(API_URL);
  });

  it("shows the post-upgrade banner when the API reports a live upgrade", async () => {
    setCurrentDate(TARGET_PAST_DATE);
    expect(Date.now()).toBe(TARGET_PAST_DATE.getTime());

    getMockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ blocksUntilUpgrade: -1 }),
    } as unknown as Response);

    render(<UpgradeCountdown />);

    await act(async () => Promise.resolve());

    await waitFor(() => expect(getMockFetch()).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(screen.getByText(POST_DATE_TEXT)).toBeInTheDocument()
    );
  });

  it("skips polling and shows the post-upgrade banner after the grace period", async () => {
    setCurrentDate(TARGET_GRACE_PERIOD_DATE);

    render(<UpgradeCountdown />);

    await act(async () => Promise.resolve());

    await waitFor(() =>
      expect(screen.getByText(POST_DATE_TEXT)).toBeInTheDocument()
    );

    expect(getMockFetch()).not.toHaveBeenCalled();
  });

  it("falls back to the post-upgrade banner when the API request fails", async () => {
    setCurrentDate(TARGET_PAST_DATE);
    expect(Date.now()).toBe(TARGET_PAST_DATE.getTime());

    getMockFetch().mockRejectedValueOnce(new Error("Network"));

    render(<UpgradeCountdown />);

    await act(async () => Promise.resolve());

    await waitFor(() => expect(getMockFetch()).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(screen.getByText(POST_DATE_TEXT)).toBeInTheDocument()
    );
  });
});
