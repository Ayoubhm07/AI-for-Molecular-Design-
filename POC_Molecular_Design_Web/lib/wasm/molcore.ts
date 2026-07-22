// Wrapper TypeScript du moteur cheminformatique Rust/WebAssembly (molcore.wasm).
//
// Charge le module en lazy, cote client uniquement, une seule fois (singleton).
// Expose une API typee. En cas d'echec de chargement, initMolcore renvoie null
// et l'appelant retombe sur les fonctions JavaScript de lib/chemistry.ts.
//
// Le passage des chaines se fait a la main : on ecrit les octets UTF-8 du SMILES
// dans la memoire du module via alloc, on appelle la fonction, on relit le
// resultat, puis on libere avec dealloc. Le contrat FFI est fige cote Rust.

import type { Proprietes } from "@/lib/chemistry";

interface MolcoreExports {
  memory: WebAssembly.Memory;
  alloc: (len: number) => number;
  dealloc: (ptr: number, len: number) => void;
  fp_bytes: () => number;
  fingerprint: (ptr: number, len: number, out: number) => void;
  tanimoto: (a: number, b: number, nbytes: number) => number;
  tanimoto_batch: (
    query: number,
    db: number,
    count: number,
    nbytes: number,
    out: number
  ) => void;
  descriptors: (ptr: number, len: number, out: number) => void;
  screen: (
    query: number,
    db: number,
    count: number,
    nbytes: number,
    pic50Norm: number,
    lipinski: number,
    wSim: number,
    wPot: number,
    wLip: number,
    out: number
  ) => void;
}

export interface ResultatCriblage {
  scores: Float64Array;
  sims: Float64Array;
}

export interface MolcoreApi {
  computeDescriptors: (smiles: string) => Proprietes;
  computeFingerprint: (smiles: string) => Uint8Array;
  computeTanimoto: (a: Uint8Array, b: Uint8Array) => number;
  computeTanimotoMany: (query: Uint8Array, db: Uint8Array[]) => Float64Array;
  // Version optimisee : la base est deja un buffer contigu de count empreintes.
  computeTanimotoBuffer: (
    query: Uint8Array,
    db: Uint8Array,
    count: number
  ) => Float64Array;
  computeScreen: (
    query: Uint8Array,
    db: Uint8Array,
    count: number,
    pic50Norm: Float32Array,
    lipinski: Uint8Array,
    poids: { sim: number; pot: number; lip: number }
  ) => ResultatCriblage;
  fpBytes: number;
}

let promesse: Promise<MolcoreApi | null> | null = null;

export function initMolcore(): Promise<MolcoreApi | null> {
  if (promesse) return promesse;
  promesse = charger();
  return promesse;
}

async function charger(): Promise<MolcoreApi | null> {
  if (typeof window === "undefined") return null;
  try {
    const reponse = fetch("/molcore.wasm");
    let instance: WebAssembly.Instance;
    if (WebAssembly.instantiateStreaming) {
      const res = await WebAssembly.instantiateStreaming(reponse, {});
      instance = res.instance;
    } else {
      const buffer = await (await reponse).arrayBuffer();
      const res = await WebAssembly.instantiate(buffer, {});
      instance = res.instance;
    }
    return construire(instance.exports as unknown as MolcoreExports);
  } catch (e) {
    // Le fallback JavaScript prendra le relais.
    console.warn("molcore.wasm indisponible, repli sur le calcul JavaScript.", e);
    return null;
  }
}

