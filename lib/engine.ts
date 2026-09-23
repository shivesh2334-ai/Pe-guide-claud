import {
  PeAssessmentInput,
  PesiResult,
  RiskStratificationResult,
  ErsEscRisk,
  AhaAccCategory,
  EngineOutput,
  InvestigationRecommendation,
  TreatmentPlan,
} from './types';
import { retrieveGuidelineChunks } from './guidelineKnowledgeBase';

// ---------- PESI / sPESI ----------

export function computePesi(input: PeAssessmentInput): PesiResult {
  const p = input.pesi;
  let points = Math.round(p.ageYears);
  if (p.male) points += 10;
  if (p.cancer) points += 30;
  if (p.heartFailure) points += 10;
  if (p.chronicLungDisease) points += 10;
  if (p.heartRateBpm >= 110) points += 20;
  if (p.systolicBpMmHg < 100) points += 30;
  if (p.respiratoryRatePerMin >= 30) points += 20;
  if (p.temperatureC < 36) points += 20;
  if (p.alteredMentalStatus) points += 60;
  if (p.spo2Percent < 90) points += 20;

  let pesiClass: PesiResult['pesiClass'];
  if (points < 66) pesiClass = 'I';
  else if (points <= 85) pesiClass = 'II';
  else if (points <= 105) pesiClass = 'III';
  else if (points <= 125) pesiClass = 'IV';
  else pesiClass = 'V';

  let sPesi = 0;
  if (p.ageYears > 80) sPesi += 1;
  if (p.cancer) sPesi += 1;
  if (p.heartFailure || p.chronicLungDisease) sPesi += 1;
  if (p.heartRateBpm >= 110) sPesi += 1;
  if (p.systolicBpMmHg < 100) sPesi += 1;
  if (p.spo2Percent < 90) sPesi += 1;

  return {
    pesiPoints: points,
    pesiClass,
    sPesiScore: sPesi,
    lowRiskByPesi: pesiClass === 'I' || pesiClass === 'II',
    lowRiskBySPesi: sPesi === 0,
  };
}

// ---------- Risk stratification (ERS/ESC + AHA/ACC) ----------

