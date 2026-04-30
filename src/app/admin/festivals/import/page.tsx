import Link from "next/link";
import { ImportForm } from "./form";

export default function FestivalImport() {
  return (
    <div className="max-w-3xl">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/admin/festivals" className="hover:text-foreground">
          Festivals
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Bulk import</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">Bulk import</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-prose">
        Paste a JSON array of festivals to create or update. Bands referenced
        by slug are looked up; unknown bands are skipped (they won&apos;t fail
        the whole import). Existing festivals matched by slug are updated.
      </p>
      <ImportForm />
    </div>
  );
}
