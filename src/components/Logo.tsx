import { Link } from "react-router-dom";

export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link to="/" className="logo" aria-label="Sehat Saathi home">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="10" fill="#0B6E6E" />
        <path d="M16 8v16M8 16h16" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="23.5" cy="8.5" r="2.4" fill="#E4563F" />
      </svg>
      <span>Sehat Saathi</span>
    </Link>
  );
}
