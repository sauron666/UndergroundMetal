import { env } from "@/lib/env";
import type { TicketProvider } from "@prisma/client";

/**
 * Build an outbound ticket URL with the appropriate affiliate / UTM params.
 * Returns the original URL if no tag is configured for that provider.
 *
 * Real revenue requires registering for affiliate programs:
 *   - Ticketpro (BG):     ticketpro.bg / contact partnership desk
 *   - Eventim (DE):       eventim.com/partners
 *   - See Tickets:        seetickets.com/affiliates
 *   - Ticketmaster:       affiliate.ticketmaster.com (Impact Radius)
 *   - DICE:               no public program (direct outbound only)
 */
export function buildTicketUrl(
  provider: TicketProvider,
  rawUrl: string,
  ctx: { userId?: string | null; campaign?: string } = {}
): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  // UTM params for our own attribution
  url.searchParams.set("utm_source", "undergroundmetal");
  url.searchParams.set("utm_medium", "affiliate");
  url.searchParams.set("utm_campaign", ctx.campaign ?? "concert-listing");
  if (ctx.userId) url.searchParams.set("utm_term", ctx.userId.slice(0, 8));

  switch (provider) {
    case "TICKETPRO":
      if (env.TICKETPRO_AFFILIATE_TAG) {
        url.searchParams.set("aff", env.TICKETPRO_AFFILIATE_TAG);
      }
      break;
    case "EVENTIM":
      if (env.EVENTIM_AFFILIATE_TAG) {
        url.searchParams.set("affiliate", env.EVENTIM_AFFILIATE_TAG);
      }
      break;
    case "SEETICKETS":
      if (env.SEETICKETS_AFFILIATE_TAG) {
        url.searchParams.set("aff", env.SEETICKETS_AFFILIATE_TAG);
      }
      break;
    default:
      break;
  }

  return url.toString();
}

export function providerLabel(p: TicketProvider): string {
  return {
    TICKETPRO: "Ticketpro",
    EVENTIM: "Eventim",
    SEETICKETS: "See Tickets",
    TICKETMASTER: "Ticketmaster",
    DICE: "DICE",
    BANDCAMP: "Bandcamp",
    DIRECT: "Box office",
    OTHER: "Other",
  }[p];
}
