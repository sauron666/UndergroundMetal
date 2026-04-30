import Link from "next/link";
import { TourBatchForm } from "./form";

export default function TourBatchPage() {
  return (
    <div>
      <nav className="text-xs text-muted-foreground mb-4">
        <span className="text-foreground">Tour batch</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">Tour batch entry</h1>
      <p className="text-sm text-muted-foreground max-w-prose mb-6">
        Pick a headliner band, optionally pick supports, then add many show
        rows in one go. Each row creates a Show + ShowBand + (optional)
        TicketLinks. Venues are looked up by slug; new venues are created on
        the fly when you supply city + country.
      </p>
      <TourBatchForm />
      <p className="text-xs text-muted-foreground mt-4">
        Need many bands at once?{" "}
        <Link href="/admin/festivals/import" className="text-primary">
          Festival bulk import
        </Link>{" "}
        is the multi-band variant.
      </p>
    </div>
  );
}
