import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "How to add bands, write articles, fix data, or contribute code to Underground Metal.",
};

export default function ContributePage() {
  return (
    <div className="container py-16 max-w-3xl prose prose-invert">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2 not-prose">
        ⛧ Contribute
      </p>
      <h1 className="font-display text-5xl">Help build the archive.</h1>

      <p className="text-lg text-muted-foreground">
        Underground Metal is community data. There are four ways to help.
      </p>

      <h2>1. Write articles</h2>
      <p>
        Reviews, interviews, news, scene reports. Anyone can pitch — to publish
        under your byline you need editor approval.
      </p>
      <p className="not-prose">
        <Button asChild variant="spike">
          <Link href="/become-author">Apply to be an author →</Link>
        </Button>
      </p>

      <h2>2. Add bands</h2>
      <p>
        The fastest way is to use{" "}
        <Link href="/discover" className="text-primary">AI Discovery</Link>:
        find a band that&apos;s missing from the catalogue, click through the
        Metal Archives or Bandcamp link, and an editor can import it via the
        admin panel. Email{" "}
        <a
          href="mailto:contact@undergroundmetal.app"
          className="text-primary"
        >
          contact@undergroundmetal.app
        </a>{" "}
        with a list of bands you&apos;d like added — include country, formation
        year, primary genre, and at least one verifiable URL per band.
      </p>

      <h2>3. Fix data</h2>
      <p>
        See a wrong year, missing member, broken Bandcamp link? Open a thread
        in the{" "}
        <Link href="/forum?cat=META" className="text-primary">
          Meta forum
        </Link>{" "}
        with the page URL and what&apos;s wrong. Editors review weekly.
      </p>

      <h2>4. Code</h2>
      <p>
        The whole platform is open. PRs welcome. See the{" "}
        <code>CONTRIBUTING.md</code> in the repository for branch conventions
        and editorial standards.
      </p>

      <h2>What we don&apos;t accept</h2>
      <ul>
        <li>Hate-band promo (NSBM is covered critically; not promoted).</li>
        <li>
          Bands that can&apos;t be verified anywhere — no Metal Archives, no
          Bandcamp, no Wikipedia, no MusicBrainz, nothing.
        </li>
        <li>
          Pirated content. We link to streaming, we don&apos;t host audio
          files.
        </li>
      </ul>
    </div>
  );
}