function construire(ex: MolcoreExports): MolcoreApi {
  const encodeur = new TextEncoder();
  const fpBytes = ex.fp_bytes();

  const memU8 = () => new Uint8Array(ex.memory.buffer);

  function ecrireSmiles(smiles: string): [number, number] {
    const octets = encodeur.encode(smiles);
    const ptr = ex.alloc(octets.length);
    memU8().set(octets, ptr);
    return [ptr, octets.length];
  }

  function computeDescriptors(smiles: string): Proprietes {
    const [ptr, len] = ecrireSmiles(smiles);
    const outPtr = ex.alloc(6 * 8);
    ex.descriptors(ptr, len, outPtr);
    const dv = new DataView(ex.memory.buffer);
    const poidsMoleculaire = dv.getFloat64(outPtr, true);
    const logP = dv.getFloat64(outPtr + 8, true);
    const donneursH = dv.getFloat64(outPtr + 16, true);
    const accepteursH = dv.getFloat64(outPtr + 24, true);
    const atomesLourds = dv.getFloat64(outPtr + 32, true);
    const anneauxAromatiques = dv.getFloat64(outPtr + 40, true);
    ex.dealloc(ptr, len);
    ex.dealloc(outPtr, 6 * 8);

    const respecteLipinski =
      poidsMoleculaire <= 500 &&
      logP <= 5 &&
      donneursH <= 5 &&
      accepteursH <= 10;

    return {
      poidsMoleculaire: Math.round(poidsMoleculaire * 100) / 100,
      logP: Math.round(logP * 100) / 100,
      donneursH: Math.round(donneursH),
      accepteursH: Math.round(accepteursH),
      atomesLourds: Math.round(atomesLourds),
      anneauxAromatiques: Math.round(anneauxAromatiques),
      respecteLipinski,
    };
  }

  function computeFingerprint(smiles: string): Uint8Array {
    const [ptr, len] = ecrireSmiles(smiles);
    const outPtr = ex.alloc(fpBytes);
    ex.fingerprint(ptr, len, outPtr);
    const fp = memU8().slice(outPtr, outPtr + fpBytes);
    ex.dealloc(ptr, len);
    ex.dealloc(outPtr, fpBytes);
    return fp;
  }

  function computeTanimoto(a: Uint8Array, b: Uint8Array): number {
    const pa = ex.alloc(fpBytes);
    const pb = ex.alloc(fpBytes);
    const vue = memU8();
    vue.set(a, pa);
    vue.set(b, pb);
    const t = ex.tanimoto(pa, pb, fpBytes);
    ex.dealloc(pa, fpBytes);
    ex.dealloc(pb, fpBytes);
    return t;
  }

  function computeTanimotoMany(query: Uint8Array, db: Uint8Array[]): Float64Array {
    const count = db.length;
    const pq = ex.alloc(fpBytes);
    const pdb = ex.alloc(count * fpBytes);
    const pout = ex.alloc(count * 8);
    const vue = memU8();
    vue.set(query, pq);
    for (let j = 0; j < count; j++) vue.set(db[j], pdb + j * fpBytes);
    ex.tanimoto_batch(pq, pdb, count, fpBytes, pout);
    const dv = new DataView(ex.memory.buffer);
    const res = new Float64Array(count);
    for (let j = 0; j < count; j++) res[j] = dv.getFloat64(pout + j * 8, true);
    ex.dealloc(pq, fpBytes);
    ex.dealloc(pdb, count * fpBytes);
    ex.dealloc(pout, count * 8);
    return res;
  }

  function computeTanimotoBuffer(
    query: Uint8Array,
    db: Uint8Array,
    count: number
  ): Float64Array {
    const pq = ex.alloc(fpBytes);
    const pdb = ex.alloc(count * fpBytes);
    const pout = ex.alloc(count * 8);
    const vue = memU8();
    vue.set(query, pq);
    vue.set(db, pdb);
    ex.tanimoto_batch(pq, pdb, count, fpBytes, pout);
    const dv = new DataView(ex.memory.buffer);
    const res = new Float64Array(count);
    for (let j = 0; j < count; j++) res[j] = dv.getFloat64(pout + j * 8, true);
    ex.dealloc(pq, fpBytes);
    ex.dealloc(pdb, count * fpBytes);
    ex.dealloc(pout, count * 8);
    return res;
  }

  function computeScreen(
    query: Uint8Array,
    db: Uint8Array,
    count: number,
    pic50Norm: Float32Array,
    lipinski: Uint8Array,
    poids: { sim: number; pot: number; lip: number }
  ): ResultatCriblage {
    const pq = ex.alloc(fpBytes);
    const pdb = ex.alloc(count * fpBytes);
    const ppot = ex.alloc(count * 4);
    const plip = ex.alloc(count);
    const pout = ex.alloc(count * 2 * 8);
    const vue = memU8();
    vue.set(query, pq);
    vue.set(db, pdb);
    vue.set(lipinski, plip);
    new Float32Array(ex.memory.buffer, ppot, count).set(pic50Norm);
    ex.screen(
      pq,
      pdb,
      count,
      fpBytes,
      ppot,
      plip,
      poids.sim,
      poids.pot,
      poids.lip,
      pout
    );
    const dv = new DataView(ex.memory.buffer);
    const scores = new Float64Array(count);
    const sims = new Float64Array(count);
    for (let j = 0; j < count; j++) {
      scores[j] = dv.getFloat64(pout + j * 16, true);
      sims[j] = dv.getFloat64(pout + j * 16 + 8, true);
    }
    ex.dealloc(pq, fpBytes);
    ex.dealloc(pdb, count * fpBytes);
    ex.dealloc(ppot, count * 4);
    ex.dealloc(plip, count);
    ex.dealloc(pout, count * 2 * 8);
    return { scores, sims };
  }

  return {
    computeDescriptors,
    computeFingerprint,
    computeTanimoto,
    computeTanimotoMany,
    computeTanimotoBuffer,
    computeScreen,
    fpBytes,
  };
}
