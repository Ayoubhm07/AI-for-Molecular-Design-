// Chargeur de l'espace chimique : coordonnees reelles des 13577 molecules EGFR,
// leurs empreintes calculees par le moteur Rust, et la recherche de plus proches
// voisins par similarite de Tanimoto.

import { initMolcore, type MolcoreApi } from "@/lib/wasm/molcore";

export interface CarteData {
  count: number;
  fpBytes: number;
  x: number[]; // 0..1
  y: number[]; // 0..1
  a: number[]; // 0 inactif, 1 actif, 2 intermediaire
  p: number[]; // pIC50
  f: number[]; // famille (-1 si inconnue)
  l: number[]; // 1 si respecte Lipinski, 0 sinon
}

export interface Voisin {
  index: number;
  smiles: string;
  pIC50: number;
  activite: number;
  famille: number;
  x: number;
  y: number;
  similarite: number;
}

export interface ChemSpace {
  api: MolcoreApi;
  carte: CarteData;
  smiles: string[];
  fps: Uint8Array;
  chercherVoisins: (querySmiles: string, k: number) => Voisin[];
}

let promesse: Promise<ChemSpace | null> | null = null;

export function loadChemSpace(): Promise<ChemSpace | null> {
  if (promesse) return promesse;
  promesse = charger();
  return promesse;
}

async function charger(): Promise<ChemSpace | null> {
  if (typeof window === "undefined") return null;
  try {
    const [api, carte, smiles, fpsBuf] = await Promise.all([
      initMolcore(),
      fetch("/egfr_map.json").then((r) => r.json() as Promise<CarteData>),
      fetch("/egfr_smiles.json").then((r) => r.json() as Promise<string[]>),
      fetch("/egfr_fps.bin").then((r) => r.arrayBuffer()),
    ]);
    if (!api) return null;
    const fps = new Uint8Array(fpsBuf);

    function chercherVoisins(querySmiles: string, k: number): Voisin[] {
      const fp = api!.computeFingerprint(querySmiles);
      const scores = api!.computeTanimotoBuffer(fp, fps, carte.count);
      // On recupere les k meilleurs indices sans trier tout le tableau.
      const meilleurs: number[] = [];
      for (let i = 0; i < carte.count; i++) {
        if (meilleurs.length < k) {
          meilleurs.push(i);
          meilleurs.sort((a, b) => scores[a] - scores[b]);
        } else if (scores[i] > scores[meilleurs[0]]) {
          meilleurs[0] = i;
          meilleurs.sort((a, b) => scores[a] - scores[b]);
        }
      }
      return meilleurs
        .reverse()
        .map((idx) => ({
          index: idx,
          smiles: smiles[idx],
          pIC50: carte.p[idx],
          activite: carte.a[idx],
          famille: carte.f[idx],
          x: carte.x[idx],
          y: carte.y[idx],
          similarite: Math.round(scores[idx] * 1000) / 1000,
        }));
    }

    return { api, carte, smiles, fps, chercherVoisins };
  } catch (e) {
    console.warn("Espace chimique indisponible.", e);
    return null;
  }
}
