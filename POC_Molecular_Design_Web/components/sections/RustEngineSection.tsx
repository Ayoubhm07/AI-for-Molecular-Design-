"use client";

import { motion } from "framer-motion";
import { Cpu, Binary, Gauge, ShieldCheck } from "lucide-react";

const points = [
  {
    icone: Cpu,
    titre: "Pourquoi Rust et WebAssembly",
    texte:
      "Le calcul chimique lourd ne devrait pas ramer dans le navigateur. On ecrit la partie sensible en Rust, un langage rapide et sur, qu'on compile en WebAssembly. Le resultat tourne directement chez l'utilisateur, sans serveur Python, a une vitesse proche du natif.",
  },
  {
    icone: Binary,
    titre: "La similarite de Tanimoto",
    texte:
      "Chaque molecule devient une longue suite de 0 et de 1, son empreinte structurelle. La similarite de Tanimoto compte les bits communs a deux molecules, divises par les bits totaux. Un score de 1 veut dire structures identiques, 0 veut dire aucun motif partage.",
  },
  {
    icone: Gauge,
    titre: "Pourquoi le popcount va vite",
    texte:
      "Compter les bits a 1 d'un nombre est une operation que le processeur sait faire en une seule instruction, le popcount. Rust l'utilise directement, la ou JavaScript doit passer par une table de correspondance. Sur des milliers de molecules, l'ecart se creuse.",
  },
  {
    icone: ShieldCheck,
    titre: "La limite assumee",
    texte:
      "Notre empreinte est une empreinte circulaire simplifiee, calculee sur les environnements d'atomes du graphe moleculaire. Ce n'est pas l'ECFP officiel de RDKit. Le moteur est concu pour la demonstration et l'aide a la decision, pas pour un verdict reglementaire.",
  },
];

export function RustEngineSection() {
  return (
    <div>
      <div className="mb-6">
        <p className="mb-2 font-mono text-sm text-violet-glow">Sous le capot</p>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Le moteur Rust WebAssembly
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Les proprietes des molecules et la similarite entre elles ne sont pas
          calculees en JavaScript approximatif, mais par un vrai moteur
          cheminformatique ecrit en Rust et compile en WebAssembly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {points.map((p, i) => {
          const Icone = p.icone;
          return (
            <motion.div
              key={p.titre}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass rounded-2xl p-5"
            >
              <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2.5 text-cyan-glow">
                <Icone className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <h3 className="mb-2 font-semibold text-white">{p.titre}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{p.texte}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
