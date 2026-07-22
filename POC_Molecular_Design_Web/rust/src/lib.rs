// molcore — moteur cheminformatique compile en WebAssembly brut.
//
// Objectif : calculer, dans le navigateur, des descripteurs moleculaires et une
// similarite de Tanimoto reelle a partir d'un SMILES, sans dependre de Python.
//
// Contraintes assumees :
//   - WASM brut, sans wasm-bindgen ni aucune dependance (compile avec le seul
//     linker interne rust-lld, donc aucun compilateur C requis).
//   - Le passage de chaines entre JavaScript et Rust se fait a la main via les
//     fonctions alloc et dealloc, plus un pointeur et une longueur.
//
// Honnetete scientifique : ce moteur est un modele SIMPLIFIE. Le parseur SMILES
// gere les cas courants mais n'est pas un moteur de chimie complet comme RDKit.
// L'empreinte est une empreinte circulaire de rayon 1 (esprit ECFP) calculee sur
// les environnements d'atomes, pas l'ECFP officiel. Les descripteurs (logP en
// particulier) sont des approximations par contribution. C'est suffisant et
// coherent pour une demonstration, pas pour une decision reglementaire.

// ----------------------------------------------------------------------------
// Table des elements
// ----------------------------------------------------------------------------
// Identifiants internes des elements que l'on sait reconnaitre.
const EL_C: u8 = 0;
const EL_N: u8 = 1;
const EL_O: u8 = 2;
const EL_S: u8 = 3;
const EL_P: u8 = 4;
const EL_F: u8 = 5;
const EL_CL: u8 = 6;
const EL_BR: u8 = 7;
const EL_I: u8 = 8;
const EL_B: u8 = 9;
const EL_AUTRE: u8 = 10;

fn masse_atomique(el: u8) -> f64 {
    match el {
        EL_C => 12.011,
        EL_N => 14.007,
        EL_O => 15.999,
        EL_S => 32.06,
        EL_P => 30.974,
        EL_F => 18.998,
        EL_CL => 35.45,
        EL_BR => 79.904,
        EL_I => 126.904,
        EL_B => 10.811,
        _ => 12.0,
    }
}

fn valence_defaut(el: u8) -> i32 {
    match el {
        EL_C => 4,
        EL_N => 3,
        EL_O => 2,
        EL_S => 2,
        EL_P => 3,
        EL_F => 1,
        EL_CL => 1,
        EL_BR => 1,
        EL_I => 1,
        EL_B => 3,
        _ => 4,
    }
}

// Contribution logP par atome, approximation grossiere inspiree de Crippen.
fn logp_contrib(el: u8, aromatique: bool) -> f64 {
    match el {
        EL_C => {
            if aromatique {
                0.29
            } else {
                0.20
            }
        }
        EL_N => -0.55,
        EL_O => -0.40,
        EL_S => 0.10,
        EL_P => -0.20,
        EL_F => 0.14,
        EL_CL => 0.64,
        EL_BR => 0.84,
        EL_I => 1.00,
        EL_B => 0.0,
        _ => 0.0,
    }
}

// ----------------------------------------------------------------------------
// Modele moleculaire issu du parsing
// ----------------------------------------------------------------------------
struct Atome {
    element: u8,
    aromatique: bool,
    bracket: bool,
    h_explicite: i32,        // -1 si inconnu (atome hors crochets)
    ordre_liaisons: f32,     // somme des ordres de liaison vers atomes lourds
    voisins: alloc::vec::Vec<usize>,
}

struct Molecule {
    atomes: alloc::vec::Vec<Atome>,
    anneaux_aromatiques: u32,
}

// On utilise l'allocateur de la std pour Vec, mais on evite tout le reste.
extern crate alloc;
use alloc::vec::Vec;

// ----------------------------------------------------------------------------
// Lecture d'un element
// ----------------------------------------------------------------------------
// Retourne (element, aromatique, nombre d'octets consommes) pour le sous-ensemble
// organique hors crochets.
fn lire_organique(b: &[u8], i: usize) -> (u8, bool, usize) {
    match b[i] {
        b'C' => {
            if i + 1 < b.len() && b[i + 1] == b'l' {
                (EL_CL, false, 2)
            } else {
                (EL_C, false, 1)
            }
        }
        b'B' => {
            if i + 1 < b.len() && b[i + 1] == b'r' {
                (EL_BR, false, 2)
            } else {
                (EL_B, false, 1)
            }
        }
        b'N' => (EL_N, false, 1),
        b'O' => (EL_O, false, 1),
        b'S' => (EL_S, false, 1),
        b'P' => (EL_P, false, 1),
        b'F' => (EL_F, false, 1),
        b'I' => (EL_I, false, 1),
        b'c' => (EL_C, true, 1),
        b'n' => (EL_N, true, 1),
        b'o' => (EL_O, true, 1),
        b's' => (EL_S, true, 1),
        b'p' => (EL_P, true, 1),
        b'b' => (EL_B, true, 1),
        _ => (EL_AUTRE, false, 0),
    }
}

