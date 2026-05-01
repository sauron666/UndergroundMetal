import { z } from "zod";

// Empty strings in .env (e.g. S3_ENDPOINT="") would otherwise fail
// .url() validation. Treat blanks as "not set" before zod sees them.
const optionalUrl = () =>
  z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().url().optional()
    );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Underground Metal"),

  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),

  AUTH_SECRET: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL_DISCOVERY: z.string().default("claude-opus-4-7"),
  ANTHROPIC_MODEL_MODERATION: z.string().default("claude-haiku-4-5-20251001"),

  MUSICBRAINZ_USER_AGENT: z
    .string()
    .default("UndergroundMetal/0.1 (contact@undergroundmetal.app)"),
  LASTFM_API_KEY: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  BANDSINTOWN_APP_ID: z.string().default("undergroundmetal"),
  SONGKICK_API_KEY: z.string().optional(),

  TICKETPRO_AFFILIATE_TAG: z.string().optional(),
  EVENTIM_AFFILIATE_TAG: z.string().optional(),
  SEETICKETS_AFFILIATE_TAG: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PRICE_PREMIUM_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PREMIUM_YEARLY: z.string().optional(),

  ENABLE_SCRAPERS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ENABLE_AI_MODERATION: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // ---------- Web Push (concert alerts) ----------
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),

  // ---------- Object storage (S3-compatible: AWS S3, Cloudflare R2, Backblaze B2) ----------
  S3_ENDPOINT: optionalUrl(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  // Public CDN base — different from S3_ENDPOINT for R2 (uses *.r2.dev or custom domain)
  NEXT_PUBLIC_S3_PUBLIC_URL: optionalUrl(),

  // ---------- Email (Resend) ----------
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Underground Metal <noreply@undergroundmetal.app>"),
  EMAIL_REPLY_TO: z.string().optional(),

  // ---------- Embeddings (Voyage AI) ----------
  VOYAGE_API_KEY: z.string().optional(),
  VOYAGE_MODEL: z.string().default("voyage-3-large"),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
