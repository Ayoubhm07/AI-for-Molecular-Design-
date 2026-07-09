"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

// La scene 3D est chargee cote client uniquement, apres le rendu initial,
// pour ne pas bloquer l'affichage du texte du hero.
const MoleculeScene = dynamic(
  () => import("@/components/MoleculeScene").then((m) => m.MoleculeScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-40 w-40 animate-pulse-glow rounded-full bg-cyan-glow/20 blur-3xl" />
      </div>
    ),
  }
);

export function Hero() {
  return (
    <section className="relative flex min-h-dvh items-center overflow-hidden px-6 pt-24">
      {/* Halo d'ambiance */}
      <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-glow/10 blur-[120px]" />
      <div className="pointer-events-none absolute left-10 bottom-10 h-80 w-80 rounded-full bg-emerald-glow/10 blur-[120px]" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-cyan-glow"
          >
            <Sparkles className="h-4 w-4" />
            Intelligence artificielle pour la decouverte de medicaments
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Trouver le prochain{" "}
            <span className="text-gradient">medicament</span> anticancereux, plus
            vite.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg"
          >
            Nucleus predit si une molecule peut inhiber l'EGFR, une proteine cle
            du cancer du poumon. On trie des milliers de molecules par le machine
            learning pour ne garder que les candidates les plus prometteuses.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <ButtonLink href="/demo">
              Essayer la demo
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="#solution" variant="ghost">
              En savoir plus
            </ButtonLink>
          </motion.div>
        </div>

        {/* Molecule 3D */}
        <div className="relative h-[400px] w-full lg:h-[560px]">
          <MoleculeScene />
        </div>
      </div>
    </section>
  );
}
