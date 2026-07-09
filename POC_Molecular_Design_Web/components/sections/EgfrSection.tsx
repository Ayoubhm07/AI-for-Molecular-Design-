"use client";

import { motion } from "framer-motion";
import { Dna, ShieldAlert, Crosshair } from "lucide-react";

const points = [
  {
    icone: Dna,
    titre: "Un interrupteur de croissance",
    texte:
      "L'EGFR est une proteine a la surface des cellules qui declenche leur multiplication quand tout va bien.",
  },
  {
    icone: ShieldAlert,
    titre: "Bloque en position allumee",
    texte:
      "Dans certains cancers, cet interrupteur reste allume en permanence. La cellule se multiplie sans controle et forme une tumeur.",
  },
  {
    icone: Crosshair,
    titre: "Notre cible",
    texte:
      "Une molecule qui bloque l'EGFR eteint cet interrupteur. C'est un candidat medicament anticancereux, surtout contre le cancer du poumon.",
  },
];

export function EgfrSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="glass-strong overflow-hidden rounded-3xl p-8 sm:p-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 font-mono text-sm text-violet-glow">
                La cible : EGFR
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Pourquoi cette proteine compte
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                L'EGFR, ou recepteur du facteur de croissance epidermique, est
                l'une des cibles anticancereuses les plus etudiees au monde.
                Comprendre son role rend tout le projet limpide.
              </p>
            </div>

            <div className="space-y-4">
              {points.map((p, i) => {
                const Icone = p.icone;
                return (
                  <motion.div
                    key={p.titre}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.12 }}
                    className="glass flex gap-4 rounded-2xl p-5"
                  >
                    <div className="shrink-0 rounded-xl bg-white/5 p-3 text-violet-glow">
                      <Icone className="h-5 w-5" strokeWidth={1.6} />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-white">
                        {p.titre}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-400">
                        {p.texte}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
