# molcore — moteur cheminformatique Rust / WebAssembly

Ce crate calcule, dans le navigateur, des descripteurs moleculaires et une
similarite de Tanimoto reelle a partir d'un SMILES. Il remplace les
approximations JavaScript du site.

## Choix technique : WebAssembly brut, sans compilateur C

Le crate est compile en WebAssembly sans wasm-bindgen ni wasm-pack, et sans
aucune dependance externe. La raison est concrete : la machine de developpement
n'a pas de compilateur C fonctionnel, ce qui fait echouer wasm-bindgen (qui
passe par des proc-macros liees cote hote). En restant en WASM brut, la
compilation n'utilise que le linker interne rust-lld et ne demande aucun outil C.

Le prix a payer est une interface bas niveau : le passage des chaines entre
JavaScript et Rust se fait a la main via les fonctions alloc et dealloc, plus un
pointeur et une longueur. Tout ce cablage est encapsule dans le wrapper
TypeScript lib/wasm/molcore.ts.

## Fonctions exposees

- alloc(len) et dealloc(ptr, len) : gestion memoire pour passer les SMILES.
- fp_bytes() : taille en octets d'une empreinte.
- fingerprint(ptr, len, out) : empreinte circulaire de rayon 1 (esprit ECFP).
- tanimoto(a, b, nbytes) : similarite de Tanimoto par popcount.
- tanimoto_batch(query, db, count, nbytes, out) : une requete contre tout un lot,
  en une seule traversee de frontiere.
- descriptors(ptr, len, out) : ecrit 6 valeurs (poids, logP, donneurs H,
  accepteurs H, atomes lourds, anneaux aromatiques).

## Recompiler

Depuis la racine du site :

```
npm run build:wasm
```

Ce script lance cargo build en cible wasm32-unknown-unknown et copie l'artefact
dans public/molcore.wasm. En Git Bash, si cargo n'est pas trouve, faire d'abord
export PATH="$HOME/.cargo/bin:$PATH".

## Verifier

```
npm run verify:wasm
```

Charge molcore.wasm dans Node et verifie les valeurs pour le benzene et
l'ethanol, ainsi que la coherence de la similarite de Tanimoto. On passe par
Node plutot que par cargo test parce que les tests unitaires Rust compilent pour
l'hote, dont le linker n'est pas disponible sur cette machine.

## Limite assumee

Le parseur SMILES gere les cas courants mais n'est pas un moteur de chimie
complet comme RDKit. L'empreinte est une empreinte circulaire simplifiee, pas
l'ECFP officiel. Les descripteurs, en particulier le logP, sont des
approximations par contribution. C'est suffisant et coherent pour une
demonstration, pas pour une decision reglementaire.