// Lit l'element au debut d'un atome entre crochets.
fn lire_element_bracket(b: &[u8], i: usize) -> (u8, bool, usize) {
    if i >= b.len() {
        return (EL_AUTRE, false, 0);
    }
    let c = b[i];
    if c.is_ascii_uppercase() {
        // deux lettres connues
        if c == b'C' && i + 1 < b.len() && b[i + 1] == b'l' {
            return (EL_CL, false, 2);
        }
        if c == b'B' && i + 1 < b.len() && b[i + 1] == b'r' {
            return (EL_BR, false, 2);
        }
        let el = match c {
            b'C' => EL_C,
            b'N' => EL_N,
            b'O' => EL_O,
            b'S' => EL_S,
            b'P' => EL_P,
            b'F' => EL_F,
            b'I' => EL_I,
            b'B' => EL_B,
            _ => EL_AUTRE,
        };
        // consommer une eventuelle seconde lettre minuscule (ex Se) sans la mapper
        let adv = if i + 1 < b.len() && b[i + 1].is_ascii_lowercase() {
            2
        } else {
            1
        };
        (el, false, adv)
    } else if c.is_ascii_lowercase() {
        let el = match c {
            b'c' => EL_C,
            b'n' => EL_N,
            b'o' => EL_O,
            b's' => EL_S,
            b'p' => EL_P,
            b'b' => EL_B,
            _ => EL_AUTRE,
        };
        (el, true, 1)
    } else {
        (EL_AUTRE, false, 0)
    }
}

// ----------------------------------------------------------------------------
// Parseur SMILES
// ----------------------------------------------------------------------------
fn parser(smiles: &str) -> Molecule {
    let b = smiles.as_bytes();
    let mut atomes: Vec<Atome> = Vec::new();
    let mut prev: Option<usize> = None;
    let mut pending: f32 = 1.0;
    let mut has_pending = false;
    let mut branch: Vec<usize> = Vec::new();
    // Fermetures de cycle en attente, indexees par numero (0 a 99).
    let mut rings: [Option<(usize, f32)>; 100] = [None; 100];
    let mut anneaux_aromatiques: u32 = 0;

    let mut i = 0usize;
    while i < b.len() {
        let c = b[i];
        match c {
            b'(' => {
                if let Some(p) = prev {
                    branch.push(p);
                }
                i += 1;
            }
            b')' => {
                if let Some(p) = branch.pop() {
                    prev = Some(p);
                }
                i += 1;
            }
            b'-' => {
                pending = 1.0;
                has_pending = true;
                i += 1;
            }
            b'=' => {
                pending = 2.0;
                has_pending = true;
                i += 1;
            }
            b'#' => {
                pending = 3.0;
                has_pending = true;
                i += 1;
            }
            b':' => {
                pending = 1.5;
                has_pending = true;
                i += 1;
            }
            b'/' | b'\\' => {
                i += 1;
            }
            b'.' => {
                prev = None;
                i += 1;
            }
            b'%' => {
                // fermeture de cycle a deux chiffres
                if i + 2 < b.len() && b[i + 1].is_ascii_digit() && b[i + 2].is_ascii_digit() {
                    let n = ((b[i + 1] - b'0') * 10 + (b[i + 2] - b'0')) as usize;
                    fermeture_cycle(
                        &mut atomes,
                        &mut rings,
                        &mut anneaux_aromatiques,
                        prev,
                        n,
                        pending,
                        has_pending,
                    );
                    pending = 1.0;
                    has_pending = false;
                    i += 3;
                } else {
                    i += 1;
                }
            }
            b'0'..=b'9' => {
                let n = (c - b'0') as usize;
                fermeture_cycle(
                    &mut atomes,
                    &mut rings,
                    &mut anneaux_aromatiques,
                    prev,
                    n,
                    pending,
                    has_pending,
                );
                pending = 1.0;
                has_pending = false;
                i += 1;
            }
            b'[' => {
                // atome entre crochets
                let mut k = i + 1;
                while k < b.len() && b[k].is_ascii_digit() {
                    k += 1; // isotope ignore
                }
                let (el, aro, adv) = lire_element_bracket(b, k);
                k += adv;
                let mut eh: i32 = 0;
                while k < b.len() && b[k] != b']' {
                    if b[k] == b'H' {
                        k += 1;
                        let mut num = 1;
                        if k < b.len() && b[k].is_ascii_digit() {
                            num = (b[k] - b'0') as i32;
                            k += 1;
                        }
                        eh = num;
                    } else {
                        k += 1;
                    }
                }
                let idx = creer_atome(&mut atomes, el, aro, true, eh);
                connecter(&mut atomes, prev, idx, pending, has_pending);
                prev = Some(idx);
                pending = 1.0;
                has_pending = false;
                i = if k < b.len() { k + 1 } else { k };
            }
            _ => {
                let (el, aro, adv) = lire_organique(b, i);
                if adv == 0 {
                    i += 1;
                    continue;
                }
                let idx = creer_atome(&mut atomes, el, aro, false, -1);
                connecter(&mut atomes, prev, idx, pending, has_pending);
                prev = Some(idx);
                pending = 1.0;
                has_pending = false;
                i += adv;
            }
        }
    }

    Molecule {
        atomes,
        anneaux_aromatiques,
    }
}

