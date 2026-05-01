import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { authMock, discoverMock, consumeMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  discoverMock: vi.fn(),
  consumeMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/server/ai/discovery", async () => {
  const actual = await vi.importActual<
    typeof import("@/server/ai/discovery")
  >("@/server/ai/discovery");
  return {
    ...actual,
    discover: discoverMock,
    attachLocalBands: vi.fn((x) => x),
  };
});
vi.mock("@/server/security/rate-limit", () => ({
  consumeToken: consumeMock,
  ipKey: () => "ip:test",
  userKey: () => "user:test",
}));

import { POST } from "@/app/api/discover/route";

beforeEach(() => {
  vi.clearAllMocks();
  consumeMock.mockResolvedValue(true);
  authMock.mockResolvedValue(null);
});

afterEach(() => {
  delete process.env.DISCOVERY_DISABLED;
});

function makeReq(body: unknown) {
  return new Request("http://localhost/api/discover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/discover kill-switch", () => {
  it("returns 503 immediately when DISCOVERY_DISABLED=1", async () => {
    process.env.DISCOVERY_DISABLED = "1";
    const res = await POST(makeReq({ query: "doom" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/temporarily disabled/i);
    // Critically: rate-limit and discover() must not have been touched.
    expect(consumeMock).not.toHaveBeenCalled();
    expect(discoverMock).not.toHaveBeenCalled();
  });

  it("processes normally when the flag is unset", async () => {
    discoverMock.mockResolvedValue({
      mainstream: [],
      underground: [],
      skip: [],
      cached: false,
    });
    const res = await POST(makeReq({ query: "atmospheric black metal" }));
    expect(res.status).toBe(200);
    expect(discoverMock).toHaveBeenCalledOnce();
  });
});
