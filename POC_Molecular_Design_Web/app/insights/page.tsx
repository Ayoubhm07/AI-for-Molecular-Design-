"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { BarChart } from "@/components/charts/BarChart";
import { RadarChart } from "@/components/charts/RadarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { GroupedBars } from "@/components/charts/GroupedBars";
import {
  CLASSIFICATION,
  REGRESSION,
  IMPORTANCES,
  FAMILLES,
  CLIFFS,
  STATS_GLOBALES,
} from "@/lib/insights";

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <div className="mb-10">
        <p className="mb-3 font-mono text-sm text-emerald-glow">Analytics</p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Le laboratoire en chiffres
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          Toutes les analyses du projet reunies sur un seul tableau de bord.
          Performance des modeles, familles chimiques, importance des proprietes
          et anomalies de la relation structure activite.
        </p>
      </div>

      {/* Chiffres cles */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi valeur={STATS_GLOBALES.molecules.toLocaleString("fr")} label="molecules" />
        <Kpi valeur={STATS_GLOBALES.actives.toLocaleString("fr")} label="actives" accent />
        <Kpi valeur={STATS_GLOBALES.inactives.toLocaleString("fr")} label="inactives" />
        <Kpi valeur={STATS_GLOBALES.descripteurs.toString()} label="descripteurs" />
        <Kpi valeur={STATS_GLOBALES.bitsEmpreinte.toLocaleString("fr")} label="bits empreinte" />
        <Kpi valeur={STATS_GLOBALES.familles.toString()} label="familles" />
      </div>

      {/* Repartition + Classification */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassCard>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Repartition des molecules
          </h2>
          <div className="flex justify-center py-2">
            <DonutChart
              data={[
                { label: "Actives", valeur: STATS_GLOBALES.actives, couleur: "#34d399" },
                { label: "Inactives", valeur: STATS_GLOBALES.inactives, couleur: "#475569" },
              ]}
              centre={{
                valeur: `${Math.round((STATS_GLOBALES.actives / STATS_GLOBALES.molecules) * 100)}%`,
                label: "actives",
              }}
            />
          </div>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-glow" /> Actives
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-600" /> Inactives
            </span>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2" delay={0.1}>
          <h2 className="mb-1 text-lg font-semibold text-white">
            Classification actif contre inactif
          </h2>
          <p className="mb-5 text-sm text-slate-400">
            Trois modeles compares sur trois metriques. XGBoost mene, la baseline
            logistique sert de reference honnete.
          </p>
          <GroupedBars
            categories={["Accuracy", "F1", "AUC"]}
            series={CLASSIFICATION.map((m) => ({
              nom: m.nom,
              couleur: m.couleur,
              valeurs: [m.accuracy ?? 0, m.f1 ?? 0, m.auc ?? 0],
            }))}
          />
        </GlassCard>
      </div>

      {/* Regression + Importance */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard>
          <h2 className="mb-1 text-lg font-semibold text-white">
            Regression du pIC50
          </h2>
          <p className="mb-5 text-sm text-slate-400">
            Qualite de prediction de la puissance, mesuree par le R2 (plus haut
            est meilleur).
          </p>
          <BarChart
            data={REGRESSION.map((m) => ({
              label: m.nom,
              valeur: m.r2 ?? 0,
              couleur: m.couleur,
            }))}
            max={1}
            format={(v) => `R2 ${v.toFixed(2)}`}
          />
        </GlassCard>

        <GlassCard delay={0.1}>
          <h2 className="mb-1 text-lg font-semibold text-white">
            Importance des proprietes
          </h2>
          <p className="mb-5 text-sm text-slate-400">
            Ce qui pese le plus dans la prediction d'activite, cote descripteurs
            physico-chimiques.
          </p>
          <BarChart
            data={IMPORTANCES.map((d) => ({
              label: d.descripteur,
              valeur: d.valeur,
            }))}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </GlassCard>
      </div>

      {/* Familles chimiques (clustering) */}
      <div className="mb-6">
        <h2 className="mb-1 text-xl font-semibold text-white">
          Familles chimiques decouvertes
        </h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-400">
          Le clustering regroupe les molecules par ressemblance. Chaque famille a
          son profil et son taux d'actives, ce qui indique lesquelles explorer en
          priorite.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FAMILLES.map((f, i) => (
            <GlassCard key={f.id} delay={i * 0.08}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{f.nom}</h3>
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: `${f.couleur}22`, color: f.couleur }}
                >
                  {f.taille}
                </span>
              </div>
              <div className="flex justify-center">
                <RadarChart data={f.profil} couleur={f.couleur} taille={180} />
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">pIC50 moyen</span>
                  <span className="font-mono text-slate-200">
                    {f.pIC50Moyen.toFixed(1)}
                  </span>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-400">Taux d'actives</span>
                    <span className="font-mono text-slate-200">{f.tauxActifs}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${f.tauxActifs}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ background: f.couleur }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Activity cliffs */}
      <GlassCard>
        <h2 className="mb-1 text-xl font-semibold text-white">
          Activity cliffs detectes
        </h2>
        <p className="mb-5 max-w-2xl text-sm text-slate-400">
          Des paires de molecules presque identiques mais aux puissances
          opposees. Ces cas revelent quel petit detail structurel fait toute la
          difference, et mettent nos modeles au defi.
        </p>
        <div className="space-y-3">
          {CLIFFS.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass flex flex-wrap items-center gap-4 rounded-xl p-4"
            >
              <span className="font-mono text-xs text-slate-400">{c.molA}</span>
              <span className="rounded-full bg-emerald-glow/15 px-2 py-0.5 font-mono text-xs text-emerald-glow">
                pIC50 {c.pIC50A}
              </span>
              <span className="text-slate-500">contre</span>
              <span className="font-mono text-xs text-slate-400">{c.molB}</span>
              <span className="rounded-full bg-slate-500/20 px-2 py-0.5 font-mono text-xs text-slate-300">
                pIC50 {c.pIC50B}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-slate-400">similarite</span>
                <span className="font-mono text-sm text-cyan-glow">
                  {Math.round(c.similarite * 100)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function Kpi({
  valeur,
  label,
  accent = false,
}: {
  valeur: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <div
        className={`font-mono text-2xl font-bold ${
          accent ? "text-emerald-glow" : "text-white"
        }`}
      >
        {valeur}
      </div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}
