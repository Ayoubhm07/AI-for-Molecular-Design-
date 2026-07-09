import {
  Target,
  Gauge,
  Boxes,
  Map,
  Sparkles,
  ScatterChart,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const capacites = [
  {
    icone: Target,
    titre: "Classification",
    texte:
      "Le modele repond par oui ou non a la question centrale : cette molecule est-elle active contre l'EGFR.",
    couleur: "text-cyan-glow",
  },
  {
    icone: Gauge,
    titre: "Regression",
    texte:
      "Au dela du oui ou non, on estime la puissance exacte d'inhibition de la molecule, son pIC50.",
    couleur: "text-emerald-glow",
  },
  {
    icone: Boxes,
    titre: "Clustering",
    texte:
      "Les molecules sont regroupees en familles chimiques, pour reperer les series les plus prometteuses.",
    couleur: "text-violet-glow",
  },
  {
    icone: Map,
    titre: "Carte chimique",
    texte:
      "Une carte en deux dimensions de tout l'espace des molecules, ou les zones actives se detachent.",
    couleur: "text-cyan-glow",
  },
  {
    icone: Sparkles,
    titre: "Recommandation",
    texte:
      "On donne une molecule, le systeme retrouve les analogues connus les plus proches et leur activite.",
    couleur: "text-emerald-glow",
  },
  {
    icone: ScatterChart,
    titre: "Detection d'anomalies",
    texte:
      "On repere les activity cliffs, ces molecules presque identiques aux activites opposees.",
    couleur: "text-violet-glow",
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="mb-3 font-mono text-sm text-cyan-glow">La solution</p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Une chaine complete d'intelligence moleculaire
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Six analyses complementaires, toutes au service d'une meme question :
            aider le chercheur a choisir les bonnes molecules a tester.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capacites.map((c, i) => {
            const Icone = c.icone;
            return (
              <GlassCard key={c.titre} delay={i * 0.08}>
                <div className={`mb-4 inline-flex rounded-xl bg-white/5 p-3 ${c.couleur}`}>
                  <Icone className="h-6 w-6" strokeWidth={1.6} />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {c.titre}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {c.texte}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
