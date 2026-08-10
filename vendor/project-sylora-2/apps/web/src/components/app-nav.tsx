"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/app", label: "Command Center", exact: true },
  { href: "/app/identity", label: "Identity" },
  { href: "/app/memory", label: "Memory" },
  { href: "/app/knowledge", label: "Knowledge" },
  { href: "/app/marketplace", label: "Agents" },
  { href: "/app/developer", label: "Developer" },
  { href: "/app/permissions", label: "Permissions" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="command-nav" aria-label="SYLORA">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
