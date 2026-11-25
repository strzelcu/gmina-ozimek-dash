import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export default function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="source-link" href={href} target="_blank" rel="noreferrer">
    {children}<ExternalLink size={12} aria-hidden="true" />
  </a>;
}