export function stratifyRisk(input: PeAssessmentInput): RiskStratificationResult {
  const pesi = computePesi(input);
  const h = input.hemodynamics;
  const r = input.respiratoryModifiers;
  const rv = input.rvAndBiomarkers;
  const rationale: string[] = [];

  const respiratoryModifierPresent =
    r.spo2Below90 || r.respRateAtOrAbove30 || r.supplementalO2Above6L || r.nonrebreatherOrNIV || r.hypoxemicOrVentilatoryFailure;

  const unstable =
    h.cardiacArrest || h.persistentHypotension || h.transientHypotension || h.vasopressorOrInotropeRequired || h.normotensiveShockSigns;

  let ersEscRisk: ErsEscRisk;
  let ahaAccCategory: AhaAccCategory;

  if (h.cardiacArrest) {
    ersEscRisk = 'high';
    ahaAccCategory = 'E2';
    rationale.push('Cardiac arrest attributable to PE → highest-risk category (ERS/ESC high-risk; AHA/ACC E2).');
  } else if (h.persistentHypotension || (h.vasopressorOrInotropeRequired && !h.transientHypotension)) {
    ersEscRisk = 'high';
    ahaAccCategory = 'E1';
    rationale.push('Persistent hypotension / vasopressor-dependent shock → ERS/ESC high-risk; AHA/ACC E1 (recurrent or persistent hypotension with shock).');
  } else if (h.normotensiveShockSigns) {
    ersEscRisk = 'high';
    ahaAccCategory = 'D2';
    rationale.push('Normotensive shock (hypoperfusion despite near-normal BP) → ERS/ESC high-risk; AHA/ACC D2.');
  } else if (h.transientHypotension) {
    ersEscRisk = 'high';
    ahaAccCategory = 'D1';
    rationale.push('Transient hypotension → ERS/ESC high-risk; AHA/ACC D1 (incipient cardiopulmonary failure).');
  } else {
    // Hemodynamically stable — use RV function + biomarkers + PESI/sPESI
    const rvAbnormal = rv.rvDysfunctionOnImaging === 'abnormal';
    const biomarkerAbnormal = rv.troponinElevated === 'elevated' || rv.bnpOrNtProBnpElevated === 'elevated';
    const bothAbnormal = rvAbnormal && biomarkerAbnormal;
    const eitherAbnormal = rvAbnormal || biomarkerAbnormal;
    const elevatedSeverity = !pesi.lowRiskBySPesi || (pesi.pesiClass !== 'I' && pesi.pesiClass !== 'II');

    if (!elevatedSeverity && !eitherAbnormal) {
      ersEscRisk = 'low';
      ahaAccCategory = 'A';
      rationale.push('Hemodynamically stable, sPESI 0 / PESI I-II, normal RV function and biomarkers → low-risk (AHA/ACC A/B1-B2 range; classified here as A/B).');
      if (rv.subsegmentalOnly) {
        ahaAccCategory = 'B1';
        rationale.push('Subsegmental-only clot burden → AHA/ACC B1.');
      } else {
        ahaAccCategory = 'B2';
      }
    } else if (bothAbnormal) {
      ersEscRisk = 'intermediate-high';
      ahaAccCategory = 'C3';
      rationale.push('Elevated clinical severity score with BOTH abnormal RV function AND elevated biomarker(s) → intermediate-high risk (AHA/ACC C3); this group is most likely to benefit from thrombolysis/thrombectomy among stable patients.');
    } else if (eitherAbnormal) {
      ersEscRisk = 'intermediate-low';
      ahaAccCategory = 'C2';
      rationale.push('Elevated clinical severity score with EITHER abnormal RV function OR elevated biomarker (not both) → intermediate-low risk (AHA/ACC C2).');
    } else {
      ersEscRisk = 'intermediate-low';
      ahaAccCategory = 'C1';
      rationale.push('Elevated PESI/sPESI severity score but normal RV function and biomarkers → AHA/ACC C1 (still warrants close monitoring; ERS/ESC would generally regard this as low-to-intermediate).');
    }
  }

  if (respiratoryModifierPresent && !unstable) {
    rationale.push('Respiratory modifier present (SpO2<90%, RR≥30, high supplemental O2 requirement, or hypoxemic/ventilatory failure) — this increases risk within the assigned AHA/ACC category.');
  }

  if (rv.rightHeartThrombus) {
    rationale.push('Right heart (mobile) thrombus present — associated with higher 14-day and 3-month mortality; treat with heightened vigilance regardless of otherwise-assigned risk category, and obtain expert/PERT input on management of clot-in-transit.');
  }
  if (rv.concomitantDvt) {
    rationale.push('Concomitant DVT present — associated with increased all-cause and PE-specific mortality; factor into anticoagulation urgency and outpatient-eligibility decisions.');
  }

  return { pesi, ersEscRisk, ahaAccCategory, respiratoryModifierPresent, rationale };
}

// ---------- Investigations ----------

