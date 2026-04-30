import Link from "next/link";
import { CsvForm } from "./form";

export default function FestivalCsvImport() {
  return (
    <div className="max-w-3xl">
      <nav className="text-xs text-muted-foreground mb-4">
        <Link href="/admin/festivals" className="hover:text-foreground">
          Festivals
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">CSV import</span>
      </nav>
      <h1 className="font-display text-3xl mb-2">CSV import</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-prose">
        Paste a CSV from a spreadsheet. The first row must be the header. The
        importer accepts any subset of the columns below — only{" "}
        <code>name</code>, <code>startDate</code>, <code>endDate</code>,
        <code>city</code>, <code>countryCode</code> are required.
      </p>
      <p className="text-xs font-mono mb-4 text-muted-foreground">
        name, startDate, endDate, city, countryCode, venueName, websiteUrl,
        undergroundScore, status, ticketProvider, ticketUrl, priceMinor,
        currency, passType, bandSlugs (semicolon-separated)
      </p>
      <CsvForm />
    </div>
  );
}