fn creer_atome(atomes: &mut Vec<Atome>, el: u8, aro: bool, bracket: bool, eh: i32) -> usize {
    atomes.push(Atome {
        element: el,
        aromatique: aro,
        bracket,
        h_explicite: eh,
        ordre_liaisons: 0.0,
        voisins: Vec::new(),
    });
    atomes.len() - 1
}

fn connecter(atomes: &mut Vec<Atome>, prev: Option<usize>, cur: usize, pending: f32, has_pending: bool) {
    if let Some(p) = prev {
        let ordre = if has_pending {
            pending
        } else if atomes[p].aromatique && atomes[cur].aromatique {
            1.5
        } else {
            1.0
        };
        ajouter_liaison(atomes, p, cur, ordre);
    }
}

fn ajouter_liaison(atomes: &mut Vec<Atome>, a: usize, b: usize, ordre: f32) {
    atomes[a].ordre_liaisons += ordre;
    atomes[b].ordre_liaisons += ordre;
    atomes[a].voisins.push(b);
    atomes[b].voisins.push(a);
}

fn fermeture_cycle(
    atomes: &mut Vec<Atome>,
    rings: &mut [Option<(usize, f32)>; 100],
    anneaux_aromatiques: &mut u32,
    prev: Option<usize>,
    n: usize,
    pending: f32,
    has_pending: bool,
) {
    let cur = match prev {
        Some(p) => p,
        None => return,
    };
    if let Some((autre, ordre_ouvert)) = rings[n].take() {
        let ordre = if has_pending {
            pending
        } else if atomes[cur].aromatique && atomes[autre].aromatique {
            1.5
        } else {
            ordre_ouvert
        };
        ajouter_liaison(atomes, cur, autre, ordre);
        if atomes[cur].aromatique && atomes[autre].aromatique {
            *anneaux_aromatiques += 1;
        }
    } else {
        let ordre = if has_pending { pending } else { 1.0 };
        rings[n] = Some((cur, ordre));
    }
}

// ----------------------------------------------------------------------------
// Descripteurs
// ----------------------------------------------------------------------------
struct Descripteurs {
    poids: f64,
    logp: f64,
    donneurs_h: f64,
    accepteurs_h: f64,
    atomes_lourds: f64,
    anneaux_aromatiques: f64,
}

fn hydrogenes_de(a: &Atome) -> f64 {
    if a.bracket {
        a.h_explicite.max(0) as f64
    } else {
        let val = valence_defaut(a.element);
        let utilises = a.ordre_liaisons.round() as i32;
        (val - utilises).max(0) as f64
    }
}

fn calculer_descripteurs(smiles: &str) -> Descripteurs {
    let mol = parser(smiles);
    let mut poids = 0.0;
    let mut logp = 0.0;
    let mut donneurs = 0.0;
    let mut accepteurs = 0.0;

    for a in &mol.atomes {
        let h = hydrogenes_de(a);
        poids += masse_atomique(a.element) + h * 1.008;
        logp += logp_contrib(a.element, a.aromatique);
        if a.element == EL_N || a.element == EL_O {
            accepteurs += 1.0;
            if h > 0.0 {
                donneurs += h;
            }
        }
    }

    Descripteurs {
        poids,
        logp,
        donneurs_h: donneurs,
        accepteurs_h: accepteurs,
        atomes_lourds: mol.atomes.len() as f64,
        anneaux_aromatiques: mol.anneaux_aromatiques as f64,
    }
}

