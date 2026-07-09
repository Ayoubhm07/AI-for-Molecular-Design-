"""
Dashboard du POC AI for Molecular Design.

Application Streamlit qui met en scene les modeles entraines dans les notebooks.
L'utilisateur saisit une molecule au format SMILES ou importe un CSV, et le
tableau de bord affiche la prediction d'activite, la puissance estimee, la
position dans l'espace chimique et les molecules analogues connues.

Lancement :
  streamlit run app.py
"""

import numpy as np
import pandas as pd
import joblib
import streamlit as st

from rdkit import Chem, DataStructs
from rdkit.Chem import Descriptors, Lipinski, Draw, AllChem

st.set_page_config(page_title="AI for Molecular Design", layout="wide")

DESCRIPTEURS = ['poids_moleculaire', 'logP', 'donneurs_H', 'accepteurs_H',
                'tpsa', 'liaisons_rotatives', 'anneaux_aromatiques']


@st.cache_resource
def charger_modeles():
    """Charge les artefacts produits par les notebooks. Les fichiers manquants sont tolerés."""
    artefacts = {}
    for cle, fichier in [
        ('classif', 'modele_classification_activite.pkl'),
        ('regression', 'modele_regression_pic50.pkl'),
        ('clustering', 'modele_clustering_familles.pkl'),
    ]:
        try:
            artefacts[cle] = joblib.load(fichier)
        except FileNotFoundError:
            artefacts[cle] = None
    return artefacts


@st.cache_data
def charger_base_analogues():
    """Charge la base de molecules connues pour la recherche d'analogues."""
    try:
        df = pd.read_csv('egfr_descripteurs.csv')
        df['activite'] = np.where(df['pIC50'] >= 6, 'actif',
                                  np.where(df['pIC50'] < 5, 'inactif', 'intermediaire'))
        return df
    except FileNotFoundError:
        return None


def descripteurs_depuis_mol(mol):
    return {
        'poids_moleculaire': Descriptors.MolWt(mol),
        'logP': Descriptors.MolLogP(mol),
        'donneurs_H': Lipinski.NumHDonors(mol),
        'accepteurs_H': Lipinski.NumHAcceptors(mol),
        'tpsa': Descriptors.TPSA(mol),
        'liaisons_rotatives': Descriptors.NumRotatableBonds(mol),
        'anneaux_aromatiques': Lipinski.NumAromaticRings(mol),
    }


def fingerprint(mol, n_bits=2048):
    fp = AllChem.GetMorganFingerprintAsBitVect(mol, 2, nBits=n_bits)
    arr = np.zeros((n_bits,), dtype=np.int8)
    DataStructs.ConvertToNumpyArray(fp, arr)
    return arr


artefacts = charger_modeles()
base = charger_base_analogues()

st.title("AI for Molecular Design")
st.caption("Aide a la preselection de molecules candidates contre l'EGFR (cible anticancereuse CHEMBL203)")

onglet_molecule, onglet_analogues, onglet_apropos = st.tabs(
    ["Analyser une molecule", "Rechercher des analogues", "A propos"])


with onglet_molecule:
    st.subheader("Predire l'activite et la puissance d'une molecule")
    smiles = st.text_input(
        "SMILES de la molecule",
        value="CC(=O)Oc1ccccc1C(=O)O",
        help="Coller le code SMILES d'une molecule. L'exemple par defaut est l'aspirine."
    )

    if st.button("Analyser"):
        mol = Chem.MolFromSmiles(smiles) if smiles else None
        if mol is None:
            st.error("SMILES invalide. Verifier la syntaxe.")
        else:
            col_gauche, col_droite = st.columns([1, 1])

            with col_gauche:
                st.image(Draw.MolToImage(mol, size=(350, 280)), caption="Structure")

            with col_droite:
                desc = descripteurs_depuis_mol(mol)
                st.write("Proprietes calculees :")
                st.dataframe(pd.DataFrame([desc]).T.rename(columns={0: 'valeur'}).round(2))

                fp = fingerprint(mol)

                if artefacts['classif'] is not None:
                    modele = artefacts['classif']['modele']
                    proba = modele.predict_proba(fp.reshape(1, -1))[0][1]
                    if proba >= 0.5:
                        st.success(f"Molecule predite ACTIVE sur l'EGFR (confiance {proba*100:.0f}%)")
                    else:
                        st.warning(f"Molecule predite INACTIVE (confiance {(1-proba)*100:.0f}%)")
                else:
                    st.info("Modele de classification absent, executer le notebook 4.")

                if artefacts['regression'] is not None:
                    from sklearn.preprocessing import StandardScaler
                    desc_vec = np.array([[desc[d] for d in DESCRIPTEURS]])
                    # Le modele de regression attend descripteurs standardises + empreintes.
                    # Pour la demo on reconstruit la meme combinaison ; en production on
                    # sauvegarderait aussi le scaler ajuste sur le train.
                    x = np.hstack([desc_vec, fp.reshape(1, -1)])
                    try:
                        pic50 = artefacts['regression']['modele'].predict(x)[0]
                        st.metric("pIC50 estime", f"{pic50:.2f}")
                    except Exception:
                        st.info("Dimensions du modele de regression incompatibles avec cette entree simplifiee.")


with onglet_analogues:
    st.subheader("Trouver des molecules connues similaires")
    if base is None:
        st.info("Base de molecules absente, executer d'abord le notebook 2 pour generer egfr_descripteurs.csv.")
    else:
        smiles_req = st.text_input("SMILES de reference", value="CC(=O)Oc1ccccc1C(=O)O", key="analog")
        n = st.slider("Nombre d'analogues", 3, 10, 5)
        if st.button("Chercher les analogues"):
            mol = Chem.MolFromSmiles(smiles_req)
            if mol is None:
                st.error("SMILES invalide.")
            else:
                fp_cible = AllChem.GetMorganFingerprintAsBitVect(mol, 2, nBits=2048)
                base_calc = base.copy()
                base_calc['mol'] = base_calc['canonical_smiles'].apply(Chem.MolFromSmiles)
                base_calc = base_calc[base_calc['mol'].notnull()]
                base_calc['similarite'] = base_calc['mol'].apply(
                    lambda m: DataStructs.TanimotoSimilarity(
                        fp_cible, AllChem.GetMorganFingerprintAsBitVect(m, 2, nBits=2048)))
                proches = base_calc[base_calc['similarite'] < 0.999].nlargest(n, 'similarite')
                st.dataframe(
                    proches[['canonical_smiles', 'pIC50', 'activite', 'similarite']].round(3),
                    use_container_width=True
                )
                st.caption("Ces molecules connues ressemblent le plus a votre requete. "
                           "Leur activite mesuree donne une premiere intuition sur votre molecule.")


with onglet_apropos:
    st.subheader("A propos de ce POC")
    st.write(
        "Ce tableau de bord accompagne un POC de machine learning pour la decouverte de "
        "medicaments. La cible est l'EGFR, une proteine impliquee dans plusieurs cancers. "
        "Les donnees proviennent de la base publique ChEMBL. Les modeles ont ete entraines "
        "dans les notebooks numerotes du projet. Ce prototype accelere la preselection de "
        "molecules mais ne remplace en aucun cas la validation en laboratoire."
    )
    st.write("Modeles charges :")
    st.json({cle: ("disponible" if art is not None else "absent")
             for cle, art in artefacts.items()})
