import { describe, it, expect, vi, beforeEach } from "vitest";

const { stripeMock, dbMock } = vi.hoisted(() => ({
  stripeMock: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  dbMock: {
    stripeWebhookEvent: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_SECRET_KEY: "sk_test_x",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
  },
}));
vi.mock("@/server/stripe", () => ({
  getStripe: async () => stripeMock,
}));
vi.mock("@/lib/db", () => ({ db: dbMock }));

import { POST } from "@/app/api/billing/webhook/route";

function makeReq(rawBody: string) {
  return new Request("http://localhost/api/billing/webhook", {
    method: "POST",
    headers: { "stripe-signature": "t=1,v1=deadbeef" },
    body: rawBody,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Stripe webhook idempotency", () => {
  it("processes a fresh event and writes the idempotency row", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: "evt_first",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          items: { data: [{ price: { id: "price_1" } }] },
          current_period_end: 1900000000,
          cancel_at_period_end: false,
        },
      },
    });
    dbMock.stripeWebhookEvent.create.mockResolvedValue({ id: "evt_first" });
    dbMock.user.findUnique.mockResolvedValue({ id: "u1" });
    dbMock.user.update.mockResolvedValue({});
    dbMock.subscription.upsert.mockResolvedValue({});

    const res = await POST(makeReq("{}"));
    expect(res.status).toBe(200);
    expect(dbMock.stripeWebhookEvent.create).toHaveBeenCalledWith({
      data: { id: "evt_first", type: "customer.subscription.updated" },
    });
    expect(dbMock.user.update).toHaveBeenCalled();
    expect(dbMock.subscription.upsert).toHaveBeenCalled();
  });

  it("short-circuits a replay without re-running side effects", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: "evt_dup",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1", customer: "cus_1", status: "active" } },
    });
    // Simulate the unique-PK collision Prisma raises on duplicate insert.
    dbMock.stripeWebhookEvent.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    );

    const res = await POST(makeReq("{}"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, duplicate: true });
    expect(dbMock.user.update).not.toHaveBeenCalled();
    expect(dbMock.subscription.upsert).not.toHaveBeenCalled();
  });

  it("rejects a bad signature with 400 and never touches the DB", async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeReq("{}"));
    expect(res.status).toBe(400);
    expect(dbMock.stripeWebhookEvent.create).not.toHaveBeenCalled();
  });
});
