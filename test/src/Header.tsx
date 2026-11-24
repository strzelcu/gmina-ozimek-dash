import { LayoutDashboard } from "lucide-react";

export default function Header() {
  return <header id="page-top" className="topbar preview-topbar" tabIndex={-1}>
    <div className="topbar-inner">
      <a href={import.meta.env.BASE_URL} className="brand" aria-label="Gmina Ozimek · katalog dashboardów">
        <span className="brand-icon"><LayoutDashboard size={22} aria-hidden="true" /></span>
        Gmina Ozimek
      </a>
      <span className="preview-label">Wersja testowa</span>
    </div>
  </header>;
}
