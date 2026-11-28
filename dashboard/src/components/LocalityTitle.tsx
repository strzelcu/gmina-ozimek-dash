import type { Locality } from "../lib/locality";

export default function LocalityTitle({ locality }: { locality: Locality }) {
  const parts = locality.parts?.join(", ");
  return <div className="locality-title">
    <h1>{locality.name}</h1>
    {parts && <p className="locality-parts">{parts}</p>}
  </div>;
}
