# AI for Molecular Design

Proof of Concept de machine learning pour la decouverte de medicaments, applique a l'inhibition de la proteine EGFR.

## Le contexte biologique

L'EGFR, le recepteur du facteur de croissance epidermique, est une proteine dont l'hyperactivite est impliquee dans plusieurs cancers, notamment le cancer du poumon non a petites cellules. Inhiber cette proteine est une strategie therapeutique majeure, et des milliers de molecules ont deja ete testees contre elle. La difficulte est que cribler des molecules en laboratoire coute cher et prend du temps. Ce projet construit une chaine d'outils de machine learning qui accelere la preselection des molecules candidates, en laissant au laboratoire uniquement les plus prometteuses.

Toutes les analyses partagent le meme jeu de donnees, les mesures d'activite IC50 de la cible CHEMBL203 dans la base publique ChEMBL, et le meme fil rouge metier, aider le chercheur a decider quelle molecule tester.

## Les donnees

Les donnees proviennent de ChEMBL, recuperees automatiquement via le package officiel gratuit chembl_webresource_client, sans cle API. Le notebook 1 s'en charge et sauvegarde un jeu de donnees propre que tous les autres notebooks rechargent. Si le reseau bloque le package, un mode de secours permet de charger un CSV exporte manuellement depuis le site ChEMBL.

## Les 8 pipelines

| Notebook | Tache | Question du chercheur |
|----------|-------|------------------------|
| 01_Acquisition_Preparation_Donnees | Collecte et nettoyage | Comment transformer des mesures brutes en donnees exploitables ? |
| 02_Extraction_Descripteurs | Descripteurs RDKit et empreintes | Comment donner une molecule a lire a un modele ? |
| 03_Analyse_Exploratoire | EDA et espace chimique | Qu'est-ce qui distingue une molecule active ? |
| 04_Classification_Actif_Inactif | Classification | Cette molecule sera-t-elle active sur l'EGFR ? |
| 05_Regression_pIC50 | Regression | Quelle sera sa puissance exacte ? |
| 06_Clustering_Familles_Chimiques | Clustering | Quelles familles chimiques explorer en priorite ? |
| 07_Reduction_Dimension_Espace_Chimique | PCA et t-SNE | Ou sont les molecules actives sur la carte chimique ? |
| 08_Bonus_Recommandation_Anomalies | Recommandation, scaffolds, activity cliffs | Quelle molecule ressemble a la mienne, et pourquoi ce petit changement change tout ? |

Chaque notebook suit la meme structure de pipeline : comprehension du besoin, chargement, traitement, modelisation baseline puis avancee, evaluation, interpretation orientee metier, deploiement joblib, conclusion avec limites assumees.

## La demonstration

Le fichier app.py est un tableau de bord Streamlit qui met en scene les modeles. L'utilisateur saisit une molecule au format SMILES et obtient sa prediction d'activite, sa puissance estimee et ses analogues connus.

### Lancer la demo

Installer les dependances :

```
pip install -r requirements.txt
```

Executer au minimum les notebooks 1, 2 et 4 pour generer les fichiers de donnees et le modele de classification, placer les fichiers produits (les .pkl et les .csv) a cote de app.py, puis lancer :

```
streamlit run app.py
```

Le tableau de bord s'ouvre dans le navigateur.

## Ordre d'execution recommande

Le notebook 1 doit etre execute en premier car il produit le jeu de donnees propre. Le notebook 2 produit les descripteurs et empreintes utilises par tous les suivants. Ensuite les notebooks 3 a 8 peuvent s'executer dans l'ordre. Sur Google Colab, penser a installer rdkit et chembl_webresource_client en tete de chaque notebook, les lignes d'installation sont deja presentes en commentaire.

## Choix techniques et conformite

Tous les modeles sont entraines localement avec scikit-learn, XGBoost et RDKit. Aucune API d'intelligence artificielle externe n'est utilisee, le projet respecte donc pleinement la contrainte du cahier des charges. Les experiences utilisent random_state 42 pour la reproductibilite, chaque modele avance est compare a une baseline simple, et les metriques sont presentees avec leurs limites.

## Limites assumees et travaux futurs

Les valeurs IC50 de ChEMBL portent une incertitude experimentale qui borne la precision atteignable. Un modele entraine sur l'EGFR ne dit rien de l'activite sur une autre cible, ni de la toxicite. Le POC est un filtre de premiere intention, pas un verdict. L'extension naturelle serait l'integration d'un modele generatif de molecules, evoquee dans le cahier des charges initial sous la forme de GraphVAE, MolGAN ou Transformer sur SMILES, une piste laissee volontairement hors du perimetre de ce prototype.
