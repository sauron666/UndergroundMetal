import { SeriesForm } from "../[slug]/form";

export default function NewSeries() {
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">New series</h1>
      <SeriesForm series={null} />
    </div>
  );
}
