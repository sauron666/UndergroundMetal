import { ListForm } from "../[slug]/form";

export default function NewList() {
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">New list</h1>
      <ListForm list={null} />
    </div>
  );
}
