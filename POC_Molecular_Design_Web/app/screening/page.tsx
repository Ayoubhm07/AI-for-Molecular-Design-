"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Zap, Cpu, Trophy } from "lucide-react";
import { loadChemSpace, type ChemSpace } from "@/lib/chemspace";
import { EXEMPLES_SMILES } from "@/lib/data";

interface Hit {
  index: number;
  smiles: string;
  score: number;
  sim: number;
  pIC50: number;
  activite: number;
  lipinski: number;
}

interface Resultat {
  hits: Hit[];
  histo: number[];
  scoreMax: number;
  tempsMs: number;
  debit: number;
  count: number;
  scoreSeuil: number;
  nbHits: number;
}

const POIDS_DEFAUT = { sim: 0.6, pot: 0.25, lip: 0.15 };

export default function ScreeningPage() {
  const [cs, setCs] = useState<ChemSpace | null>(null);
  const [chargement, setChargement] = useState(true);
  const [query, setQuery] = useState(EXEMPLES_SMILES[0].smiles);
  const [poids, setPoids] = useState(POIDS_DEFAUT);
  const [res, setRes] = useState<Resultat | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadChemSpace().then((r) => {
      setCs(r);
      setChargement(false);
    });
  }, []);

  // Puissance normalisee et drapeau Lipinski, prepares une seule fois.
  const pic50Norm = useMemo(() => {
    if (!cs) return null;
    const arr = new Float32Array(cs.carte.count);
    for (let i = 0; i < cs.carte.count; i++) {
      arr[i] = Math.min(1, Math.max(0, (cs.carte.p[i] - 4) / 6));
    }
    return arr;
  }, [cs]);

  const lipinski = useMemo(() => {
    if (!cs) return null;
    return Uint8Array.from(cs.carte.l);
  }, [cs]);

  function cribler() {
    if (!cs || !pic50Norm || !lipinski || !query.trim()) return;
    setBusy(true);
    // laisse l'UI afficher l'etat avant le calcul
    setTimeout(() => {
      try {
        const fp = cs.api.computeFingerprint(query.trim());
        const t0 = performance.now();
        const { scores, sims } = cs.api.computeScreen(
          fp,
          cs.fps,
          cs.carte.count,
          pic50Norm!,
          lipinski!,
          poids
        );
        const tempsMs = performance.now() - t0;

        const count = cs.carte.count;
        const scoreMax = poids.sim + poids.pot + poids.lip;

        // Top 30 par score, sans trier tout le tableau.
        const K = 30;
        const meilleurs: number[] = [];
        for (let i = 0; i < count; i++) {
          if (meilleurs.length < K) {
            meilleurs.push(i);
            meilleurs.sort((a, b) => scores[a] - scores[b]);
          } else if (scores[i] > scores[meilleurs[0]]) {
            meilleurs[0] = i;
            meilleurs.sort((a, b) => scores[a] - scores[b]);
          }
        }
        const hits: Hit[] = meilleurs
          .reverse()
          .map((idx) => ({
            index: idx,
            smiles: cs.smiles[idx],
            score: scores[idx],
            sim: sims[idx],
            pIC50: cs.carte.p[idx],
            activite: cs.carte.a[idx],
            lipinski: cs.carte.l[idx],
          }));

        // Histogramme des scores (24 tranches)
        const bins = 24;
        const histo = new Array(bins).fill(0);
        for (let i = 0; i < count; i++) {
          const b = Math.min(bins - 1, Math.floor((scores[i] / scoreMax) * bins));
          histo[b]++;
        }

        // Candidats retenus : score au-dela de 70% du maximum
        const scoreSeuil = scoreMax * 0.7;
        let nbHits = 0;
        for (let i = 0; i < count; i++) if (scores[i] >= scoreSeuil) nbHits++;

        setRes({
          hits,
          histo,
          scoreMax,
          tempsMs,
          debit: count / (tempsMs / 1000),
          count,
          scoreSeuil,
          nbHits,
        });
      } finally {
        setBusy(false);
      }
    }, 20);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <div className="mb-8">
        <p className="mb-3 font-mono text-sm text-emerald-glow">Criblage virtuel</p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Le hit finder
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Donnez une molecule de reference. Le moteur Rust passe en revue les 13
          577 molecules de la chimiotheque en une seule passe et vous rend un
          classement des meilleurs candidats, en combinant similarite, puissance
          connue et drugabilite.
        </p>
      </div>

      {chargement && (
        <div className="glass-strong flex items-center justify-center gap-3 rounded-3xl p-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement de la chimiotheque et du moteur Rust...
        </div>
      )}

      {!chargement && !cs && (
        <div className="glass-strong rounded-3xl p-10 text-slate-400">
          La chimiotheque n'a pas pu se charger. Lancez npm run build:dataset.
        </div>
      )}

      {cs && (
        <>
          {/* Panneau de controle */}
          <div className="glass-strong rounded-3xl p-6">
            <label className="mb-2 block text-sm text-slate-300">
              Molecule de reference (SMILES)
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-base-900/60 px-4 py-3 font-mono text-sm text-white focus:border-emerald-glow/50 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXEMPLES_SMILES.map((ex) => (
                <button
                  key={ex.smiles}
                  onClick={() => setQuery(ex.smiles)}
                  className="glass cursor-pointer rounded-full px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-glow/30 hover:text-white"
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Ponderations */}
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Curseur
                label="Similarite"
                valeur={poids.sim}
                couleur="#22d3ee"
                onChange={(v) => setPoids((p) => ({ ...p, sim: v }))}
              />
              <Curseur
                label="Puissance"
                valeur={poids.pot}
                couleur="#34d399"
                onChange={(v) => setPoids((p) => ({ ...p, pot: v }))}
              />
              <Curseur
                label="Drugabilite (Lipinski)"
                valeur={poids.lip}
                couleur="#a78bfa"
                onChange={(v) => setPoids((p) => ({ ...p, lip: v }))}
              />
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={cribler}
                disabled={busy}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-emerald-glow to-cyan-glow px-6 py-3 text-sm font-semibold text-base-950 transition-all hover:brightness-110 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Lancer le criblage
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-glow/30 bg-cyan-glow/10 px-2.5 py-1 text-xs text-cyan-glow">
                <Cpu className="h-3.5 w-3.5" />
                Moteur Rust / WebAssembly
              </span>
            </div>
          </div>

          {res && (
            <>
              {/* KPI */}
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi
                  valeur={res.count.toLocaleString("fr")}
                  label="molecules criblees"
                />
                <Kpi
                  valeur={`${res.tempsMs.toFixed(1)} ms`}
                  label="temps de calcul"
                  accent
                />
                <Kpi
                  valeur={`${Math.round(res.debit).toLocaleString("fr")}`}
                  label="molecules / seconde"
                />
                <Kpi
                  valeur={res.nbHits.toLocaleString("fr")}
                  label="candidats retenus"
                />
              </div>

              {/* Histogramme */}
              <div className="mt-6 glass-strong rounded-2xl p-6">
                <h2 className="mb-1 text-lg font-semibold text-white">
                  Distribution des scores
                </h2>
                <p className="mb-5 text-sm text-slate-400">
                  La grande majorite des molecules score bas. Les candidats
                  interessants sont la petite queue a droite.
                </p>
                <Histogramme histo={res.histo} seuilRatio={0.7} />
              </div>

              {/* Classement */}
              <div className="mt-6">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-glow" />
                  <h2 className="text-xl font-semibold text-white">
                    Meilleurs candidats
                  </h2>
                </div>
                <div className="space-y-2">
                  {res.hits.map((h, rang) => (
                    <motion.div
                      key={h.index}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: rang * 0.025 }}
                      className="glass flex flex-wrap items-center gap-4 rounded-xl p-4"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${
                          rang < 3
                            ? "bg-gradient-to-br from-emerald-glow to-cyan-glow text-base-950"
                            : "bg-white/5 text-slate-400"
                        }`}
                      >
                        {rang + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs text-slate-300">
                          {h.smiles}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                          <span className="text-cyan-glow">
                            Tanimoto {h.sim.toFixed(2)}
                          </span>
                          <span>pIC50 {h.pIC50.toFixed(1)}</span>
                          <span
                            className={
                              h.activite === 1 ? "text-emerald-glow" : "text-slate-500"
                            }
                          >
                            {["inactif", "actif", "intermediaire"][h.activite]}
                          </span>
                          <span
                            className={
                              h.lipinski ? "text-violet-glow" : "text-slate-500"
                            }
                          >
                            {h.lipinski ? "Lipinski ok" : "Lipinski non"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg font-bold text-gradient">
                          {((h.score / res.scoreMax) * 100).toFixed(0)}
                        </div>
                        <div className="text-[10px] text-slate-500">score</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Rappel d'honnetete : le score combine la similarite structurelle
                  calculee par Rust, la puissance deja mesuree en laboratoire, et
                  la conformite de Lipinski. C'est un outil de priorisation, pas un
                  verdict. Un vrai candidat doit passer par le laboratoire.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Curseur({
  label,
  valeur,
  couleur,
  onChange,
}: {
  label: string;
  valeur: number;
  couleur: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-200">{valeur.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={valeur}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer accent-current"
        style={{ accentColor: couleur }}
      />
    </div>
  );
}

function Kpi({
  valeur,
  label,
  accent = false,
}: {
  valeur: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <div
        className={`font-mono text-2xl font-bold ${
          accent ? "text-gradient" : "text-white"
        }`}
      >
        {valeur}
      </div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}

function Histogramme({ histo, seuilRatio }: { histo: number[]; seuilRatio: number }) {
  const max = Math.max(...histo, 1);
  const seuilBin = Math.floor(histo.length * seuilRatio);
  return (
    <div className="flex h-40 items-end gap-1">
      {histo.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ duration: 0.6, delay: i * 0.015, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 rounded-t"
          style={{
            background:
              i >= seuilBin
                ? "linear-gradient(180deg, #34d399, #22d3ee)"
                : "rgba(255,255,255,0.1)",
          }}
          title={`${v} molecules`}
        />
      ))}
    </div>
  );
}
