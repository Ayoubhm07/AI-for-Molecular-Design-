// Prepare le dataset de l'espace chimique pour le navigateur.
//
// Entree : data/egfr_carte.csv (13577 molecules reelles avec coordonnees t-SNE
// deja calculees par les notebooks) et data/egfr_familles.csv (famille de chaque
// molecule issue du clustering).
//
// Sortie dans public/ :
//   egfr_map.json    : coordonnees normalisees + activite + pIC50 + famille
//   egfr_smiles.json : les SMILES, alignes par index
//   egfr_fps.bin     : les empreintes de Morgan calculees par le moteur Rust
//
// Les empreintes sont calculees ici, une fois, avec molcore.wasm, exactement le
// meme moteur que le navigateur. Le navigateur n'a donc qu'a charger le binaire.
//
// Lancement : npm run build:dataset

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

// ----------------------------------------------------------------------------
// Chargement du moteur Rust/WASM
// ----------------------------------------------------------------------------
const wasmBytes = readFileSync(join(racine, "public", "molcore.wasm"));
const { instance } = await WebAssembly.instantiate(wasmBytes, {});
const ex = instance.exports;
const memU8 = () => new Uint8Array(ex.memory.buffer);
const FP = ex.fp_bytes();

function fingerprint(smiles) {
  const enc = new TextEncoder().encode(smiles);
  const ptr = ex.alloc(enc.length);
  memU8().set(enc, ptr);
  const out = ex.alloc(FP);
  ex.fingerprint(ptr, enc.length, out);
  const fp = memU8().slice(out, out + FP);
  ex.dealloc(ptr, enc.length);
  ex.dealloc(out, FP);
  return fp;
}

// Renvoie 1 si la molecule respecte la regle de Lipinski, 0 sinon.
function respecteLipinski(smiles) {
  const enc = new TextEncoder().encode(smiles);
  const ptr = ex.alloc(enc.length);
  memU8().set(enc, ptr);
  const out = ex.alloc(6 * 8);
  ex.descriptors(ptr, enc.length, out);
  const dv = new DataView(ex.memory.buffer);
  const poids = dv.getFloat64(out, true);
  const logP = dv.getFloat64(out + 8, true);
  const donneurs = dv.getFloat64(out + 16, true);
  const accepteurs = dv.getFloat64(out + 24, true);
  ex.dealloc(ptr, enc.length);
  ex.dealloc(out, 6 * 8);
  return poids <= 500 && logP <= 5 && donneurs <= 5 && accepteurs <= 10 ? 1 : 0;
}

// ----------------------------------------------------------------------------
// Lecture des CSV
// ----------------------------------------------------------------------------
function lignesCsv(chemin) {
  const texte = readFileSync(join(racine, "data", chemin), "utf8");
  return texte.split(/\r?\n/).filter((l) => l.length > 0);
}

// Table SMILES -> famille
const familleParSmiles = new Map();
{
  const lignes = lignesCsv("egfr_familles.csv");
  for (let i = 1; i < lignes.length; i++) {
    const cols = lignes[i].split(",");
    // colonnes : canonical_smiles, pIC50, activite, famille
    const smiles = cols[0];
    const famille = parseInt(cols[cols.length - 1], 10);
    if (!Number.isNaN(famille)) familleParSmiles.set(smiles, famille);
  }
}

const codeActivite = { actif: 1, inactif: 0, intermediaire: 2 };

const smilesArr = [];
const pIC50Arr = [];
const activiteArr = [];
const familleArr = [];
const tsne1 = [];
const tsne2 = [];

{
  const lignes = lignesCsv("egfr_carte.csv");
  for (let i = 1; i < lignes.length; i++) {
    const cols = lignes[i].split(",");
    // colonnes : canonical_smiles, pIC50, activite, tsne1, tsne2, pca1, pca2
    if (cols.length < 5) continue;
    const smiles = cols[0];
    const pIC50 = parseFloat(cols[1]);
    const activite = codeActivite[cols[2]] ?? 2;
    const x = parseFloat(cols[3]);
    const y = parseFloat(cols[4]);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    smilesArr.push(smiles);
    pIC50Arr.push(Math.round(pIC50 * 100) / 100);
    activiteArr.push(activite);
    familleArr.push(familleParSmiles.get(smiles) ?? -1);
    tsne1.push(x);
    tsne2.push(y);
  }
}

const n = smilesArr.length;
console.log(`Molecules lues : ${n}`);

// ----------------------------------------------------------------------------
// Normalisation des coordonnees en 0..1
// ----------------------------------------------------------------------------
const minX = Math.min(...tsne1);
const maxX = Math.max(...tsne1);
const minY = Math.min(...tsne2);
const maxY = Math.max(...tsne2);
const nx = tsne1.map((v) => Math.round(((v - minX) / (maxX - minX)) * 1000) / 1000);
const ny = tsne2.map((v) => Math.round(((v - minY) / (maxY - minY)) * 1000) / 1000);

// ----------------------------------------------------------------------------
// Empreintes via le moteur Rust
// ----------------------------------------------------------------------------
console.log("Calcul des empreintes et de Lipinski avec molcore.wasm...");
const fps = new Uint8Array(n * FP);
const lipinski = [];
for (let i = 0; i < n; i++) {
  fps.set(fingerprint(smilesArr[i]), i * FP);
  lipinski.push(respecteLipinski(smilesArr[i]));
  if (i % 3000 === 0) console.log(`  ${i} / ${n}`);
}

// ----------------------------------------------------------------------------
// Ecriture
// ----------------------------------------------------------------------------
const pub = (f) => join(racine, "public", f);

writeFileSync(
  pub("egfr_map.json"),
  JSON.stringify({
    count: n,
    fpBytes: FP,
    x: nx,
    y: ny,
    a: activiteArr,
    p: pIC50Arr,
    f: familleArr,
    l: lipinski,
  })
);
writeFileSync(pub("egfr_smiles.json"), JSON.stringify(smilesArr));
writeFileSync(pub("egfr_fps.bin"), fps);

const ko = (f) => (readFileSync(pub(f)).length / 1024).toFixed(0);
console.log("Ecrit :");
console.log(`  public/egfr_map.json    ${ko("egfr_map.json")} Ko`);
console.log(`  public/egfr_smiles.json ${ko("egfr_smiles.json")} Ko`);
console.log(`  public/egfr_fps.bin     ${ko("egfr_fps.bin")} Ko`);
