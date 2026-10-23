import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";

type Variant = "navy" | "line" | "white";

interface Common {
  variant?: Variant;
  arrow?: boolean;
  size?: "md" | "lg";
  children: ReactNode;
  className?: string;
}

type LinkProps = Common & { to: string };
type BtnProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };

/** Renders a router <Link> when `to` is given, otherwise a real <button>. */
export default function Button(props: LinkProps | BtnProps) {
  const { variant = "navy", arrow, size = "md", children, className = "", ...rest } = props;
  const cls = `btn btn-${variant} btn-${size} ${className}`.trim();
  const content = (
    <>
      {children}
      {arrow && <Icon name="arrow" size={18} strokeWidth={1.8} />}
    </>
  );
  if ("to" in props && props.to !== undefined) {
    return (
      <Link to={props.to} className={cls}>
        {content}
      </Link>
    );
  }
  const { to: _to, ...btnRest } = rest as BtnProps;
  void _to;
  return (
    <button type="button" className={cls} {...btnRest}>
      {content}
    </button>
  );
}