// ----------------------------------------------------------------------------
// Empreinte circulaire de rayon 1 (esprit ECFP)
// ----------------------------------------------------------------------------
const NBITS: usize = 512;
const NBYTES: usize = NBITS / 8;

fn fnv1a(bytes: &[u8]) -> u32 {
    let mut h: u32 = 2166136261;
    for &x in bytes {
        h ^= x as u32;
        h = h.wrapping_mul(16777619);
    }
    h
}

fn set_bit(bits: &mut [u8; NBYTES], h: u32) {
    let pos = (h as usize) % NBITS;
    bits[pos / 8] |= 1u8 << (pos % 8);
}

fn calculer_empreinte(smiles: &str) -> [u8; NBYTES] {
    let mol = parser(smiles);
    let mut bits = [0u8; NBYTES];

    for a in &mol.atomes {
        // rayon 0 : l'atome lui-meme (element, aromaticite, degre, ordre)
        let f0 = fnv1a(&[
            a.element,
            a.aromatique as u8,
            a.voisins.len() as u8,
            a.ordre_liaisons.round() as u8,
        ]);
        set_bit(&mut bits, f0);

        // rayon 1 : l'atome plus ses voisins (element + aromaticite), tries
        let mut nb: Vec<u16> = a
            .voisins
            .iter()
            .map(|&n| ((mol.atomes[n].element as u16) << 1) | (mol.atomes[n].aromatique as u16))
            .collect();
        nb.sort_unstable();

        let mut buf: Vec<u8> = Vec::new();
        buf.push(a.element);
        buf.push(a.aromatique as u8);
        for x in nb {
            buf.push((x >> 8) as u8);
            buf.push((x & 0xff) as u8);
        }
        let f1 = fnv1a(&buf);
        set_bit(&mut bits, f1);
    }

    bits
}

// ----------------------------------------------------------------------------
// Interface WebAssembly (FFI brut, sans wasm-bindgen)
// ----------------------------------------------------------------------------
use alloc::boxed::Box;

// Alloue un bloc memoire de len octets et rend son pointeur. Le cote JavaScript
// y ecrit les octets UTF-8 du SMILES avant d'appeler les fonctions de calcul.
#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let v = alloc::vec![0u8; len];
    let boxed = v.into_boxed_slice();
    Box::into_raw(boxed) as *mut u8
}

// Libere un bloc alloue par alloc.
#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    let slice = core::slice::from_raw_parts_mut(ptr, len);
    drop(Box::from_raw(slice as *mut [u8]));
}

// Taille en octets d'une empreinte, pour que JavaScript sache dimensionner ses buffers.
#[no_mangle]
pub extern "C" fn fp_bytes() -> usize {
    NBYTES
}

// Calcule l'empreinte du SMILES a (ptr, len) et l'ecrit dans out (NBYTES octets).
#[no_mangle]
pub unsafe extern "C" fn fingerprint(ptr: *const u8, len: usize, out: *mut u8) {
    let s = core::slice::from_raw_parts(ptr, len);
    let smiles = core::str::from_utf8(s).unwrap_or("");
    let bits = calculer_empreinte(smiles);
    for i in 0..NBYTES {
        *out.add(i) = bits[i];
    }
}

// Similarite de Tanimoto entre deux empreintes de nbytes octets, par popcount.
#[no_mangle]
pub unsafe extern "C" fn tanimoto(a: *const u8, b: *const u8, nbytes: usize) -> f64 {
    let mut inter: u32 = 0;
    let mut uni: u32 = 0;
    for i in 0..nbytes {
        let x = *a.add(i);
        let y = *b.add(i);
        inter += (x & y).count_ones();
        uni += (x | y).count_ones();
    }
    if uni == 0 {
        0.0
    } else {
        inter as f64 / uni as f64
    }
}