export function recommendInvestigations(input: PeAssessmentInput): InvestigationRecommendation[] {
  const out: InvestigationRecommendation[] = [];
  const sp = input.specialPopulations;

  out.push({
    category: 'Risk-stratification imaging & biomarkers',
    items: [
      'CT pulmonary angiography (already diagnostic study) — review for RV dilation/RV:LV ratio as a surrogate for dysfunction',
      'Bedside or formal transthoracic echocardiography for RV function (preferred over CT alone for functional assessment)',
      'Cardiac troponin (I or T)',
      'BNP or NT-proBNP',
      'Bilateral lower-extremity compression ultrasonography (screen for concomitant/residual DVT)',
    ],
    rationale: 'Required to complete ERS/ESC and AHA/ACC risk stratification and to identify patients who may benefit from thrombolysis/thrombectomy.',
  });

  if (input.hemodynamics.cardiacArrest || input.hemodynamics.persistentHypotension || input.hemodynamics.transientHypotension || input.hemodynamics.normotensiveShockSigns) {
    out.push({
      category: 'High-risk / unstable workup (parallel to resuscitation)',
      items: [
        'Point-of-care echocardiography to confirm RV strain/obstructive shock physiology at the bedside',
        'Arterial blood gas',
        'Serum lactate',
        'Type & screen / crossmatch in anticipation of possible thrombolysis or embolectomy bleeding risk',
      ],
      rationale: 'Do not delay life-saving therapy for confirmatory imaging in an unstable patient; obtain what is feasible at the bedside in parallel with resuscitation.',
    });
  }

  out.push({
    category: 'Bleeding-risk and anticoagulation-planning labs',
    items: [
      'CBC with platelets',
      'Renal function (creatinine/eGFR) — affects LMWH/DOAC dosing and monitoring choice',
      'Liver function tests',
      'Baseline coagulation studies (PT/INR, aPTT) if UFH or warfarin anticipated',
    ],
    rationale: 'Needed to select and dose anticoagulant safely and to assess bleeding risk before thrombolysis/thrombectomy decisions.',
  });

  if (sp.unprovoked || sp.inheritedThrombophiliaSuspected || sp.recurrentOnTherapeuticAnticoagulation || sp.antiphospholipidSyndrome) {
    out.push({
      category: 'Thrombophilia / occult malignancy evaluation',
      items: [
        'Factor V Leiden mutation / activated protein C resistance assay',
        'Prothrombin G20210A gene mutation testing',
        'Protein C activity',
        'Protein S activity (free and total)',
        'Antithrombin activity',
        'Lupus anticoagulant, anticardiolipin antibodies (IgG/IgM), anti-β2-glycoprotein I antibodies — for antiphospholipid syndrome (ideally repeated ≥12 weeks later to confirm persistence, and drawn before/with caution around anticoagulation, which can affect some assays)',
        'Age- and symptom-appropriate malignancy screening if PE is unprovoked',
      ],
      rationale: 'Indicated for unprovoked PE, suspected inherited thrombophilia, recurrence despite therapeutic anticoagulation, or clinical suspicion for antiphospholipid syndrome — this shapes duration of anticoagulation and agent choice (e.g., avoiding DOAC monotherapy in triple-positive APS).',
    });
  }

  if (sp.pregnant) {
    out.push({
      category: 'Pregnancy-specific considerations',
      items: [
        'Avoid ionizing-radiation-heavy protocols where possible; confirm imaging strategy with radiology',
        'Renal function and weight for LMWH dosing (weight-based, often with periodic anti-Xa monitoring)',
      ],
      rationale: 'Anticoagulant and imaging choices differ in pregnancy; coordinate with obstetrics.',
    });
  }

  if (sp.suspectedOrConfirmedHit) {
    out.push({
      category: 'HIT workup',
      items: [
        '4Ts score documentation',
        'PF4/heparin antibody immunoassay (ELISA)',
        'Serotonin release assay or heparin-induced platelet activation assay for confirmation if immunoassay positive',
      ],
      rationale: 'Confirm/exclude HIT before continuing or resuming any heparin product.',
    });
  }

  return out;
}

// ---------- Diagnosis suggestions ----------

export function suggestDiagnosisContext(input: PeAssessmentInput, risk: RiskStratificationResult): string[] {
  const out: string[] = [];
  const sp = input.specialPopulations;
  const rv = input.rvAndBiomarkers;

  out.push(`Working severity classification: ERS/ESC "${risk.ersEscRisk}" risk; AHA/ACC category ${risk.ahaAccCategory}${risk.respiratoryModifierPresent ? ' with respiratory modifier' : ''}.`);

  if (rv.subsegmentalOnly) {
    out.push(rv.singleSmallDefectNoOtherThrombus
      ? 'Subsegmental PE with a single small defect and no other thrombus — a candidate for surveillance without anticoagulation IF pretest probability was low, D-dimer normal, and cardiorespiratory reserve preserved; otherwise treat as PE.'
      : 'Subsegmental PE — multiple defects or other risk factors present; treat similarly to segmental/lobar PE.');
  }

  if (sp.activeMalignancy) out.push('Cancer-associated thrombosis — consider extended/indefinite anticoagulation; involve oncology on agent choice given interacting therapies and bleeding sites.');
  if (sp.pregnant) out.push('PE in pregnancy — LMWH-based management; avoid warfarin and most DOACs; coordinate with maternal-fetal medicine.');
  if (sp.suspectedOrConfirmedHit) out.push('Suspected/confirmed HIT — an alternative, non-heparin cause of the hypercoagulable state; this changes anticoagulant selection immediately.');
  if (sp.antiphospholipidSyndrome) out.push('Known or suspected antiphospholipid syndrome — favors indefinite anticoagulation; avoid DOAC monotherapy if triple-antibody-positive (per dedicated APS management guidance).');
  if (sp.inheritedThrombophiliaSuspected) {
    const t = sp.inheritedThrombophiliaKnownType;
    if (t && t !== 'none' && t !== 'unspecified') {
      out.push(`Inherited thrombophilia identified (${t.replace(/_/g, ' ')}) — factors into duration-of-anticoagulation discussion, particularly for unprovoked or recurrent PE; protein C/S deficiency carries a warfarin-induced skin necrosis risk if started without heparin overlap.`);
    } else {
      out.push('Inherited thrombophilia suspected but type not yet confirmed — send thrombophilia panel (ideally not during acute thrombosis/heparin/DOAC therapy where assays are affected) and reassess duration once results return.');
    }
  }
  if (sp.recurrentOnTherapeuticAnticoagulation) {
    out.push('Recurrence on therapeutic anticoagulation — check for subtherapeutic levels first (compliance, malabsorption, drug interactions, renal/weight changes), then evaluate for ongoing prothrombotic stimuli (malignancy, May-Thurner, thrombophilia, antiphospholipid syndrome) or misdiagnosis.');
  }
  if (rv.rightHeartThrombus) out.push('Mobile right heart thrombus (clot-in-transit) — associated with markedly higher early mortality; urgent multidisciplinary/PERT input warranted.');
  if (rv.concomitantDvt) out.push('Concomitant DVT confirmed — reinforces urgency of anticoagulation and lowers the threshold against early outpatient management.');

  return out;
}

