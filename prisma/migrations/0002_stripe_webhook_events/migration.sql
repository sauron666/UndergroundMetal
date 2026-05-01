-- Idempotency log for Stripe webhook replays.
CREATE TABLE "StripeWebhookEvent" (
    "id"          TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StripeWebhookEvent_type_idx"        ON "StripeWebhookEvent"("type");
CREATE INDEX "StripeWebhookEvent_processedAt_idx" ON "StripeWebhookEvent"("processedAt");
