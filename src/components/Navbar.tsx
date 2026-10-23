import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_LINKS } from "../data/site";
import Logo from "./Logo";
import Button from "./Button";
import Icon from "./Icon";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the menu and returns focus to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="announce">
        <span>Sehat Saathi — your companion for trusted health information and access.</span>
        <NavLink to="/resources" className="announce-link">
          Explore health resources
        </NavLink>
      </div>
      <header className="nav">
        <div className="nav-inner container">
          <Logo />
          <nav className="nav-links" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className="navlink">
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Button to="/resources" className="nav-cta">
            Explore Resources
          </Button>
          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? "close" : "menu"} size={24} />
          </button>
        </div>
        <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile" hidden={!open}>
          <NavLink to="/" end className="navlink">
            Home
          </NavLink>
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className="navlink">
              {l.label}
            </NavLink>
          ))}
          <Button to="/resources" arrow>
            Explore Resources
          </Button>
        </nav>
      </header>
    </>
  );
}
