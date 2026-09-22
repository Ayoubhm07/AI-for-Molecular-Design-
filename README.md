# AI for Molecular Design

A machine-learning proof of concept for drug discovery, applied to inhibition of the **EGFR** protein,
plus a web application that makes the models usable in a browser.

Screening molecules in a laboratory is slow and expensive. This project builds a chain of models that
narrows the field first, so the bench only sees the candidates worth testing.

## The two parts

| Folder | What it is |
|---|---|
| `POC_Molecular_Design/` | Eight Jupyter notebooks, a Streamlit dashboard (`app.py`), and the trained models |
| `POC_Molecular_Design_Web/` | `Nucleus`, a Next.js site that runs the chemistry in the browser through a Rust/WebAssembly engine |

## The data

Activity measurements (IC50) for target **CHEMBL203** from the public **ChEMBL** database, pulled
automatically through the official `chembl_webresource_client` package — no API key. Notebook 1 fetches and
cleans the dataset that every other notebook reloads; a manual CSV export is supported as a fallback when
the network blocks the package.

## The eight pipelines

| Notebook | Task | The question a researcher asks |
|---|---|---|
| 01 Acquisition & preparation | Collection and cleaning | How do raw measurements become usable data? |
| 02 Descriptor extraction | RDKit descriptors and fingerprints | How do you hand a molecule to a model? |
| 03 Exploratory analysis | EDA and chemical space | What separates an active molecule from an inactive one? |
| 04 Active / inactive | Classification | Will this molecule act on EGFR? |
| 05 pIC50 | Regression | How potent will it be? |
| 06 Chemical families | Clustering | Which families deserve to be explored first? |
| 07 Chemical space | PCA and t-SNE | Where do the active molecules sit on the map? |
| 08 Bonus | Recommendation, scaffolds, activity cliffs | What looks like my molecule, and why does a small change flip the result? |

Every notebook follows the same shape: business need, loading, processing, a simple baseline before the
advanced model, evaluation, interpretation for the researcher, `joblib` export, and a conclusion that states
its limits. Experiments use `random_state = 42`.

## Running the notebooks and the dashboard

```bash
cd POC_Molecular_Design
pip install -r requirements.txt
# run notebooks 1, 2 and 4 first: they produce the dataset and the classification model
streamlit run app.py
```

The dashboard takes a molecule as SMILES and returns its predicted activity, its estimated potency and its
known analogues.

## The web application

```bash
cd POC_Molecular_Design_Web
npm install
npm run dev     # http://localhost:3000
```

Molecular properties and similarity are computed by a cheminformatics engine written in **Rust and compiled
to WebAssembly**, running in the browser. The compiled artifact is `public/molcore.wasm`, lazy-loaded by
`lib/wasm/molcore.ts`. If WebAssembly fails to load, the site falls back to the JavaScript implementation, so
the demo never breaks. The Analytics page benchmarks JavaScript against Rust live in the browser; the numbers
are measured on the spot, not hard-coded.

```bash
npm run build:wasm    # rebuild the engine after changing the Rust code
npm run verify:wasm   # load the wasm in Node and check benzene, ethanol, Tanimoto
```

The crate is compiled to raw WebAssembly, without `wasm-bindgen` and without a C compiler, because the
development machine had no working C linker. See `rust/README.md`.

## Stated limits

- The SMILES parser and the fingerprint in the browser engine are simplified models, not RDKit. The site is a
  decision aid and a demonstration, not a scientific verdict.
- IC50 values carry experimental uncertainty, which bounds the accuracy any model can reach.
- A model trained on EGFR says nothing about another target, and nothing about toxicity. This is a
  first-pass filter.
- No external AI API is used: every model is trained locally with scikit-learn, XGBoost and RDKit.
- A generative model of molecules (GraphVAE, MolGAN, or a Transformer over SMILES) was deliberately left out
  of this prototype.

French versions of the documentation live in `POC_Molecular_Design/README.md` and
`POC_Molecular_Design_Web/README.md`.
