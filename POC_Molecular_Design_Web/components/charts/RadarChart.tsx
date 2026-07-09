"use client";

import { motion } from "framer-motion";

interface Axe {
  axe: string;
  valeur: number; // 0 a 1
}

interface RadarChartProps {
  data: Axe[];
  couleur: string;
  taille?: number;
}

// Radar chart pur SVG pour profiler une famille chimique.
export function RadarChart({ data, couleur, taille = 220 }: RadarChartProps) {
  const centre = taille / 2;
  const rayon = taille / 2 - 30;
  const n = data.length;

  const pointFor = (valeur: number, i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = valeur * rayon;
    return [centre + r * Math.cos(angle), centre + r * Math.sin(angle)];
  };

  const contour = data
    .map((d, i) => pointFor(d.valeur, i).join(","))
    .join(" ");

  // Grille de fond (anneaux)
  const anneaux = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`}>
      {anneaux.map((a) => (
        <polygon
          key={a}
          points={data
            .map((_, i) => pointFor(a, i).join(","))
            .join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = pointFor(1, i);
        return (
          <line
            key={i}
            x1={centre}
            y1={centre}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        );
      })}

      <motion.polygon
        points={contour}
        fill={couleur}
        fillOpacity={0.22}
        stroke={couleur}
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: "center" }}
      />

      {data.map((d, i) => {
        const [x, y] = pointFor(1.18, i);
        return (
          <text
            key={d.axe}
            x={x}
            y={y}
            fill="#94a3b8"
            fontSize={9}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {d.axe}
          </text>
        );
      })}
    </svg>
  );
}