// ---------- Treatment plan ----------

export function buildTreatmentPlan(input: PeAssessmentInput, risk: RiskStratificationResult): TreatmentPlan {
  const sp = input.specialPopulations;
  const br = input.bleedingRisk;
  const oe = input.outpatientEligibility;
  const rv = input.rvAndBiomarkers;
  const h = input.hemodynamics;

  const contraindicatedOrHighRisk = br.absoluteContraindication || br.highBleedingRisk;
  const anticoagIndicated = !br.absoluteContraindication; // high risk alone → individualize, still generally indicated unless absolute contraindication

  const agentGuidance: string[] = [];
  if (sp.suspectedOrConfirmedHit) {
    agentGuidance.push('Avoid ALL heparin products. Use a non-heparin anticoagulant (argatroban, bivalirudin, fondaparinux, or a DOAC once platelet count recovers and patient is stable).');
  } else if (sp.pregnant) {
    agentGuidance.push('LMWH is generally preferred; avoid warfarin and most DOACs in pregnancy.');
  } else if (h.cardiacArrest || h.persistentHypotension || h.transientHypotension || h.normotensiveShockSigns || h.vasopressorOrInotropeRequired) {
    agentGuidance.push('Unfractionated heparin (UFH) preferred while hemodynamically unstable, given short half-life and reversibility if thrombolysis or embolectomy becomes necessary.');
  } else {
    agentGuidance.push('LMWH is reasonable if renal function is preserved and rapid, predictable onset is desired; a direct oral anticoagulant (DOAC) is appropriate once the patient is stable and not a thrombolysis/embolectomy candidate.');
  }
  if (sp.antiphospholipidSyndrome) {
    agentGuidance.push('If triple-antibody-positive antiphospholipid syndrome: avoid DOAC monotherapy — use a vitamin K antagonist (with heparin bridge) per dedicated APS guidance.');
  }
  if (sp.inheritedThrombophiliaKnownType === 'protein_c_deficiency' || sp.inheritedThrombophiliaKnownType === 'protein_s_deficiency') {
    agentGuidance.push('Protein C/S deficiency: if warfarin is used, overlap with a parenteral anticoagulant (heparin/LMWH) to avoid warfarin-induced skin necrosis from early transient hypercoagulability.');
  }
  if (rv.subsegmentalOnly && rv.singleSmallDefectNoOtherThrombus && risk.ersEscRisk === 'low') {
    agentGuidance.push('If pretest probability was low and D-dimer normal, surveillance without anticoagulation (serial bilateral compression ultrasonography at 2 weeks) is a reasonable alternative to anticoagulation — discuss both options with the patient.');
  }

  const ivcFilterRecommended = contraindicatedOrHighRisk && br.absoluteContraindication;

  let outpatientEligible: boolean | 'not_applicable' = 'not_applicable';
  if (risk.ersEscRisk === 'low') {
    const ineligible =
      oe.requiresSupplementalO2 || oe.requiresNarcoticsForPain || oe.respiratoryDistress || oe.abnormalPulseOrBp ||
      oe.recentBleedingOrRiskFactors || oe.seriousComorbidity || oe.poorMentalStatusOrSupport || oe.needleAverseNoLmwhAccess ||
      oe.noAccessToDoacs || rv.concomitantDvt || !risk.pesi.lowRiskBySPesi;
    outpatientEligible = !ineligible;
  }

  let durationMonths: number | string = 3;
  const durationNotes: string[] = ['Minimum three months for a first, standard-severity PE, per initial-anticoagulation guidance.'];
  if (sp.activeMalignancy) {
    durationMonths = 'extended/indefinite (reassess periodically)';
    durationNotes.push('Active cancer favors extended or indefinite anticoagulation while malignancy remains active, per cancer-associated-thrombosis guidance.');
  } else if (sp.antiphospholipidSyndrome) {
    durationMonths = 'indefinite';
    durationNotes.push('Antiphospholipid syndrome generally favors indefinite anticoagulation.');
  } else if (sp.unprovoked && (sp.inheritedThrombophiliaSuspected || sp.recurrentOnTherapeuticAnticoagulation)) {
    durationMonths = 'consider indefinite — individualize with hematology input';
    durationNotes.push('Unprovoked PE with an identified thrombophilia, or recurrence, shifts the discussion toward indefinite anticoagulation weighed against bleeding risk (see dedicated indefinite-anticoagulation selection guidance).');
  } else if (sp.unprovoked) {
    durationMonths = '3+ months, then reassess for indefinite therapy';
    durationNotes.push('Unprovoked PE without an identified persistent risk factor still warrants a structured discussion of indefinite therapy at the 3-month mark.');
  } else if (rv.subsegmentalOnly) {
    durationNotes.push('Subsegmental PE treated with anticoagulation is generally continued for the same minimum three months as segmental/lobar PE.');
  }

  let thrombolysisIndicated: TreatmentPlan['advancedTherapy']['thrombolysisIndicated'];
  let embolectomyOrCdtConsideration = 'Not indicated at this risk level.';
  let pertConsultRecommended = false;
  const advNotes: string[] = [];

  if (risk.ersEscRisk === 'high') {
    pertConsultRecommended = true;
    if (br.absoluteContraindication) {
      thrombolysisIndicated = 'contraindicated_consider_alternative';
      embolectomyOrCdtConsideration = 'Systemic thrombolysis is contraindicated — pursue catheter-directed therapy or surgical embolectomy urgently.';
      advNotes.push('Additional embolectomy indications: unsuccessful thrombolysis, or thrombus trapped in a PFO/right atrium/RV.');
    } else {
      thrombolysisIndicated = 'recommended';
      embolectomyOrCdtConsideration = 'If thrombolysis fails or is not tolerated, escalate to catheter-directed therapy or surgical embolectomy.';
    }
    advNotes.push('Death from high-risk PE often occurs within the first 2 hours; elevated risk persists up to 72 hours — do not delay reperfusion therapy for observation.');
    if (h.cardiacArrest || h.normotensiveShockSigns) {
      advNotes.push('Consider early VA-ECMO as a bridge to definitive reperfusion therapy if shock is refractory to fluids/vasopressors.');
    }
  } else if (risk.ersEscRisk === 'intermediate-high') {
    pertConsultRecommended = true;
    thrombolysisIndicated = 'consider_expert_consult';
    embolectomyOrCdtConsideration = 'Catheter-directed thrombolysis/thrombectomy may be considered via expert/PERT consultation; not routine.';
    advNotes.push('This subgroup (abnormal RV function AND elevated biomarkers) is most likely among stable patients to benefit from advanced reperfusion therapy — but the decision should not bypass expert consultation given bleeding risk.');
    advNotes.push('Monitor closely: rising heart rate (>120 bpm) or falling oxygenation may precede hemodynamic collapse — lower the threshold to escalate.');
  } else if (risk.ersEscRisk === 'intermediate-low') {
    thrombolysisIndicated = 'not_indicated';
    embolectomyOrCdtConsideration = 'Not routinely indicated; reserve expert consultation for clinical deterioration.';
    advNotes.push('Benefit of thrombolysis/thrombectomy is less likely in this lower end of the intermediate-risk spectrum; anticoagulation alone with close monitoring is standard.');
  } else {
    thrombolysisIndicated = 'not_indicated';
    advNotes.push('Advanced reperfusion therapy is not indicated in low-risk PE and may cause net harm.');
  }

  const monitoring: string[] = [
    'Heart rate, blood pressure, oxygen saturation trend (escalating tachycardia or desaturation can precede hemodynamic collapse).',
    'Therapeutic anticoagulation levels where relevant (aPTT for UFH; INR for warfarin; routine monitoring not required for LMWH/fondaparinux/DOACs).',
    'Bleeding surveillance.',
  ];
  if (risk.ersEscRisk !== 'low') monitoring.push('Serial or repeat bedside echocardiography if clinical status changes.');

  const followUpSchedule: TreatmentPlan['followUpSchedule'] = [
    { timepoint: '~1 week after discharge', purpose: 'Clinical review, symptom resolution, anticoagulation tolerance/adherence.' },
    { timepoint: '3 months', purpose: 'Decide duration of anticoagulation (stop, continue fixed duration, or extend/indefinite).' },
    { timepoint: '1 year', purpose: 'Evaluate for chronic thromboembolic pulmonary hypertension (CTEPH); consider six-minute walk test if functional limitation persists.' },
  ];

  const specialPopulationNotes: string[] = [];
  if (sp.pregnant) specialPopulationNotes.push('Coordinate anticoagulation and delivery planning with obstetrics/maternal-fetal medicine.');
  if (sp.activeMalignancy) specialPopulationNotes.push('Involve oncology; reassess anticoagulation plan with each change in cancer therapy.');
  if (sp.suspectedOrConfirmedHit) specialPopulationNotes.push('Do not resume any heparin product until HIT is excluded or has fully resolved and antibodies cleared.');
  if (sp.antiphospholipidSyndrome) specialPopulationNotes.push('Hematology co-management recommended given indefinite-duration and agent-selection nuances.');
  if (sp.inheritedThrombophiliaSuspected) specialPopulationNotes.push('Ideally confirm thrombophilia panel results off acute-phase heparin/DOAC influence before finalizing indefinite-duration decisions; involve hematology.');
  if (sp.recurrentOnTherapeuticAnticoagulation) specialPopulationNotes.push('Escalate to a coagulation specialist; therapeutic options for confirmed adequate-anticoagulation recurrence are limited and individualized.');

  return {
    anticoagulation: {
      indicated: anticoagIndicated,
      contraindicatedOrHighRisk,
      agentGuidance,
      ivcFilterRecommended,
      outpatientEligible,
      durationMonths,
      durationRationale: durationNotes.join(' '),
    },
    advancedTherapy: {
      thrombolysisIndicated,
      embolectomyOrCdtConsideration,
      pertConsultRecommended,
      notes: advNotes,
    },
    monitoring,
    followUpSchedule,
    specialPopulationNotes,
  };
}

