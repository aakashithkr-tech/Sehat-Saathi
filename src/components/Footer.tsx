import { Link } from "react-router-dom";
import { NAV_LINKS } from "../data/site";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container foot-row">
        <div className="foot-brand">
          <Logo size={28} />
          <p>
            Sehat Saathi provides health information and access support. It does not replace
            advice from a qualified healthcare professional.
          </p>
        </div>
        <nav aria-label="Footer" className="foot-links">
          <Link to="/">Home</Link>
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
