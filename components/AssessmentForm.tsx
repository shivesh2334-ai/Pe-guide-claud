'use client';

import React from 'react';
import { PeAssessmentInput } from '@/lib/types';
import { Section, NumberField, CheckField, SelectField } from './FormFields';

export function AssessmentForm({
  input, setInput,
}: { input: PeAssessmentInput; setInput: (updater: (prev: PeAssessmentInput) => PeAssessmentInput) => void }) {
  const p = input.pesi;
  const h = input.hemodynamics;
  const r = input.respiratoryModifiers;
  const rv = input.rvAndBiomarkers;
  const br = input.bleedingRisk;
  const oe = input.outpatientEligibility;
  const sp = input.specialPopulations;

  return (
    <div>
      <Section title="1. Clinical findings (PESI variables)" subtitle="Used to compute PESI / simplified PESI">
        <NumberField label="Age" unit="years" value={p.ageYears} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, ageYears: v } }))} min={0} max={120} />
        <CheckField label="Male sex" checked={p.male} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, male: v } }))} />
        <CheckField label="History of cancer" checked={p.cancer} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, cancer: v } }))} />
        <CheckField label="History of heart failure" checked={p.heartFailure} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, heartFailure: v } }))} />
        <CheckField label="Chronic lung disease" checked={p.chronicLungDisease} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, chronicLungDisease: v } }))} />
        <NumberField label="Heart rate" unit="bpm" value={p.heartRateBpm} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, heartRateBpm: v } }))} min={0} max={300} />
        <NumberField label="Systolic BP" unit="mmHg" value={p.systolicBpMmHg} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, systolicBpMmHg: v } }))} min={0} max={300} />
        <NumberField label="Respiratory rate" unit="/min" value={p.respiratoryRatePerMin} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, respiratoryRatePerMin: v } }))} min={0} max={80} />
        <NumberField label="Temperature" unit="°C" value={p.temperatureC} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, temperatureC: v } }))} min={30} max={43} step={0.1} />
        <NumberField label="SpO2" unit="%" value={p.spo2Percent} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, spo2Percent: v } }))} min={0} max={100} />
        <CheckField label="Altered mental status" checked={p.alteredMentalStatus} onChange={(v) => setInput((s) => ({ ...s, pesi: { ...s.pesi, alteredMentalStatus: v } }))} />
      </Section>

      <Section title="2. Hemodynamic status" subtitle="Any of these define high-risk (unstable) PE">
        <CheckField label="Cardiac arrest attributable to PE" checked={h.cardiacArrest} onChange={(v) => setInput((s) => ({ ...s, hemodynamics: { ...s.hemodynamics, cardiacArrest: v } }))} />
        <CheckField label="Persistent hypotension" hint="SBP<90 or drop ≥40 mmHg for >15 min, unexplained by other cause" checked={h.persistentHypotension} onChange={(v) => setInput((s) => ({ ...s, hemodynamics: { ...s.hemodynamics, persistentHypotension: v } }))} />
        <CheckField label="Transient hypotension" checked={h.transientHypotension} onChange={(v) => setInput((s) => ({ ...s, hemodynamics: { ...s.hemodynamics, transientHypotension: v } }))} />
        <CheckField label="Normotensive shock signs" hint="Hypoperfusion (mental status, urine output) despite near-normal BP" checked={h.normotensiveShockSigns} onChange={(v) => setInput((s) => ({ ...s, hemodynamics: { ...s.hemodynamics, normotensiveShockSigns: v } }))} />
        <CheckField label="Requires vasopressor/inotrope support" checked={h.vasopressorOrInotropeRequired} onChange={(v) => setInput((s) => ({ ...s, hemodynamics: { ...s.hemodynamics, vasopressorOrInotropeRequired: v } }))} />
      </Section>

      <Section title="3. Respiratory modifier" subtitle="AHA/ACC respiratory modifier criteria">
        <CheckField label="SpO2 < 90%" checked={r.spo2Below90} onChange={(v) => setInput((s) => ({ ...s, respiratoryModifiers: { ...s.respiratoryModifiers, spo2Below90: v } }))} />
        <CheckField label="Respiratory rate ≥ 30/min" checked={r.respRateAtOrAbove30} onChange={(v) => setInput((s) => ({ ...s, respiratoryModifiers: { ...s.respiratoryModifiers, respRateAtOrAbove30: v } }))} />
        <CheckField label="Supplemental O2 > 6 L/min required" checked={r.supplementalO2Above6L} onChange={(v) => setInput((s) => ({ ...s, respiratoryModifiers: { ...s.respiratoryModifiers, supplementalO2Above6L: v } }))} />
        <CheckField label="Nonrebreather mask / NIV required" checked={r.nonrebreatherOrNIV} onChange={(v) => setInput((s) => ({ ...s, respiratoryModifiers: { ...s.respiratoryModifiers, nonrebreatherOrNIV: v } }))} />
        <CheckField label="Hypoxemic or ventilatory failure" checked={r.hypoxemicOrVentilatoryFailure} onChange={(v) => setInput((s) => ({ ...s, respiratoryModifiers: { ...s.respiratoryModifiers, hypoxemicOrVentilatoryFailure: v } }))} />
      </Section>

      <Section title="4. RV function, biomarkers & clot burden" subtitle="Investigation results">
        <SelectField label="RV function on imaging (echo/CT)" value={rv.rvDysfunctionOnImaging}
          onChange={(v) => setInput((s) => ({ ...s, rvAndBiomarkers: { ...s.rvAndBiomarkers, rvDysfunctionOnImaging: v } }))}
          options={[{ value: 'not_done', label: 'Not yet done' }, { value: 'normal', label: 'Normal' }, { value: 'abnormal', label: 'Abnormal (dysfunction)' }]} />
        <SelectField label="Cardiac troponin" value={rv.troponinElevated}
          onChange={(v) => setInput((s) => ({ ...s, rvAndBiomarkers: { ...s.rvAndBiomarkers, troponinElevated: v } }))}
          options={[{ value: 'not_done', label: 'Not yet done' }, { value: 'normal', label: 'Normal' }, { value: 'elevated', label: 'Elevated' }]} />
        <SelectField label="BNP / NT-proBNP" value={rv.bnpOrNtProBnpElevated}
          onChange={(v) => setInput((s) => ({ ...s, rvAndBiomarkers: { ...s.rvAndBiomarkers, bnpOrNtProBnpElevated: v } }))}
          options={[{ value: 'not_done', label: 'Not yet done' }, { value: 'normal', label: 'Normal' }, { value: 'elevated', label: 'Elevated' }]} />
        <CheckField label="Right heart (mobile) thrombus" checked={rv.rightHeartThrombus} onChange={(v) => setInput((s) => ({ ...s, rvAndBiomarkers: { ...s.rvAndBiomarkers, rightHeartThrombus: v } }))} />
        <CheckField label="Concomitant DVT confirmed" checked={rv.concomitantDvt} onChange={(v) => setInput((s) => ({ ...s, rvAndBiomarkers: { ...s.rvAndBiomarkers, concomitantDvt: v } }))} />
        <CheckField label="Subsegmental clot only" checked={rv.subsegmentalOnly} onChange={(v) => setInput((s) => ({ ...s, rvAndBiomarkers: { ...s.rvAndBiomarkers, subsegmentalOnly: v } }))} />
        {rv.subsegmentalOnly && (
          <CheckField label="Single small defect, no other thrombus" checked={rv.singleSmallDefectNoOtherThrombus} onChange={(v) => setInput((s) => ({ ...s, rvAndBiomarkers: { ...s.rvAndBiomarkers, singleSmallDefectNoOtherThrombus: v } }))} />
        )}
      </Section>

      <Section title="5. Bleeding risk">
        <CheckField label="Absolute contraindication to anticoagulation" hint="Recent surgery, hemorrhagic stroke, active bleeding, aortic dissection, CNS tumor" checked={br.absoluteContraindication} onChange={(v) => setInput((s) => ({ ...s, bleedingRisk: { ...s.bleedingRisk, absoluteContraindication: v } }))} />
        <CheckField label="High bleeding risk (no absolute contraindication)" checked={br.highBleedingRisk} onChange={(v) => setInput((s) => ({ ...s, bleedingRisk: { ...s.bleedingRisk, highBleedingRisk: v } }))} />
      </Section>

      <Section title="6. Outpatient-eligibility screen" subtitle="Only applied when overall risk is low">
        <CheckField label="Requires supplemental O2" checked={oe.requiresSupplementalO2} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, requiresSupplementalO2: v } }))} />
        <CheckField label="Requires narcotics for pain" checked={oe.requiresNarcoticsForPain} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, requiresNarcoticsForPain: v } }))} />
        <CheckField label="Respiratory distress" checked={oe.respiratoryDistress} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, respiratoryDistress: v } }))} />
        <CheckField label="Abnormal pulse or BP" checked={oe.abnormalPulseOrBp} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, abnormalPulseOrBp: v } }))} />
        <CheckField label="Recent bleeding / bleeding risk factors" checked={oe.recentBleedingOrRiskFactors} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, recentBleedingOrRiskFactors: v } }))} />
        <CheckField label="Serious comorbidity" hint="IHD, chronic lung disease, liver/kidney failure, thrombocytopenia, cancer" checked={oe.seriousComorbidity} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, seriousComorbidity: v } }))} />
        <CheckField label="Poor mental status / home support" checked={oe.poorMentalStatusOrSupport} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, poorMentalStatusOrSupport: v } }))} />
        <CheckField label="Needle-averse with no LMWH access plan" checked={oe.needleAverseNoLmwhAccess} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, needleAverseNoLmwhAccess: v } }))} />
        <CheckField label="No ready access to DOACs" checked={oe.noAccessToDoacs} onChange={(v) => setInput((s) => ({ ...s, outpatientEligibility: { ...s.outpatientEligibility, noAccessToDoacs: v } }))} />
      </Section>

      <Section title="7. Special populations & cause of PE" subtitle="Drives duration-of-anticoagulation and agent-selection logic, including inherited thrombophilia">
        <CheckField label="Pregnant / postpartum" checked={sp.pregnant} onChange={(v) => setInput((s) => ({ ...s, specialPopulations: { ...s.specialPopulations, pregnant: v } }))} />
        <CheckField label="Active malignancy" checked={sp.activeMalignancy} onChange={(v) => setInput((s) => ({ ...s, specialPopulations: { ...s.specialPopulations, activeMalignancy: v } }))} />
        <CheckField label="Suspected/confirmed HIT" checked={sp.suspectedOrConfirmedHit} onChange={(v) => setInput((s) => ({ ...s, specialPopulations: { ...s.specialPopulations, suspectedOrConfirmedHit: v } }))} />
        <CheckField label="Antiphospholipid syndrome" checked={sp.antiphospholipidSyndrome} onChange={(v) => setInput((s) => ({ ...s, specialPopulations: { ...s.specialPopulations, antiphospholipidSyndrome: v } }))} />
        <CheckField label="Unprovoked PE" checked={sp.unprovoked} onChange={(v) => setInput((s) => ({ ...s, specialPopulations: { ...s.specialPopulations, unprovoked: v } }))} />
        <CheckField label="Recurrence on therapeutic anticoagulation" checked={sp.recurrentOnTherapeuticAnticoagulation} onChange={(v) => setInput((s) => ({ ...s, specialPopulations: { ...s.specialPopulations, recurrentOnTherapeuticAnticoagulation: v } }))} />
        <CheckField label="Inherited thrombophilia suspected" checked={sp.inheritedThrombophiliaSuspected} onChange={(v) => setInput((s) => ({ ...s, specialPopulations: { ...s.specialPopulations, inheritedThrombophiliaSuspected: v } }))} />
        {sp.inheritedThrombophiliaSuspected && (
          <SelectField label="Thrombophilia type (if known)" value={sp.inheritedThrombophiliaKnownType ?? 'unspecified'}
            onChange={(v) => setInput((s) => ({ ...s, specialPopulations: { ...s.specialPopulations, inheritedThrombophiliaKnownType: v } }))}
            options={[
              { value: 'unspecified', label: 'Not yet confirmed — panel pending' },
              { value: 'factor_v_leiden', label: 'Factor V Leiden' },
              { value: 'prothrombin_g20210a', label: 'Prothrombin G20210A' },
              { value: 'protein_s_deficiency', label: 'Protein S deficiency' },
              { value: 'protein_c_deficiency', label: 'Protein C deficiency' },
              { value: 'antithrombin_deficiency', label: 'Antithrombin deficiency' },
              { value: 'none', label: 'None / not applicable' },
            ]} />
        )}
      </Section>
    </div>
  );
}
