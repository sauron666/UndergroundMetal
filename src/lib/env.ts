import { z } from "zod";

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
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
