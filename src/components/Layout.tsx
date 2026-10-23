import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const TITLES: Record<string, string> = {
  "/": "Sehat Saathi — Health information and care, within reach",
  "/about": "About — Sehat Saathi",
  "/features": "Features — Sehat Saathi",
  "/how-it-works": "How it works — Sehat Saathi",
  "/resources": "Health resources — Sehat Saathi",
  "/contact": "Contact and help — Sehat Saathi",
};

export default function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    document.title = TITLES[pathname] ?? "Page not found — Sehat Saathi";
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
    // Move focus to the page for keyboard and screen-reader users after navigation.
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname, hash]);

  return (
    <div className="ss">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
