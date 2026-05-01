import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: { $queryRaw: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

import { GET } from "@/app/api/health/route";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.MAINTENANCE_MODE;
});

describe("/api/health", () => {
  it("returns 200 with dbLatencyMs when the DB ping succeeds", async () => {
    dbMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe("ok");
    expect(typeof body.dbLatencyMs).toBe("number");
    expect(body.dbLatencyMs).toBeGreaterThanOrEqual(0);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 503 with dbError when the DB ping fails", async () => {
    dbMock.$queryRaw.mockRejectedValue(new Error("connection refused"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.db).toBe("error");
    expect(body.dbError).toMatch(/connection refused/);
  });

  it("surfaces MAINTENANCE_MODE in the response body", async () => {
    process.env.MAINTENANCE_MODE = "1";
    dbMock.$queryRaw.mockResolvedValue([{ ok: 1 }]);
    const res = await GET();
    const body = await res.json();
    expect(body.maintenance).toBe(true);
  });
});
