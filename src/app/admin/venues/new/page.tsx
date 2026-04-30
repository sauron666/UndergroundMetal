import { VenueForm } from "../[slug]/form";

export default function NewVenue() {
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">New venue</h1>
      <VenueForm venue={null} />
    </div>
  );
}
