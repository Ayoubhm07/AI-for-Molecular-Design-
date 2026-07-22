"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Search, Upload, Cpu } from "lucide-react";
import { loadChemSpace, type ChemSpace, type Voisin } from "@/lib/chemspace";
import type { Proprietes } from "@/lib/chemistry";

// Palette coherente avec le reste du site.
const COUL_ACTIVITE = ["#64748b", "#34d399", "#a78bfa"]; // inactif, actif, intermediaire
const COUL_FAMILLE = ["#22d3ee", "#34d399", "#a78bfa", "#f59e0b", "#f472b6", "#60a5fa"];

interface Importee {
  smiles: string;
  proprietes: Proprietes;
  voisin: Voisin;
  x: number;
  y: number;
}

type ColorMode = "activite" | "famille";

export default function ChemicalSpacePage() {
  const [cs, setCs] = useState<ChemSpace | null>(null);
  const [chargement, setChargement] = useState(true);
  const [colorMode, setColorMode] = useState<ColorMode>("activite");
  const [query, setQuery] = useState("");
  const [voisins, setVoisins] = useState<Voisin[]>([]);
  const [importees, setImportees] = useState<Importee[]>([]);
  const [survol, setSurvol] = useState<{ px: number; py: number; texte: string } | null>(null);
  const [messageImport, setMessageImport] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChemSpace().then((res) => {
      setCs(res);
      setChargement(false);
    });
  }, []);

  const dessiner = useCallback(() => {
    const canvas = canvasRef.current;
    const conteneur = conteneurRef.current;
    if (!canvas || !conteneur || !cs) return;

    const dpr = window.devicePixelRatio || 1;
    const taille = conteneur.clientWidth;
    canvas.width = taille * dpr;
    canvas.height = taille * dpr;
    canvas.style.height = `${taille}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, taille, taille);

    const W = taille;
    const H = taille;
    const { carte } = cs;

    // Nuage de fond
    for (let i = 0; i < carte.count; i++) {
      const px = carte.x[i] * W;
      const py = (1 - carte.y[i]) * H;
      if (colorMode === "activite") {
        ctx.fillStyle = COUL_ACTIVITE[carte.a[i]] ?? "#64748b";
      } else {
        const fam = carte.f[i];
        ctx.fillStyle = fam >= 0 ? COUL_FAMILLE[fam % COUL_FAMILLE.length] : "#475569";
      }
      ctx.globalAlpha = carte.a[i] === 1 ? 0.55 : 0.32;
      ctx.fillRect(px - 1, py - 1, 2.2, 2.2);
    }
    ctx.globalAlpha = 1;

    // Voisins trouves par la recherche
    voisins.forEach((v, rang) => {
      const px = v.x * W;
      const py = (1 - v.y) * H;
      ctx.beginPath();
      ctx.arc(px, py, rang === 0 ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = "#22d3ee";
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.globalAlpha = 0.8;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Molecules importees, placees a la position de leur plus proche voisin
    importees.forEach((m) => {
      const px = m.x * W;
      const py = (1 - m.y) * H;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    });
  }, [cs, colorMode, voisins, importees]);

  useEffect(() => {
    dessiner();
    const onResize = () => dessiner();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dessiner]);

  function onSearch() {
    if (!cs || !query.trim()) return;
    const v = cs.chercherVoisins(query.trim(), 8);
    setVoisins(v);
  }

  function onHover(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!cs) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = 1 - (e.clientY - rect.top) / rect.height;
    // plus proche point (balayage lineaire, 13k est trivial)
    let best = -1;
    let bestD = Infinity;
    const { carte } = cs;
    for (let i = 0; i < carte.count; i++) {
      const dx = carte.x[i] - mx;
      const dy = carte.y[i] - my;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0 && bestD < 0.0004) {
      const act = ["inactif", "actif", "intermediaire"][carte.a[best]];
      setSurvol({
        px: carte.x[best] * rect.width,
        py: (1 - carte.y[best]) * rect.height,
        texte: `${cs.smiles[best].slice(0, 28)}${cs.smiles[best].length > 28 ? "..." : ""}  pIC50 ${carte.p[best].toFixed(1)}  ${act}`,
      });
    } else {
      setSurvol(null);
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier || !cs) return;
    setMessageImport("Lecture du fichier...");
    const texte = await fichier.text();
    const lignes = texte.split(/\r?\n/).filter((l) => l.trim().length > 0);

    const resultats: Importee[] = [];
    for (const ligne of lignes) {
      if (resultats.length >= 150) break;
      const candidat = ligne.split(/[,;\t]/)[0].trim();
      if (!candidat || candidat.toLowerCase() === "smiles") continue;
      try {
        const prop = cs.api.computeDescriptors(candidat);
        if (prop.atomesLourds < 2) continue;
        const v = cs.chercherVoisins(candidat, 1)[0];
        if (!v) continue;
        resultats.push({ smiles: candidat, proprietes: prop, voisin: v, x: v.x, y: v.y });
      } catch {
        // molecule ignoree
      }
    }
    setImportees(resultats);
    setMessageImport(
      resultats.length > 0
        ? `${resultats.length} molecules importees et placees sur la carte.`
        : "Aucune molecule valide trouvee dans ce fichier."
    );
    e.target.value = "";
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <div className="mb-8">
        <p className="mb-3 font-mono text-sm text-violet-glow">Exploration</p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          La carte de l'espace chimique
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Chaque point est une des 13 577 molecules reelles testees sur l'EGFR,
          projetee par t-SNE. Cherchez une molecule pour voir ses plus proches
          voisins, ou importez un fichier pour placer vos propres molecules. La
          similarite est calculee par le moteur Rust WebAssembly.
        </p>
      </div>

      {chargement && (
        <div className="glass-strong flex items-center justify-center gap-3 rounded-3xl p-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement des 13 577 molecules et du moteur Rust...
        </div>
      )}

      {!chargement && !cs && (
        <div className="glass-strong rounded-3xl p-10 text-slate-400">
          L'espace chimique n'a pas pu se charger. Verifiez que les fichiers de
          donnees sont presents dans public/ (npm run build:dataset).
        </div>
      )}

      {cs && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Carte */}
          <div className="glass-strong relative rounded-3xl p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full bg-white/5 p-1 text-xs">
                <button
                  onClick={() => setColorMode("activite")}
                  className={`cursor-pointer rounded-full px-3 py-1.5 transition-colors ${
                    colorMode === "activite" ? "bg-white/10 text-white" : "text-slate-400"
                  }`}
                >
                  Par activite
                </button>
                <button
                  onClick={() => setColorMode("famille")}
                  className={`cursor-pointer rounded-full px-3 py-1.5 transition-colors ${
                    colorMode === "famille" ? "bg-white/10 text-white" : "text-slate-400"
                  }`}
                >
                  Par famille
                </button>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-glow/30 bg-cyan-glow/10 px-2.5 py-1 text-xs text-cyan-glow">
                <Cpu className="h-3.5 w-3.5" />
                Recherche Rust / WebAssembly
              </span>
            </div>

            <div ref={conteneurRef} className="relative w-full">
              <canvas
                ref={canvasRef}
                onMouseMove={onHover}
                onMouseLeave={() => setSurvol(null)}
                className="w-full rounded-2xl bg-base-950/40"
              />
              {survol && (
                <div
                  className="glass-strong pointer-events-none absolute z-10 max-w-xs rounded-lg px-3 py-2 font-mono text-xs text-slate-200"
                  style={{
                    left: Math.min(survol.px + 10, (conteneurRef.current?.clientWidth ?? 0) - 220),
                    top: survol.py + 10,
                  }}
                >
                  {survol.texte}
                </div>
              )}
            </div>
          </div>

          {/* Panneau lateral */}
          <div className="space-y-5">
            {/* Recherche */}
            <div className="glass rounded-2xl p-5">
              <h2 className="mb-3 text-sm font-semibold text-white">
                Chercher les voisins d'une molecule
              </h2>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  placeholder="SMILES"
                  className="w-full rounded-lg border border-white/10 bg-base-900/60 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500 focus:border-cyan-glow/50 focus:outline-none"
                />
                <button
                  onClick={onSearch}
                  className="inline-flex shrink-0 cursor-pointer items-center rounded-lg bg-gradient-to-r from-cyan-glow to-emerald-glow px-3 text-base-950 transition-all hover:brightness-110"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["CC(=O)Oc1ccccc1C(=O)O", "CN1C=NC2=C1C(=O)N(C(=O)N2C)C"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuery(s);
                      setTimeout(onSearch, 0);
                    }}
                    className="cursor-pointer rounded-full bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-400 hover:text-white"
                  >
                    {s.slice(0, 14)}...
                  </button>
                ))}
              </div>

              {voisins.length > 0 && (
                <div className="mt-4 space-y-2">
                  {voisins.map((v, i) => (
                    <div key={v.index} className="rounded-lg bg-white/[0.03] p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-cyan-glow">
                          Tanimoto {v.similarite.toFixed(2)}
                        </span>
                        <span
                          className={
                            v.activite === 1 ? "text-emerald-glow" : "text-slate-400"
                          }
                        >
                          {["inactif", "actif", "intermediaire"][v.activite]}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[10px] text-slate-500">
                        {v.smiles}
                      </p>
                      <div className="mt-1 text-slate-400">
                        pIC50 {v.pIC50.toFixed(1)} {i === 0 && "  (le plus proche)"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Import CSV */}
            <div className="glass rounded-2xl p-5">
              <h2 className="mb-1 text-sm font-semibold text-white">
                Importer un fichier de molecules
              </h2>
              <p className="mb-3 text-xs text-slate-400">
                Un SMILES par ligne. Le moteur Rust calcule leurs proprietes et
                les place sur la carte via leur plus proche voisin connu.
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-200 transition-colors hover:border-cyan-glow/30">
                <Upload className="h-4 w-4" />
                Choisir un fichier
                <input type="file" accept=".csv,.smi,.txt" onChange={onImport} className="hidden" />
              </label>
              {messageImport && (
                <p className="mt-3 text-xs text-slate-400">{messageImport}</p>
              )}
            </div>

            {/* Legende */}
            <div className="glass rounded-2xl p-5 text-xs">
              <h2 className="mb-2 font-semibold text-white">Legende</h2>
              {colorMode === "activite" ? (
                <div className="space-y-1.5">
                  <Pastille couleur="#34d399" texte="Molecule active" />
                  <Pastille couleur="#64748b" texte="Molecule inactive" />
                  <Pastille couleur="#a78bfa" texte="Activite intermediaire" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {[0, 1, 2, 3, 4].map((f) => (
                    <Pastille
                      key={f}
                      couleur={COUL_FAMILLE[f]}
                      texte={`Famille chimique ${f}`}
                    />
                  ))}
                </div>
              )}
              <div className="mt-3 border-t border-white/10 pt-3 space-y-1.5">
                <Pastille couleur="#22d3ee" texte="Voisins trouves" rond />
                <Pastille couleur="#f59e0b" texte="Molecules importees" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des molecules importees */}
      {importees.length > 0 && (
        <div className="mt-8 glass-strong overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-lg font-semibold text-white">
              Molecules importees
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Proprietes calculees par Rust et molecule connue la plus proche.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs text-slate-400">
                <tr>
                  <th className="p-3 font-medium">Molecule</th>
                  <th className="p-3 font-medium">Poids</th>
                  <th className="p-3 font-medium">LogP</th>
                  <th className="p-3 font-medium">Lipinski</th>
                  <th className="p-3 font-medium">Plus proche connue</th>
                  <th className="p-3 font-medium">Tanimoto</th>
                </tr>
              </thead>
              <tbody>
                {importees.map((m, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="max-w-[220px] truncate p-3 font-mono text-xs text-slate-300">
                      {m.smiles}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-300">
                      {m.proprietes.poidsMoleculaire}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-300">
                      {m.proprietes.logP}
                    </td>
                    <td className="p-3 text-xs">
                      <span
                        className={
                          m.proprietes.respecteLipinski
                            ? "text-emerald-glow"
                            : "text-slate-500"
                        }
                      >
                        {m.proprietes.respecteLipinski ? "conforme" : "viole"}
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      <span
                        className={
                          m.voisin.activite === 1 ? "text-emerald-glow" : "text-slate-400"
                        }
                      >
                        pIC50 {m.voisin.pIC50.toFixed(1)}{" "}
                        {["inactif", "actif", "intermediaire"][m.voisin.activite]}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-cyan-glow">
                      {m.voisin.similarite.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Pastille({
  couleur,
  texte,
  rond,
}: {
  couleur: string;
  texte: string;
  rond?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-300">
      <span
        className={`inline-block h-3 w-3 ${rond ? "rounded-full" : "rounded-sm"}`}
        style={{ background: couleur }}
      />
      {texte}
    </div>
  );
}
