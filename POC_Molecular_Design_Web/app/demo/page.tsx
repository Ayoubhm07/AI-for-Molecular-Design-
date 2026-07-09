"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EXEMPLES_SMILES } from "@/lib/data";
import type { Prediction } from "@/lib/chemistry";

// Le dessin 2D s'appuie sur le canvas du navigateur, on le charge cote client.
const MoleculeDrawing = dynamic(
  () => import("@/components/MoleculeDrawing").then((m) => m.MoleculeDrawing),
  { ssr: false }
);

interface Analogue {
  nom: string;
  smiles: string;
  pIC50: number;
  actif: boolean;
  similarite: number;
}

export default function DemoPage() {
  const [smiles, setSmiles] = useState("");
  const [chargement, setChargement] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [analogues, setAnalogues] = useState<Analogue[]>([]);
  const [erreur, setErreur] = useState("");

  async function analyser(valeur?: string) {
    const requete = (valeur ?? smiles).trim();
    if (!requete) return;
    setChargement(true);
    setErreur("");
    setPrediction(null);
    setAnalogues([]);

    try {
      const [resPred, resAna] = await Promise.all([
        fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ smiles: requete }),
        }),
        fetch(`/api/analogues?smiles=${encodeURIComponent(requete)}`),
      ]);

      const pred: Prediction = await resPred.json();
      const ana = await resAna.json();

      if (!pred.valide) {
        setErreur("Ce SMILES ne semble pas valide. Verifiez la syntaxe.");
      } else {
        setPrediction(pred);
        setAnalogues(ana.analogues ?? []);
      }
    } catch {
      setErreur("Une erreur est survenue pendant l'analyse.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-32">
      <div className="mb-10">
        <p className="mb-3 font-mono text-sm text-cyan-glow">Demo interactive</p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Analysez une molecule
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Collez le code SMILES d'une molecule ou choisissez un exemple. Le
          modele predit son activite sur l'EGFR, sa puissance estimee et ses
          analogues connus.
        </p>
      </div>

      {/* Zone de saisie */}
      <div className="glass-strong rounded-2xl p-6">
        <label htmlFor="smiles" className="mb-2 block text-sm text-slate-300">
          Code SMILES
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="smiles"
            value={smiles}
            onChange={(e) => setSmiles(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyser()}
            placeholder="Ex : CC(=O)Oc1ccccc1C(=O)O"
            className="w-full rounded-xl border border-white/10 bg-base-900/60 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-500 focus:border-cyan-glow/50 focus:outline-none focus:ring-1 focus:ring-cyan-glow/50"
          />
          <Button onClick={() => analyser()} disabled={chargement} className="shrink-0">
            {chargement ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            Analyser
          </Button>
        </div>

        {/* Exemples cliquables */}
        <div className="mt-4 flex flex-wrap gap-2">
          {EXEMPLES_SMILES.map((ex) => (
            <button
              key={ex.smiles}
              onClick={() => {
                setSmiles(ex.smiles);
                analyser(ex.smiles);
              }}
              className="glass cursor-pointer rounded-full px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-glow/30 hover:text-white"
            >
              {ex.label}
            </button>
          ))}
        </div>

        {erreur && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {erreur}
          </p>
        )}
      </div>

      {/* Resultats */}
      <AnimatePresence mode="wait">
        {prediction && (
          <motion.div
            key={prediction.smiles}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Structure 2D reelle de la molecule */}
            <div className="glass-strong flex items-center justify-center rounded-2xl p-6 lg:col-span-1">
              <MoleculeDrawing smiles={prediction.smiles} taille={260} />
            </div>

            {/* Verdict */}
            <div className="glass-strong flex flex-col justify-between rounded-2xl p-6 lg:col-span-1">
              <div>
                <p className="text-sm text-slate-400">Verdict</p>
                <div className="mt-3 flex items-center gap-3">
                  {prediction.actif ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-glow" />
                  ) : (
                    <XCircle className="h-8 w-8 text-slate-500" />
                  )}
                  <span className="text-2xl font-bold text-white">
                    {prediction.actif ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <div className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>Confiance</span>
                  <span className="font-mono">
                    {Math.round(prediction.confiance * 100)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${prediction.confiance * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      prediction.actif
                        ? "bg-gradient-to-r from-emerald-glow to-cyan-glow"
                        : "bg-slate-500"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* pIC50 */}
            <div className="glass-strong flex flex-col justify-center rounded-2xl p-6">
              <p className="text-sm text-slate-400">Puissance estimee</p>
              <div className="mt-2 font-mono text-5xl font-bold text-gradient">
                {prediction.pIC50.toFixed(2)}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                pIC50, plus la valeur est haute plus la molecule est puissante.
                Le seuil d'activite est fixe a 6.
              </p>
            </div>

            {/* Proprietes */}
            <div className="glass-strong rounded-2xl p-6">
              <p className="mb-3 text-sm text-slate-400">Proprietes calculees</p>
              <dl className="space-y-2 font-mono text-sm">
                <Propriete label="Poids" valeur={`${prediction.proprietes.poidsMoleculaire} g/mol`} />
                <Propriete label="LogP" valeur={prediction.proprietes.logP.toString()} />
                <Propriete label="Accepteurs H" valeur={prediction.proprietes.accepteursH.toString()} />
                <Propriete label="Anneaux" valeur={prediction.proprietes.anneauxAromatiques.toString()} />
                <Propriete
                  label="Lipinski"
                  valeur={prediction.proprietes.respecteLipinski ? "conforme" : "viole"}
                />
              </dl>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analogues */}
      {analogues.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <h2 className="mb-4 text-xl font-semibold text-white">
            Molecules connues similaires
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analogues.map((a, i) => (
              <motion.div
                key={a.nom}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{a.nom}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      a.actif
                        ? "bg-emerald-glow/15 text-emerald-glow"
                        : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {a.actif ? "active" : "inactive"}
                  </span>
                </div>
                <p className="mt-2 truncate font-mono text-xs text-slate-500">
                  {a.smiles}
                </p>
                <div className="mt-3 flex justify-between text-xs text-slate-400">
                  <span>pIC50 {a.pIC50.toFixed(1)}</span>
                  <span className="font-mono text-cyan-glow">
                    similarite {a.similarite.toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Propriete({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 pb-1.5">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-200">{valeur}</dd>
    </div>
  );
}
