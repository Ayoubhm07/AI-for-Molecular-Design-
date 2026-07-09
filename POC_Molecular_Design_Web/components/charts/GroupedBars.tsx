"use client";

import { motion } from "framer-motion";

interface Serie {
  nom: string;
  couleur: string;
  valeurs: number[]; // une valeur par categorie
}

interface GroupedBarsProps {
  categories: string[];
  series: Serie[];
  max?: number;
  hauteur?: number;
}

// Barres groupees verticales pour comparer plusieurs modeles sur plusieurs metriques.
export function GroupedBars({
  categories,
  series,
  max = 1,
  hauteur = 240,
}: GroupedBarsProps) {
  const largeurGroupe = 100 / categories.length;
  const largeurBarre = largeurGroupe / (series.length + 1);

  return (
    <div>
      <div
        className="relative w-full"
        style={{ height: hauteur }}
        role="img"
        aria-label="Comparaison des modeles"
      >
        {/* Lignes de grille */}
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <div
            key={g}
            className="absolute left-0 right-0 border-t border-white/[0.06]"
            style={{ bottom: `${g * 100}%` }}
          >
            <span className="absolute -top-2 -left-1 font-mono text-[10px] text-slate-600">
              {(g * max).toFixed(1)}
            </span>
          </div>
        ))}

        <div className="flex h-full items-end justify-around">
          {categories.map((cat, ci) => (
            <div
              key={cat}
              className="flex h-full flex-1 items-end justify-center gap-1"
            >
              {series.map((s) => {
                const v = s.valeurs[ci];
                const h = (v / max) * 100;
                return (
                  <motion.div
                    key={s.nom}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-4 rounded-t"
                    style={{ background: s.couleur }}
                    title={`${s.nom} : ${v}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Axe des categories */}
      <div className="mt-2 flex justify-around">
        {categories.map((cat) => (
          <span key={cat} className="flex-1 text-center text-xs text-slate-400">
            {cat}
          </span>
        ))}
      </div>

      {/* Legende */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {series.map((s) => (
          <div key={s.nom} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded"
              style={{ background: s.couleur }}
            />
            <span className="text-xs text-slate-300">{s.nom}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
