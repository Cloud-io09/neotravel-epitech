import { describe, expect, it, vi } from "vitest";

import { getFollowupDelays, resolvePostFollowupOutcome } from "./scheduleFollowups";

describe("followup scheduling rules", () => {
  it("uses J+2 then J+7 for standard quote followups", () => {
    vi.stubEnv("DEMO_FAST_FOLLOWUP", "false");

    const delays = getFollowupDelays({});

    expect(delays.map((delay) => delay.label)).toEqual(["STANDARD_J2", "STANDARD_J7"]);
  });

  it("keeps high value leads in human review after two unanswered followups", () => {
    expect(resolvePostFollowupOutcome({ sentFollowupsWithoutResponse: 2, highValue: true })).toBe("HUMAN_REVIEW");
    expect(resolvePostFollowupOutcome({ sentFollowupsWithoutResponse: 2, highValue: false })).toBe("CLOSED");
  });
});
