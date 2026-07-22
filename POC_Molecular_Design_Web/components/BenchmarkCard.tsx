"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Play, Loader2 } from "lucide-react";
import { initMolcore } from "@/lib/wasm/molcore";

// Table de popcount pour la version JavaScript de reference.
const POP = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let v = i;
  let c = 0;
  while (v) {
    v &= v - 1;
    c++;
  }
  POP[i] = c;
}

// Tanimoto d'une requete contre une base, en JavaScript pur.
function tanimotoManyJS(query: Uint8Array, db: Uint8Array[]): number {
  let somme = 0;
  for (const fp of db) {
    let inter = 0;
    let uni = 0;
    for (let i = 0; i < query.length; i++) {
      inter += POP[query[i] & fp[i]];
      uni += POP[query[i] | fp[i]];
    }
    somme += uni === 0 ? 0 : inter / uni;
  }
  return somme;
}

type Etat =
  | { statut: "idle" }
  | { statut: "busy" }
  | { statut: "indispo" }
  | {
      statut: "done";
      tJS: number;
      tRust: number;
      facteur: number;
      comparaisons: number;
    };

export function BenchmarkCard() {
  const [etat, setEtat] = useState<Etat>({ statut: "idle" });

  async function lancer() {
    setEtat({ statut: "busy" });
    const api = await initMolcore();
    if (!api) {
      setEtat({ statut: "indispo" });
      return;
    }

    // Base synthetique de fingerprints aleatoires, taille realiste d'un criblage.
    const taille = 5000;
    const repetitions = 20;
    const db: Uint8Array[] = [];
    for (let j = 0; j < taille; j++) {
      const fp = new Uint8Array(api.fpBytes);
      for (let i = 0; i < fp.length; i++) fp[i] = (Math.random() * 256) | 0;
      db.push(fp);
    }
    const query = new Uint8Array(api.fpBytes);
    for (let i = 0; i < query.length; i++) query[i] = (Math.random() * 256) | 0;

    // Rechauffage pour ne pas mesurer la compilation JIT.
    tanimotoManyJS(query, db);
    api.computeTanimotoMany(query, db);

    // Laisse le navigateur respirer avant la mesure.
    await new Promise((r) => setTimeout(r, 30));

    const t0 = performance.now();
    for (let r = 0; r < repetitions; r++) tanimotoManyJS(query, db);
    const tJS = performance.now() - t0;

    const t1 = performance.now();
    for (let r = 0; r < repetitions; r++) api.computeTanimotoMany(query, db);
    const tRust = performance.now() - t1;

    setEtat({
      statut: "done",
      tJS,
      tRust,
      facteur: tJS / tRust,
      comparaisons: taille * repetitions,
    });
  }

  return (
    <div className="glass-strong rounded-2xl p-6">
      <div className="mb-1 flex items-center gap-2">
        <Cpu className="h-5 w-5 text-cyan-glow" />
        <h2 className="text-lg font-semibold text-white">
          Benchmark JavaScript contre Rust WebAssembly
        </h2>
      </div>
      <p className="mb-5 text-sm text-slate-400">
        Meme calcul de similarite de Tanimoto, la meme quantite de travail, deux
        moteurs. La mesure est faite en direct dans votre navigateur, rien n'est
        code en dur. Les chiffres varient selon la machine.
      </p>

      {etat.statut !== "done" && (
        <button
          onClick={lancer}
          disabled={etat.statut === "busy"}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-cyan-glow to-emerald-glow px-5 py-2.5 text-sm font-semibold text-base-950 transition-all hover:brightness-110 disabled:opacity-60"
        >
          {etat.statut === "busy" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Lancer la mesure
        </button>
      )}

      {etat.statut === "indispo" && (
        <p className="mt-4 text-sm text-slate-400">
          Le moteur WebAssembly n'a pas pu se charger, benchmark indisponible.
        </p>
      )}

      {etat.statut === "done" && (
        <div className="space-y-5">
          <Barre
            label="JavaScript"
            ms={etat.tJS}
            reference={etat.tJS}
            couleur="#64748b"
          />
          <Barre
            label="Rust / WebAssembly"
            ms={etat.tRust}
            reference={etat.tJS}
            couleur="#22d3ee"
          />

          <div className="flex flex-wrap items-center gap-6 border-t border-white/10 pt-4">
            <div>
              <div className="font-mono text-3xl font-bold text-gradient">
                {etat.facteur >= 1
                  ? `${etat.facteur.toFixed(1)}x`
                  : `${(1 / etat.facteur).toFixed(1)}x`}
              </div>
              <div className="text-xs text-slate-400">
                {etat.facteur >= 1
                  ? "plus rapide avec Rust"
                  : "plus rapide avec JavaScript"}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {etat.comparaisons.toLocaleString("fr")} comparaisons de molecules
              mesurees
            </div>
          </div>

          <button
            onClick={lancer}
            className="cursor-pointer text-xs text-cyan-glow hover:underline"
          >
            Relancer la mesure
          </button>
        </div>
      )}
    </div>
  );
}

function Barre({
  label,
  ms,
  reference,
  couleur,
}: {
  label: string;
  ms: number;
  reference: number;
  couleur: string;
}) {
  const largeur = Math.max(4, Math.min(100, (ms / reference) * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-200">{ms.toFixed(1)} ms</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${largeur}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: couleur }}
        />
      </div>
    </div>
  );
}
