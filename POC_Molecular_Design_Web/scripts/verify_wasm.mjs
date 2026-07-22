// Verification du moteur molcore.wasm dans Node.
//
// On ne peut pas lancer cargo test sur cette machine (le linker hote MSVC n'est
// pas installe, c'est la raison meme du choix wasm brut). On verifie donc le
// moteur reel en chargeant molcore.wasm exactement comme le fera le navigateur.
//
// Lancement : node scripts/verify_wasm.mjs

import { readFileSync } from "node:fs";

const bytes = readFileSync(
  new URL("../public/molcore.wasm", import.meta.url)
);
const { instance } = await WebAssembly.instantiate(bytes, {});
const ex = instance.exports;

const memU8 = () => new Uint8Array(ex.memory.buffer);

function writeStr(s) {
  const enc = new TextEncoder().encode(s);
  const ptr = ex.alloc(enc.length);
  memU8().set(enc, ptr);
  return [ptr, enc.length];
}

function descriptors(s) {
  const [ptr, len] = writeStr(s);
  const outPtr = ex.alloc(6 * 8);
  ex.descriptors(ptr, len, outPtr);
  const dv = new DataView(ex.memory.buffer);
  const out = [];
  for (let i = 0; i < 6; i++) out.push(dv.getFloat64(outPtr + i * 8, true));
  ex.dealloc(ptr, len);
  ex.dealloc(outPtr, 6 * 8);
  return {
    poids: out[0],
    logP: out[1],
    donneursH: out[2],
    accepteursH: out[3],
    atomesLourds: out[4],
    anneauxAromatiques: out[5],
  };
}

function fingerprint(s) {
  const [ptr, len] = writeStr(s);
  const n = ex.fp_bytes();
  const outPtr = ex.alloc(n);
  ex.fingerprint(ptr, len, outPtr);
  const fp = memU8().slice(outPtr, outPtr + n);
  ex.dealloc(ptr, len);
  ex.dealloc(outPtr, n);
  return fp;
}

function tanimoto(a, b) {
  const n = ex.fp_bytes();
  const pa = ex.alloc(n);
  const pb = ex.alloc(n);
  memU8().set(a, pa);
  memU8().set(b, pb);
  const t = ex.tanimoto(pa, pb, n);
  ex.dealloc(pa, n);
  ex.dealloc(pb, n);
  return t;
}

let echecs = 0;
function verifie(nom, condition, detail) {
  const statut = condition ? "OK  " : "ECHEC";
  if (!condition) echecs++;
  console.log(`  [${statut}] ${nom}  ${detail ?? ""}`);
}

console.log("Verification molcore.wasm");
console.log("fp_bytes =", ex.fp_bytes());
console.log();

console.log("Benzene c1ccccc1");
const benzene = descriptors("c1ccccc1");
console.log("  descripteurs :", benzene);
verifie("6 atomes lourds", benzene.atomesLourds === 6);
verifie("1 anneau aromatique", benzene.anneauxAromatiques === 1);
verifie("poids proche de 78", Math.abs(benzene.poids - 78.11) < 2.0, `= ${benzene.poids.toFixed(2)}`);
console.log();

console.log("Ethanol CCO");
const ethanol = descriptors("CCO");
console.log("  descripteurs :", ethanol);
verifie("3 atomes lourds", ethanol.atomesLourds === 3);
verifie("1 accepteur H", ethanol.accepteursH === 1);
verifie("au moins 1 donneur H", ethanol.donneursH >= 1);
verifie("poids proche de 46", Math.abs(ethanol.poids - 46.07) < 2.0, `= ${ethanol.poids.toFixed(2)}`);
console.log();

console.log("Tanimoto");
const fpEth = fingerprint("CCO");
const fpBenz = fingerprint("c1ccccc1");
const tSelf = tanimoto(fpEth, fpEth);
const tCross = tanimoto(fpEth, fpBenz);
verifie("similarite d'une molecule avec elle-meme = 1", Math.abs(tSelf - 1.0) < 1e-9, `= ${tSelf.toFixed(3)}`);
verifie("similarite ethanol/benzene < 1", tCross < 1.0, `= ${tCross.toFixed(3)}`);
console.log();

// Un vrai inhibiteur EGFR doit se ressembler plus a lui-meme qu'a l'aspirine
const gefitinib = "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1";
const aspirine = "CC(=O)Oc1ccccc1C(=O)O";
const fpGef = fingerprint(gefitinib);
const fpAsp = fingerprint(aspirine);
const tGefAsp = tanimoto(fpGef, fpAsp);
console.log("Gefitinib vs Aspirine, Tanimoto =", tGefAsp.toFixed(3));
verifie("Tanimoto entre 0 et 1", tGefAsp >= 0 && tGefAsp <= 1);
console.log();

if (echecs === 0) {
  console.log("Tous les tests passent.");
  process.exit(0);
} else {
  console.log(`${echecs} test(s) en echec.`);
  process.exit(1);
}
