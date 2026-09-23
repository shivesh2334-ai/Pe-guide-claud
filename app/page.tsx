'use client';

import React, { useMemo, useState } from 'react';
import { DEFAULT_INPUT } from '@/lib/defaultInput';
import { runPeAssessment } from '@/lib/engine';
import { PeAssessmentInput } from '@/lib/types';
import { AssessmentForm } from '@/components/AssessmentForm';
import { ResultsPanel } from '@/components/ResultsPanel';

export default function Home() {
  const [input, setInputRaw] = useState<PeAssessmentInput>(DEFAULT_INPUT);
  const setInput = (updater: (prev: PeAssessmentInput) => PeAssessmentInput) => setInputRaw(updater);

  const output = useMemo(() => runPeAssessment(input), [input]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">PE Assessment &amp; Treatment Copilot</h1>
        <p className="mt-1 text-sm text-slate-500">
          Deterministic clinical decision support for acute pulmonary embolism — risk stratification (PESI / sPESI, ERS-ESC,
          AHA/ACC 2026), investigations, diagnosis context, and a cause-directed treatment plan including inherited
          thrombophilia and other special populations. Encodes: Weinberg &amp; Rali, UpToDate Topic 8265 v121.0
          (literature current through Aug 2026).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <AssessmentForm input={input} setInput={setInput} />
          <button
            type="button"
            onClick={() => setInputRaw(DEFAULT_INPUT)}
            className="mb-8 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Reset to defaults
          </button>
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ResultsPanel output={output} />
        </div>
      </div>
    </main>
  );
}
