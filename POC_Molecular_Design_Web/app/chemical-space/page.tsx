"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { NUAGE_CARTE, type PointCarte } from "@/lib/data";

export default function ChemicalSpacePage() {
  const [survole, setSurvole] = useState<PointCarte | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <div className="mb-8">
        <p className="mb-3 font-mono text-sm text-violet-glow">
          Exploration
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          La carte de l'espace chimique
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Chaque point est une molecule. Les molecules structurellement proches
          sont voisines sur la carte. Les zones ou les points verts se
          regroupent sont les continents des molecules actives contre l'EGFR.
          Survolez un point pour voir sa puissance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Carte */}
        <div className="glass-strong relative aspect-square w-full overflow-hidden rounded-3xl p-4">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute left-[62%] top-[42%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-glow/10 blur-3xl" />
            <div className="absolute left-[35%] top-[58%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500/10 blur-3xl" />
          </div>

          <svg viewBox="0 0 100 100" className="h-full w-full">
            {NUAGE_CARTE.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x * 100}
                cy={(1 - p.y) * 100}
                r={p.nom ? 1.6 : 0.9}
                fill={p.actif ? "#34d399" : "#64748b"}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: p.actif ? 0.85 : 0.5, scale: 1 }}
                transition={{ duration: 0.4, delay: (i % 40) * 0.01 }}
                stroke={p.nom ? "#a78bfa" : "none"}
                strokeWidth={p.nom ? 0.6 : 0}
                className="cursor-pointer"
                onMouseEnter={() => setSurvole(p)}
                onMouseLeave={() => setSurvole(null)}
                style={{ transformOrigin: "center" }}
              />
            ))}
          </svg>

          {survole && (
            <div className="glass-strong pointer-events-none absolute left-4 top-4 rounded-xl px-4 py-3 text-sm">
              {survole.nom && (
                <div className="font-semibold text-white">{survole.nom}</div>
              )}
              <div className="font-mono text-xs text-slate-300">
                pIC50 {survole.pIC50.toFixed(1)}
              </div>
              <div
                className={`text-xs ${
                  survole.actif ? "text-emerald-glow" : "text-slate-400"
                }`}
              >
                {survole.actif ? "active" : "inactive"}
              </div>
            </div>
          )}
        </div>

        {/* Legende */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold text-white">Legende</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-glow" />
                <span className="text-slate-300">Molecule active</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-slate-500" />
                <span className="text-slate-300">Molecule inactive</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full border-2 border-violet-glow bg-emerald-glow" />
                <span className="text-slate-300">Molecule connue</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="mb-2 text-sm font-semibold text-white">
              Comment lire cette carte
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              La carte est produite par reduction de dimension. Les axes n'ont
              pas de signification directe, seules les proximites comptent. Deux
              points proches representent deux molecules qui se ressemblent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
