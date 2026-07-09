"use client";

import { motion } from "framer-motion";

interface Barre {
  label: string;
  valeur: number;
  couleur?: string;
}

interface BarChartProps {
  data: Barre[];
  max?: number;
  suffixe?: string;
  format?: (v: number) => string;
}

// Graphique en barres horizontales, anime, pur SVG/HTML (zero dependance lourde).
export function BarChart({ data, max, suffixe = "", format }: BarChartProps) {
  const maxVal = max ?? Math.max(...data.map((d) => d.valeur));

  return (
    <div className="space-y-4">
      {data.map((d, i) => {
        const largeur = (d.valeur / maxVal) * 100;
        const texte = format ? format(d.valeur) : `${d.valeur}${suffixe}`;
        return (
          <div key={d.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-slate-300">{d.label}</span>
              <span className="font-mono text-slate-200">{texte}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${largeur}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{
                  background: d.couleur
                    ? d.couleur
                    : "linear-gradient(90deg, #22d3ee, #34d399)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
