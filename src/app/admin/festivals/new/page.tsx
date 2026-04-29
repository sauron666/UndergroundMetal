import { FestivalForm } from "../[slug]/form";

export default function NewFestival() {
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">New festival</h1>
      <FestivalForm festival={null} />
    </div>
  );
}
