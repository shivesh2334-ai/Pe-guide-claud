'use client';

import React from 'react';
import { EngineOutput } from '@/lib/types';
import { GUIDELINE_CHUNKS } from '@/lib/guidelineKnowledgeBase';

const riskColor: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'intermediate-low': 'bg-amber-100 text-amber-800 border-amber-300',
  'intermediate-high': 'bg-orange-100 text-orange-800 border-orange-300',
  high: 'bg-red-100 text-red-800 border-red-300',
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}

export function ResultsPanel({ output }: { output: EngineOutput }) {
  const { riskStratification, investigations, diagnosisSuggestions, treatmentPlan, guidelineReferences } = output;

  return (
    <div className="space-y-5">
      <Card title="Risk stratification">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-sm font-medium ${riskColor[riskStratification.ersEscRisk]}`}>
            ERS/ESC: {riskStratification.ersEscRisk}
          </span>
          <span className="rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
            AHA/ACC category: {riskStratification.ahaAccCategory}
          </span>
          {riskStratification.respiratoryModifierPresent && (
            <span className="rounded-full border border-purple-300 bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
              + respiratory modifier
            </span>
          )}
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-xs text-slate-500">PESI points</div><div className="font-semibold">{riskStratification.pesi.pesiPoints}</div></div>
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-xs text-slate-500">PESI class</div><div className="font-semibold">{riskStratification.pesi.pesiClass}</div></div>
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-xs text-slate-500">sPESI</div><div className="font-semibold">{riskStratification.pesi.sPesiScore}</div></div>
          <div className="rounded-lg bg-slate-50 p-2"><div className="text-xs text-slate-500">Low risk (sPESI)</div><div className="font-semibold">{riskStratification.pesi.lowRiskBySPesi ? 'Yes' : 'No'}</div></div>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {riskStratification.rationale.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </Card>

      <Card title="Diagnosis / severity context">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {diagnosisSuggestions.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      </Card>

      <Card title="Recommended investigations">
        <div className="space-y-3">
          {investigations.map((inv, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-sm font-medium text-slate-800">{inv.category}</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
                {inv.items.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
              <div className="mt-1 text-xs italic text-slate-400">{inv.rationale}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Treatment plan">
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <div className="font-medium text-slate-800">Anticoagulation</div>
            <p>Indicated: <b>{treatmentPlan.anticoagulation.indicated ? 'Yes' : 'No — absolute contraindication'}</b></p>
            <ul className="list-disc space-y-0.5 pl-5">
              {treatmentPlan.anticoagulation.agentGuidance.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
            <p className="mt-1">IVC filter recommended: <b>{treatmentPlan.anticoagulation.ivcFilterRecommended ? 'Yes' : 'No'}</b></p>
            <p>Outpatient-eligible: <b>{String(treatmentPlan.anticoagulation.outpatientEligible)}</b></p>
            <p>Duration: <b>{String(treatmentPlan.anticoagulation.durationMonths)}</b>{typeof treatmentPlan.anticoagulation.durationMonths === 'number' ? ' months' : ''}</p>
            <p className="text-xs italic text-slate-400">{treatmentPlan.anticoagulation.durationRationale}</p>
          </div>

          <div>
            <div className="font-medium text-slate-800">Advanced / reperfusion therapy</div>
            <p>Thrombolysis: <b className="uppercase">{treatmentPlan.advancedTherapy.thrombolysisIndicated.replace(/_/g, ' ')}</b></p>
            <p>{treatmentPlan.advancedTherapy.embolectomyOrCdtConsideration}</p>
            <p>PERT / expert consult recommended: <b>{treatmentPlan.advancedTherapy.pertConsultRecommended ? 'Yes' : 'No'}</b></p>
            <ul className="list-disc space-y-0.5 pl-5">
              {treatmentPlan.advancedTherapy.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>

          <div>
            <div className="font-medium text-slate-800">Monitoring</div>
            <ul className="list-disc space-y-0.5 pl-5">
              {treatmentPlan.monitoring.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>

          <div>
            <div className="font-medium text-slate-800">Follow-up schedule</div>
            <ul className="list-disc space-y-0.5 pl-5">
              {treatmentPlan.followUpSchedule.map((f, i) => <li key={i}><b>{f.timepoint}</b> — {f.purpose}</li>)}
            </ul>
          </div>

          {treatmentPlan.specialPopulationNotes.length > 0 && (
            <div>
              <div className="font-medium text-slate-800">Special population notes</div>
              <ul className="list-disc space-y-0.5 pl-5">
                {treatmentPlan.specialPopulationNotes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>
      </Card>

      <Card title="Guideline references retrieved">
        <p className="mb-2 text-xs text-slate-400">
          Passages retrieved from the attached source (Weinberg &amp; Rali, &quot;Acute pulmonary embolism in adults: Treatment overview and prognosis,&quot; UpToDate Topic 8265 Version 121.0) via lexical keyword retrieval.
        </p>
        <div className="space-y-2">
          {guidelineReferences.map((ref) => {
            const chunk = GUIDELINE_CHUNKS.find((c) => c.id === ref.chunkId);
            if (!chunk) return null;
            return (
              <details key={ref.chunkId} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">{chunk.heading}</summary>
                <p className="mt-1 text-xs text-slate-600">{chunk.text}</p>
              </details>
            );
          })}
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400">
        Clinical decision support only — not a substitute for clinical judgment, institutional protocols, or expert/PERT consultation. Verify against the current guideline before acting.
      </p>
    </div>
  );
}
