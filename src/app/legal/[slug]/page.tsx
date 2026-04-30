import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface Doc {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
}

const DOCS: Record<string, Doc> = {
  terms: {
    title: "Terms of Service",
    intro:
      "These Terms govern your use of Underground Metal. By using the site you agree to them. If you don't agree, don't use the site.",
    sections: [
      {
        heading: "Accounts",
        body: "You're responsible for activity on your account. Don't share credentials. Notify us if you suspect compromise. We may suspend accounts that violate these terms.",
      },
      {
        heading: "Content you submit",
        body: "You retain copyright on what you publish. By submitting you grant us a non-exclusive, worldwide license to host, distribute and display it on the site and in derived feeds (RSS, OG previews, social cards). You confirm you have the right to publish what you submit.",
      },
      {
        heading: "Editorial standards",
        body: "Articles must include sources for factual claims. Editors may request changes or reject submissions. We don't host promotional copy for hate movements; NSBM is covered critically when relevant.",
      },
      {
        heading: "Affiliate links",
        body: "Outbound ticket and music store links may be tagged for revenue share. This never changes the price you pay.",
      },
      {
        heading: "Limitations",
        body: "The site is provided as-is. We aren't liable for losses arising from third-party links, ticketing partners, or content posted by other users.",
      },
      {
        heading: "Changes",
        body: "We may update these terms. Material changes are announced site-wide.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "Your privacy is treated as a feature, not a target. This page explains what we collect, why, and how to remove it.",
    sections: [
      {
        heading: "What we store",
        body: "Account profile (email, username, optional name/bio/avatar). Activity (follows, bookmarks, votes, comments, articles you author, ratings). Authentication state (sessions, OAuth links if used). Email + push delivery logs. Affiliate click receipts with hashed IP. Notifications and read counts.",
      },
      {
        heading: "What we don't store",
        body: "Full IP addresses (we hash them), card numbers (Stripe holds them), unhashed passwords, third-party trackers. We don't sell or share data with advertisers.",
      },
      {
        heading: "Cookies",
        body: "Strictly necessary: session token, locale preference, CSRF. Optional analytics (Plausible) is privacy-preserving and runs only when configured.",
      },
      {
        heading: "Your rights",
        body: "You can download a JSON archive of all your data via Account → Data export (GDPR Article 20). You can permanently delete your account via Account → Delete account (GDPR Article 17). Email opt-outs are per-kind on Account → Notifications.",
      },
      {
        heading: "Retention",
        body: "Account data persists until you delete the account. Deleted accounts hard-remove personal records and reassign authored content to a 'deleted user' placeholder so reply chains stay coherent.",
      },
      {
        heading: "Contact",
        body: "Privacy questions: contact@undergroundmetal.app.",
      },
    ],
  },
  dmca: {
    title: "DMCA Policy",
    intro:
      "Underground Metal respects copyright. If you believe content on the site infringes yours, file a notice and we'll act on it.",
    sections: [
      {
        heading: "Submitting a notice",
        body: "Email contact@undergroundmetal.app with: identification of the copyrighted work, identification of the infringing material (URL), your contact info, a good-faith statement, a statement under penalty of perjury that the info is accurate and you are the rights-holder or authorised, and your physical or electronic signature.",
      },
      {
        heading: "Counter-notice",
        body: "If material was removed in error, you may file a counter-notice with the same kind of statement plus consent to the jurisdiction of the federal district court covering your address.",
      },
      {
        heading: "Repeat infringers",
        body: "We terminate accounts of repeat infringers in line with §512(i).",
      },
    ],
  },
  cookies: {
    title: "Cookies",
    intro:
      "We use a minimal set of cookies. There is no third-party advertising tracker.",
    sections: [
      {
        heading: "Strictly necessary",
        body: "session (authentication), um.locale (language), CSRF tokens. Without these, the site can't function.",
      },
      {
        heading: "Functional",
        body: "um.theme (theme override). Optional, falls back to OS preference.",
      },
      {
        heading: "Analytics",
        body: "If NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set the deployment uses Plausible — cookieless, IP-anonymising. No cross-site trackers.",
      },
    ],
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) return { title: "Not found" };
  return { title: doc.title };
}

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  return (
    <div className="container py-16 max-w-3xl prose prose-invert">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 not-prose">
        ⛧ Legal
      </p>
      <h1 className="font-display text-5xl">{doc.title}</h1>
      <p className="text-muted-foreground">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          <p>{s.body}</p>
        </section>
      ))}
      <p className="text-xs text-muted-foreground mt-12">
        Last updated:{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })}
      </p>
    </div>
  );
}
