"use client";

import { motion } from "framer-motion";

interface Segment {
  label: string;
  valeur: number;
  couleur: string;
}

interface DonutChartProps {
  data: Segment[];
  taille?: number;
  centre?: { valeur: string; label: string };
}

// Donut chart pur SVG pour les proportions actif / inactif.
export function DonutChart({ data, taille = 200, centre }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.valeur, 0);
  const rayon = taille / 2 - 14;
  const circonference = 2 * Math.PI * rayon;
  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}>
        <g transform={`rotate(-90 ${taille / 2} ${taille / 2})`}>
          {data.map((d) => {
            const fraction = d.valeur / total;
            const longueur = fraction * circonference;
            const segment = (
              <motion.circle
                key={d.label}
                cx={taille / 2}
                cy={taille / 2}
                r={rayon}
                fill="none"
                stroke={d.couleur}
                strokeWidth={16}
                strokeDasharray={`${longueur} ${circonference - longueur}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              />
            );
            offset += longueur;
            return segment;
          })}
        </g>
      </svg>
      {centre && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-white">
            {centre.valeur}
          </span>
          <span className="text-xs text-slate-400">{centre.label}</span>
        </div>
      )}
    </div>
  );
}
