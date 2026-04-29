import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Configure it in .env to use AI features."
      );
    }
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const MODELS = {
  // Heavy reasoning for discovery + curation
  discovery: env.ANTHROPIC_MODEL_DISCOVERY,
  // Fast + cheap for moderation, fact-flagging, summaries
  moderation: env.ANTHROPIC_MODEL_MODERATION,
} as const;
