type Strings<T> = { [K in keyof T]: T[K] extends object ? Strings<T[K]> : string };

const _en = {
  nav: {
    discover: "Discover",
    bands: "Bands",
    concerts: "Concerts",
    articles: "Articles",
    search: "Search",
    signin: "Sign in",
    summon: "Summon",
  },
  home: {
    hero_eyebrow: "AI Underground Discovery",
    hero_title_1: "Dig deeper than the",
    hero_title_2: "algorithm",
    hero_title_3: "allows.",
    hero_lede:
      "From household names to one-demo-wonders rotting on a Bandcamp page since 2009 — an AI orchestrator built for the underground rock and metal scene. Discover bands. Find concerts. Read sourced, verified writing.",
    pillars: "The Four Pillars",
    pillars_subtitle: "One platform. The whole scene.",
    cta_title: "Built for the scene. Owned by no label.",
    cta_lede:
      "Sign in to follow bands, save concerts, write articles, and unlock the deep archive.",
  },
  discover: {
    title: "Summon the bands you don't know yet.",
    lede:
      "Describe a sound, mood, lyrical theme, region, or era. Our AI orchestrator returns two tiers — mainstream giants and deep underground — each with sourced references you can verify.",
    placeholder: "Slavic atmospheric black metal with folk elements",
    summon: "Summon",
    conjuring: "Conjuring",
    served_from_cache: "Served from cache",
    mainstream: "Mainstream",
    mainstream_subtitle: "Likely on your radar already",
    underground: "Underground",
    underground_subtitle: "Dig in. Tape-traded, demo-only, regional gems.",
    start_with: "Start with:",
  },
  bands: {
    title: "Bands",
    indexed: "bands indexed · sorted by underground score",
    bg_archive: "BG Archive",
    by_country: "By country:",
    empty_title: "The crypt is empty.",
    empty_lede:
      "No bands have been seeded yet. Run the seed script or use AI Discovery to add bands.",
    empty_search: "No bands matched",
  },
  concerts: {
    title: "Concerts",
    upcoming: "upcoming shows",
    empty: "No shows scheduled.",
    headliner: "Headliner",
    lineup: "Line-up",
    tickets: "Tickets",
    no_tickets: "No ticket links yet. Check the venue website.",
  },
  articles: {
    title: "Articles",
    pitch: "Pitch a piece",
    sources: "Sources",
    empty: "Nothing published yet.",
    by: "by",
  },
  band: {
    follow: "Follow",
    bookmark: "Bookmark",
    discography: "Discography",
    members: "Members",
    shows: "Shows",
    similar: "Sounds like…",
    similar_subtitle: "Bands you might dig",
  },
  push: {
    enable: "Enable alerts",
    on: "Alerts on",
  },
  premium: {
    title: "Pay the toll. Get the keys.",
    lede:
      "Underground Metal stays free for everyone. Premium funds the servers, the editors, and a revenue share for authors. No labels. No billionaires. Just metalheads.",
    monthly: "Monthly",
    yearly: "Yearly",
    months_free: "2 months free",
    subscribe: "Subscribe",
    cancel_anytime: "Cancel anytime. Powered by Stripe.",
  },
  footer: {
    explore: "Explore",
    community: "Community",
    underground: "Underground",
    legal: "Legal",
    sign_in: "Sign in",
    become_author: "Become an author",
    contribute: "Contribute",
    guidelines: "Editorial guidelines",
    bg_archive: "Bulgarian archive",
    zine: "Zine",
    premium: "Premium",
    about: "About",
    terms: "Terms",
    privacy: "Privacy",
    dmca: "DMCA",
    cookies: "Cookies",
    tagline:
      "Hails to the underground · No gods, no masters · Keep it true",
  },
} as const;

export type Dictionary = Strings<typeof _en>;
export const en: Dictionary = _en;
