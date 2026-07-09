import { Hexagon } from "lucide-react";

const technos = [
  "Next.js",
  "TypeScript",
  "Three.js",
  "Framer Motion",
  "scikit-learn",
  "RDKit",
  "ChEMBL",
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="mb-3 flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-cyan-glow" strokeWidth={1.6} />
            <span className="text-lg font-semibold text-white">Nucleus</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Plateforme d'aide a la decouverte de medicaments contre le cancer.
            Prediction d'activite moleculaire sur la cible EGFR a partir de la
            base publique ChEMBL.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-300">
            Technologies
          </h3>
          <ul className="flex max-w-xs flex-wrap gap-2">
            {technos.map((t) => (
              <li
                key={t}
                className="glass rounded-full px-3 py-1 font-mono text-xs text-slate-300"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl border-t border-white/5 pt-6">
        <p className="text-center text-xs text-slate-500">
          Projet academique de preuve de concept. Cet outil accelere la
          preselection de molecules mais ne remplace pas la validation en
          laboratoire.
        </p>
      </div>
    </footer>
  );
}
