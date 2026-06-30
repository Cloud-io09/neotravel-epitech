import { describe, expect, it, vi } from "vitest";

import { getFollowupDelays, resolvePostFollowupOutcome } from "./scheduleFollowups";

describe("followup scheduling rules", () => {
  it("uses J+1, J+3 then J+7 for standard quote followups", () => {
    vi.stubEnv("DEMO_FAST_FOLLOWUP", "false");

    const delays = getFollowupDelays({});

    expect(delays.map((delay) => delay.label)).toEqual(["STANDARD_J1", "STANDARD_J3", "STANDARD_J7"]);
  });

  it("uses a single J+1 followup for urgent quote followups", () => {
    vi.stubEnv("DEMO_FAST_FOLLOWUP", "false");

    const delays = getFollowupDelays({ isUrgent: true });

    expect(delays.map((delay) => delay.label)).toEqual(["URGENT_J1"]);
  });

  it("compresses the standard sequence to minutes in demo mode", () => {
    vi.stubEnv("DEMO_FAST_FOLLOWUP", "true");

    const delays = getFollowupDelays({});

    expect(delays.map((delay) => delay.label)).toEqual([
      "DEMO_STANDARD_J1",
      "DEMO_STANDARD_J3",
      "DEMO_STANDARD_J7",
    ]);
  });

  it("closes leads after three unanswered standard followups", () => {
    expect(resolvePostFollowupOutcome({ sentFollowupsWithoutResponse: 2 })).toBe("PENDING");
    expect(resolvePostFollowupOutcome({ sentFollowupsWithoutResponse: 3 })).toBe("CLOSED");
  });
});
