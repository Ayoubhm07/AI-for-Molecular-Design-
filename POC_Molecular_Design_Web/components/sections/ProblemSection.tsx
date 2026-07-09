"use client";

import { motion } from "framer-motion";

const chiffres = [
  { valeur: "10 ans", label: "pour developper un seul medicament" },
  { valeur: "2,6 Mds$", label: "de cout moyen de mise sur le marche" },
  { valeur: "1 sur 5000", label: "molecules testees qui devient un medicament" },
];

export function ProblemSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Concevoir un medicament coute une{" "}
          <span className="text-gradient">fortune</span> et prend des annees.
        </motion.h2>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {chiffres.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="glass rounded-2xl p-8"
            >
              <div className="font-mono text-4xl font-bold text-gradient">
                {c.valeur}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {c.label}
              </p>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-base leading-relaxed text-slate-400">
          Le goulot d'etranglement, c'est le tri initial. Avant de tester une
          molecule en laboratoire, il faut deviner lesquelles valent le coup.
          C'est exactement la que le machine learning change la donne.
        </p>
      </div>
    </section>
  );
}
