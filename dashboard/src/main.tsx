import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import localities from "virtual:ozimek-localities";
import Directory from "./Directory";
import Header from "./Header";
import LocalityTitle from "./components/LocalityTitle";
import "./globals.css";

const Dashboard = lazy(() => import("./Dashboard"));
const base = import.meta.env.BASE_URL;
const slug = location.pathname.startsWith(base) ? location.pathname.slice(base.length).replace(/\/$/, "") : "";
const locality = localities.find(locality => locality.slug === slug);
const loading = locality && <><Header /><main>
  <LocalityTitle locality={locality} />
  <p role="status">Wczytywanie dashboardu…</p>
</main></>;

if (locality) document.title = `${locality.name} · Dashboard miejscowości`;
createRoot(document.getElementById("root")!).render(locality
  ? <Suspense fallback={loading}><Dashboard locality={locality} /></Suspense>
  : <Directory localities={localities} />);