// Similarite de Tanimoto d'une empreinte requete contre un lot de count
// empreintes stockees de facon contigue dans db (chacune de nbytes octets).
// Ecrit les count resultats dans out. Une seule traversee de frontiere pour
// tout un catalogue : c'est le mode d'emploi reel d'une recherche par similarite,
// et c'est la que Rust prend l'avantage sur JavaScript.
#[no_mangle]
pub unsafe extern "C" fn tanimoto_batch(
    query: *const u8,
    db: *const u8,
    count: usize,
    nbytes: usize,
    out: *mut f64,
) {
    for j in 0..count {
        let base = db.add(j * nbytes);
        let mut inter: u32 = 0;
        let mut uni: u32 = 0;
        for i in 0..nbytes {
            let x = *query.add(i);
            let y = *base.add(i);
            inter += (x & y).count_ones();
            uni += (x | y).count_ones();
        }
        *out.add(j) = if uni == 0 {
            0.0
        } else {
            inter as f64 / uni as f64
        };
    }
}

// Criblage virtuel : score chaque molecule d'une chimiotheque contre une
// molecule requete, en une seule passe. Pour chaque molecule j, le score
// combine trois signaux : la similarite de Tanimoto avec la requete, la
// puissance connue normalisee (pic50_norm), et la conformite de Lipinski.
// Ecrit dans out, de facon entrelacee, deux valeurs par molecule : [score, sim].
//
// C'est le coeur du criblage : tout le travail lourd sur la chimiotheque entiere
// se fait ici en Rust, une seule traversee de frontiere depuis JavaScript.
#[no_mangle]
pub unsafe extern "C" fn screen(
    query: *const u8,
    db: *const u8,
    count: usize,
    nbytes: usize,
    pic50_norm: *const f32,
    lipinski: *const u8,
    w_sim: f32,
    w_pot: f32,
    w_lip: f32,
    out: *mut f64,
) {
    for j in 0..count {
        let base = db.add(j * nbytes);
        let mut inter: u32 = 0;
        let mut uni: u32 = 0;
        for i in 0..nbytes {
            let x = *query.add(i);
            let y = *base.add(i);
            inter += (x & y).count_ones();
            uni += (x | y).count_ones();
        }
        let sim = if uni == 0 {
            0.0
        } else {
            inter as f32 / uni as f32
        };
        let pot = *pic50_norm.add(j);
        let lip = *lipinski.add(j) as f32;
        let score = w_sim * sim + w_pot * pot + w_lip * lip;
        *out.add(j * 2) = score as f64;
        *out.add(j * 2 + 1) = sim as f64;
    }
}

// Calcule les 6 descripteurs du SMILES a (ptr, len) et les ecrit dans out :
// [poids, logP, donneurs H, accepteurs H, atomes lourds, anneaux aromatiques].
#[no_mangle]
pub unsafe extern "C" fn descriptors(ptr: *const u8, len: usize, out: *mut f64) {
    let s = core::slice::from_raw_parts(ptr, len);
    let smiles = core::str::from_utf8(s).unwrap_or("");
    let d = calculer_descripteurs(smiles);
    *out.add(0) = d.poids;
    *out.add(1) = d.logp;
    *out.add(2) = d.donneurs_h;
    *out.add(3) = d.accepteurs_h;
    *out.add(4) = d.atomes_lourds;
    *out.add(5) = d.anneaux_aromatiques;
}

// ----------------------------------------------------------------------------
// Tests (compilent pour l'hote ; necessitent un linker hote, absent sur la
// machine actuelle. La verification reelle se fait via molcore.wasm dans Node,
// voir scripts/verify_wasm.mjs).
// ----------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn benzene() {
        let d = calculer_descripteurs("c1ccccc1");
        assert_eq!(d.atomes_lourds as i32, 6);
        assert_eq!(d.anneaux_aromatiques as i32, 1);
        // 6 carbones aromatiques, poids proche de 78
        assert!((d.poids - 78.11).abs() < 2.0);
    }

    #[test]
    fn ethanol() {
        let d = calculer_descripteurs("CCO");
        assert_eq!(d.atomes_lourds as i32, 3);
        assert_eq!(d.accepteurs_h as i32, 1);
        assert!(d.donneurs_h >= 1.0);
        // poids proche de 46
        assert!((d.poids - 46.07).abs() < 2.0);
    }

    #[test]
    fn tanimoto_identique() {
        let a = calculer_empreinte("CCO");
        let inter_union = {
            let mut inter = 0u32;
            let mut uni = 0u32;
            for i in 0..NBYTES {
                inter += (a[i] & a[i]).count_ones();
                uni += (a[i] | a[i]).count_ones();
            }
            inter as f64 / uni as f64
        };
        assert!((inter_union - 1.0).abs() < 1e-9);
    }
}