// ---------- Orchestration ----------

export function runPeAssessment(input: PeAssessmentInput): EngineOutput {
  const riskStratification = stratifyRisk(input);
  const investigations = recommendInvestigations(input);
  const diagnosisSuggestions = suggestDiagnosisContext(input, riskStratification);
  const treatmentPlan = buildTreatmentPlan(input, riskStratification);

  const queryTerms = [
    riskStratification.ersEscRisk,
    riskStratification.ahaAccCategory,
    'pesi',
    input.specialPopulations.pregnant ? 'pregnancy' : '',
    input.specialPopulations.activeMalignancy ? 'malignancy' : '',
    input.specialPopulations.suspectedOrConfirmedHit ? 'hit' : '',
    input.specialPopulations.antiphospholipidSyndrome ? 'antiphospholipid' : '',
    input.specialPopulations.inheritedThrombophiliaSuspected ? 'thrombophilia' : '',
    input.rvAndBiomarkers.subsegmentalOnly ? 'subsegmental' : '',
    input.rvAndBiomarkers.rightHeartThrombus ? 'right heart thrombus' : '',
    treatmentPlan.advancedTherapy.thrombolysisIndicated !== 'not_indicated' ? 'thrombolysis embolectomy' : 'anticoagulation duration',
    'follow-up monitoring',
  ].filter(Boolean);

  const chunks = retrieveGuidelineChunks(queryTerms, 6);
  const guidelineReferences = chunks.map((c) => ({ chunkId: c.id, heading: c.heading }));

  return { riskStratification, investigations, diagnosisSuggestions, treatmentPlan, guidelineReferences };
}
