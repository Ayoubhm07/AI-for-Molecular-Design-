"use client";

import { motion } from "framer-motion";

const etapes = [
  {
    numero: "01",
    titre: "La molecule",
    texte: "On part d'une structure chimique ecrite au format SMILES.",
  },
  {
    numero: "02",
    titre: "Les descripteurs",
    texte:
      "RDKit calcule les proprietes et les empreintes structurelles de la molecule.",
  },
  {
    numero: "03",
    titre: "Le modele",
    texte:
      "Random Forest et XGBoost, entraines sur des milliers de molecules connues, evaluent la molecule.",
  },
  {
    numero: "04",
    titre: "La prediction",
    texte:
      "Active ou inactive, puissance estimee, famille chimique et analogues connus.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 font-mono text-sm text-emerald-glow">
            Comment ca marche
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            De la molecule a la decision, en quatre etapes
          </h2>
        </div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Ligne de liaison */}
          <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-cyan-glow/40 via-emerald-glow/40 to-violet-glow/40 md:block" />

          {etapes.map((e, i) => (
            <motion.div
              key={e.numero}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative"
            >
              <div className="glass-strong mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full font-mono text-lg font-bold text-cyan-glow glow-ring">
                {e.numero}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {e.titre}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">{e.texte}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
