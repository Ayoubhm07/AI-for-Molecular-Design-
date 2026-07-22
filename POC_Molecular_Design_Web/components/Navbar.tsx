"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hexagon } from "lucide-react";

const liens = [
  { href: "/", label: "Accueil" },
  { href: "/demo", label: "Demo" },
  { href: "/screening", label: "Criblage" },
  { href: "/insights", label: "Analytics" },
  { href: "/chemical-space", label: "Espace chimique" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="glass-strong flex w-full max-w-5xl items-center justify-between rounded-full px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Hexagon className="h-6 w-6 text-cyan-glow" strokeWidth={1.6} />
          <span className="text-lg tracking-tight text-white">Nucleus</span>
        </Link>

        <ul className="flex items-center gap-1">
          {liens.map((lien) => {
            const actif = pathname === lien.href;
            return (
              <li key={lien.href}>
                <Link
                  href={lien.href}
                  aria-current={actif ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm transition-colors duration-200 ${
                    actif
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {lien.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
