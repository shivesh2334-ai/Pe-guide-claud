// Lightweight retrieval corpus built from the user-supplied source document:
// Weinberg AS, Rali P. "Acute pulmonary embolism in adults: Treatment overview
// and prognosis." UpToDate, Topic 8265 Version 121.0. Literature review current
// through Aug 2026; topic last updated Sep 11, 2026.
//
// This is NOT a vector-embedding RAG pipeline (no embedding API key is wired up
// in this deployment). It is a deterministic keyword/TF-style retriever over
// hand-chunked passages from the attached source, used to surface the exact
// guideline passage behind each recommendation the engine makes. Swap in a
// real embedding store (e.g. Supabase pgvector) later by implementing the same
// `search()` interface.

export interface GuidelineChunk {
  id: string;
  heading: string;
  text: string;
  keywords: string[];
}

export const GUIDELINE_CHUNKS: GuidelineChunk[] = [
  {
    id: 'risk-ers-esc',
    heading: 'ERS/ESC risk assessment (low / intermediate / high)',
    text: 'Low-risk PE: hemodynamically stable, normal RV size/function, normal biomarkers, PESI I/II or sPESI 0. Intermediate-risk (submassive): RV dysfunction without systemic hypotension; subclassified intermediate-low (abnormal RV OR elevated biomarker) and intermediate-high (abnormal RV AND elevated biomarker). High-risk (massive/unstable): hemodynamic instability - transient hypotension, normotensive shock, persistent hypotension, cardiac arrest, or obstructive shock.',
    keywords: ['risk', 'pesi', 'spesi', 'rv dysfunction', 'biomarker', 'hypotension', 'low-risk', 'intermediate-risk', 'high-risk', 'stratification'],
  },
  {
    id: 'risk-aha-acc',
    heading: 'AHA/ACC/others 2026 A-E risk categories',
    text: 'A: subclinical/incidental PE, lowest risk. B: symptomatic, low severity score (sPESI 0 / PESI I-II); B1 subsegmental, B2 nonsubsegmental. C: symptomatic, elevated severity score (sPESI>=1 / PESI III-IV); C1 normal RV & biomarkers, C2 abnormal RV OR elevated biomarker, C3 abnormal RV AND elevated biomarker. Respiratory modifier: SpO2<90%, RR>=30, or need for supplemental O2. D: incipient cardiopulmonary failure; D1 transient hypotension, D2 normotensive shock; respiratory modifier >6L O2 or nonrebreather. E: cardiopulmonary failure, highest risk; E1 recurrent/persistent hypotension with shock, E2 refractory cardiogenic shock or arrest; respiratory modifier hypoxemic/ventilatory failure. Category D1 and higher are candidates for advanced therapies (thrombolysis/thrombectomy); value in C3 uncertain, potentially harmful in A-C2.',
    keywords: ['aha', 'acc', 'category', 'a', 'b1', 'b2', 'c1', 'c2', 'c3', 'd1', 'd2', 'e1', 'e2', 'respiratory modifier', 'advanced therapy'],
  },
  {
    id: 'pesi-model',
    heading: 'PESI and simplified PESI (sPESI)',
    text: 'PESI adds age (years) to points for 10 variables (male sex, cancer, heart failure, chronic lung disease, HR>=110, SBP<100, RR>=30, temp<36C, altered mental status, SpO2<90%). Classes: I <66, II 66-85, III 86-105, IV 106-125, V >125. Class I/II = low risk. sPESI = 1 point each for age>80, cancer, chronic cardiopulmonary disease, HR>=110, SBP<100, SpO2<90%; score 0 = low risk, >=1 = high risk. sPESI has similar prognostic accuracy to PESI and is less cumbersome to apply.',
    keywords: ['pesi', 'spesi', 'severity index', 'score', 'class', 'points'],
  },
  {
    id: 'empiric-anticoag',
    heading: 'Empiric anticoagulation or thrombolysis pending diagnosis',
    text: 'High clinical suspicion (Wells>6): start anticoagulation immediately. Moderate suspicion (Wells 2-6): start if workup expected >4 hours. Low suspicion (Wells<2): start if workup expected >24 hours. Absolute contraindications (recent surgery, hemorrhagic stroke, active bleeding, aortic dissection, intracranial/spinal tumor): do not give empiric anticoagulation. High bleeding risk without absolute contraindication: individualize. Hemodynamically unstable with high suspicion: empiric thrombolysis may be life-saving; attempt to confirm diagnosis if feasible (bedside echo, CTPA, compression ultrasound).',
    keywords: ['empiric', 'wells score', 'pretest probability', 'suspicion', 'contraindication', 'bleeding risk'],
  },
  {
    id: 'low-risk-anticoag',
    heading: 'Low-risk PE: anticoagulation, agent selection, duration',
    text: 'For low-risk PE with bleeding risk not high: anticoagulant therapy (Grade 1B), typically continued a minimum of three months for initial duration; indefinite duration decisions are separate. LMW heparin preferred when rapid onset needed without renal impairment; UFH preferred if hemodynamically unstable or thrombolysis/embolectomy anticipated; direct thrombin/factor Xa inhibitors should not be used in hemodynamically unstable patients. Contraindication to anticoagulation or unacceptably high bleeding risk: place a retrievable IVC filter (Grade 2C); anticoagulate and retrieve filter once contraindication resolves.',
    keywords: ['low-risk', 'anticoagulation', 'agent', 'lmwh', 'ufh', 'doac', 'ivc filter', 'duration', 'three months'],
  },
  {
    id: 'subsegmental-pe',
    heading: 'Subsegmental PE (SSPE)',
    text: 'Most patients with SSPE should undergo therapeutic anticoagulation, treated similarly to segmental/lobar PE (minimum three months), particularly if unprovoked, persistent risk factors, multiple defects, symptomatic, or limited cardiorespiratory reserve. A small subset may reasonably opt for surveillance without anticoagulation: single small defect with no proximal DVT or thrombus elsewhere, suspected false positive, preserved cardiorespiratory function, low pretest probability with normal D-dimer. If surveillance chosen: serial bilateral proximal compression ultrasonography of the lower extremities at two weeks; low threshold to repeat PE imaging if symptoms persist/recur.',
    keywords: ['subsegmental', 'sspe', 'surveillance', 'compression ultrasound', 'single small defect'],
  },
  {
    id: 'outpatient-anticoag',
    heading: 'Outpatient anticoagulation eligibility',
    text: 'Outpatient therapy for low-risk PE requires ALL of: PESI I/II or sPESI 0; no supplemental O2 requirement; no narcotics for pain; no respiratory distress; normal pulse/BP; no recent bleeding or bleeding risk factors; no serious comorbidity (ischemic heart disease, chronic lung disease, liver/kidney failure, thrombocytopenia, cancer); normal mental status, good understanding, not needle-averse if LMWH chosen, good home support; absence of concomitant DVT; ready access to DOACs.',
    keywords: ['outpatient', 'discharge', 'eligibility', 'hestia'],
  },
  {
    id: 'intermediate-risk-mgmt',
    heading: 'Intermediate-risk PE management',
    text: 'Most intermediate-risk patients are anticoagulated the same as low-risk patients. Close monitoring for deterioration is required, especially intermediate-high risk (watch for tachycardia >120 bpm and falling oxygenation, which may precede acute hypotension - lower the threshold to escalate to thrombolysis). Expert/PERT consultation should be obtained to identify patients (particularly intermediate-high, i.e. abnormal RV function AND elevated BNP/troponin) who may benefit from thrombolysis or thrombectomy; benefit is less likely at the lower end of the intermediate spectrum (abnormal RV OR elevated biomarker only).',
    keywords: ['intermediate-risk', 'submassive', 'intermediate-high', 'intermediate-low', 'monitoring', 'pert', 'thrombolysis candidate'],
  },
  {
    id: 'high-risk-mgmt',
    heading: 'High-risk (unstable) PE management',
    text: 'Hemodynamically unstable PE: systemic thrombolytic reperfusion therapy is indicated in most patients without contraindication. When thrombolysis is contraindicated or bleeding risk unacceptably high, catheter-based procedures or surgical embolectomy is appropriate. Additional indications for surgical embolectomy include unsuccessful thrombolysis or thrombus trapped in a PFO, right atrium, or RV. Death from high-risk PE often occurs within the first two hours; risk remains elevated up to 72 hours.',
    keywords: ['high-risk', 'unstable', 'thrombolysis', 'embolectomy', 'catheter-directed', 'shock', 'cardiac arrest'],
  },
  {
    id: 'pert',
    heading: 'Pulmonary embolism response teams (PERT)',
    text: 'Multidisciplinary PERTs (pulmonology, critical care, cardiology, thoracic surgery, IR, vascular surgery, EM, hematology, pharmacy) are recommended (2019 ESC conditional recommendation) for intermediate- and high-risk PE. A 2025 meta-analysis of 24 studies found PERTs associated with increased use of advanced therapies (OR 3.16), decreased mortality (OR 0.72), and decreased major bleeding (OR 0.60) versus usual care.',
    keywords: ['pert', 'multidisciplinary', 'response team', 'consult'],
  },
  {
    id: 'inherited-thrombophilia',
    heading: 'Inherited thrombophilias and antiphospholipid syndrome',
    text: 'Special-population topics referenced for treatment nuance: Factor V Leiden / activated protein C resistance, Prothrombin G20210A mutation, Protein S deficiency, Protein C deficiency, Antithrombin deficiency, and Antiphospholipid syndrome each have dedicated management guidance (duration of anticoagulation, agent choice - e.g., avoid DOAC monotherapy in triple-positive antiphospholipid syndrome per separate topic, avoid warfarin-induced skin necrosis risk in protein C/S deficiency without heparin bridge). A search for thrombophilia and occult malignancy is appropriate when recurrence occurs despite therapeutic anticoagulation, or when PE is unprovoked in select patients.',
    keywords: ['thrombophilia', 'factor v leiden', 'prothrombin g20210a', 'protein s deficiency', 'protein c deficiency', 'antithrombin deficiency', 'antiphospholipid', 'inherited', 'genetic'],
  },
  {
    id: 'malignancy',
    heading: 'PE in patients with malignancy',
    text: 'Anticoagulation for VTE in adult patients with active malignancy is discussed in a dedicated topic; in general, cancer-associated VTE favors extended/indefinite anticoagulation given ongoing prothrombotic risk, with agent choice individualized (LMWH or select DOACs, considering GI/GU malignancy bleeding risk and drug interactions).',
    keywords: ['malignancy', 'cancer', 'active cancer'],
  },
  {
    id: 'pregnancy',
    heading: 'PE in pregnancy',
    text: 'Anticoagulation during pregnancy and postpartum requires agent selection avoiding warfarin and most DOACs (teratogenicity / lack of safety data); LMWH is generally preferred, with dosing and monitoring detailed in dedicated pregnancy topics.',
    keywords: ['pregnant', 'pregnancy', 'postpartum'],
  },
  {
    id: 'hit',
    heading: 'Heparin-induced thrombocytopenia (HIT)',
    text: 'Suspected or confirmed HIT requires immediate discontinuation of all heparin products (including LMWH and heparin flushes) and initiation of a non-heparin anticoagulant (e.g., argatroban, bivalirudin, fondaparinux, or a DOAC once stable), per dedicated HIT management topics.',
    keywords: ['hit', 'heparin-induced thrombocytopenia', 'thrombocytopenia'],
  },
  {
    id: 'recurrence',
    heading: 'Management of recurrence on therapy',
    text: 'Inadequate anticoagulation (subtherapeutic levels, malabsorption, poor compliance, altered pharmacokinetics, drug interactions) is the most common cause of recurrence and should be checked first. Other causes: suboptimal prior therapy (filter/embolectomy/thrombolysis without anticoagulation), ongoing prothrombotic stimuli (malignancy, May-Thurner, inherited thrombophilia, antiphospholipid syndrome), mechanical obstruction or thrombus dissociation, or misdiagnosis (tumor/fat embolism). Consult a coagulation specialist when abnormal pharmacokinetics or noncompliance is suspected for agents that are hard to monitor (DOACs, LMWH).',
    keywords: ['recurrence', 'subtherapeutic', 'noncompliance', 'coagulation specialist', 'may-thurner'],
  },
  {
    id: 'ivc-filter',
    heading: 'IVC filter indications and evidence',
    text: 'IVC filters are indicated for contraindication to anticoagulation or unacceptably high bleeding risk, even without proven lower-extremity thrombus. PREPIC2 RCT (399 patients with severe PE) found no reduction in PE recurrence, DVT recurrence, or mortality when a retrievable filter was added to anticoagulation. Filters are not routinely used as an anticoagulation adjunct but may be considered case-by-case for recurrence despite therapeutic anticoagulation, large clot burden with proximal DVT, poor cardiopulmonary reserve, or anticipated need to stop anticoagulation for bleeding. Retrievable filters should be removed once the contraindication resolves.',
    keywords: ['ivc filter', 'inferior vena cava', 'prepic2', 'retrievable filter'],
  },
  {
    id: 'monitoring-followup',
    heading: 'Monitoring and follow-up schedule',
    text: 'Typical follow-up: approximately one week after discharge; at three months to decide duration of anticoagulation; at one year to evaluate for chronic thromboembolic pulmonary hypertension (CTEPH). Restrict long-haul travel for four weeks in intermediate- and high-risk PE regardless of anticoagulation status. Monitor: therapeutic anticoagulation levels (aPTT for UFH, INR for warfarin; no routine monitoring for LMWH/fondaparinux/DOACs), resolution of symptoms and new symptoms of recurrence/DVT, persistent/progressive dyspnea (consider CTED/CTEPH - affects up to 5% of patients; six-minute walk test if functional limitation persists at six months), therapy complications (bleeding, skin necrosis with warfarin, osteoporosis/thrombocytopenia with heparin, filter migration), need for indefinite anticoagulation, need for filter retrieval, and underlying predisposing risk factors (thrombophilia/occult malignancy evaluation).',
    keywords: ['follow-up', 'monitoring', 'cteph', 'cted', 'six-minute walk', 'travel restriction'],
  },
  {
    id: 'complications',
    heading: 'Early and late complications',
    text: 'Early (<3 months): obstructive shock (8% of patients, 30-50% mortality when present, risk elevated for 72+ hours), recurrence (2% at 2 weeks, 6% at 3 months on anticoagulation), pleuritis/alveolitis/pneumonia, stroke (paradoxical embolism via PFO - consider symptom-directed PFO workup). Late (>3 months, occurs in 9-32%): recurrence (8% at 6 months, 13% at 1 year, 23% at 5 years, 30% at 10 years), chronic thromboembolic disease/CTEPH (progressive dyspnea within two years), increased cardiovascular events and atrial fibrillation risk.',
    keywords: ['complications', 'shock', 'recurrence rate', 'stroke', 'pfo', 'cteph'],
  },
  {
    id: 'prognosis',
    heading: 'Mortality and prognostic factors',
    text: 'Untreated PE mortality up to 30%; treated 2-11% (varies by risk group; overall death 4-13%). Poor prognostic factors: cardiogenic shock, RV dysfunction on imaging, elevated troponin/BNP/NT-proBNP, right heart thrombus (14-day mortality 21% vs 11% without), concomitant DVT (adjusted HR 2.05 for all-cause mortality), hyponatremia, elevated lactate, elevated WBC, Charlson comorbidity index >=1, residual pulmonary vascular obstruction, age>=65, tachycardia on admission, acute kidney injury.',
    keywords: ['prognosis', 'mortality', 'right heart thrombus', 'poor prognostic factors'],
  },
  {
    id: 'initial-resuscitation',
    heading: 'Initial resuscitation (respiratory and hemodynamic support)',
    text: 'Target SpO2 >=90% with supplemental oxygen. Avoid high plateau pressures and hypercapnia on mechanical ventilation (worsen RV failure); consult cardiovascular anesthesia and alert ECMO team before intubating a patient with RV failure. Prefer small-volume IV fluid boluses (250-500 mL) over large volumes (2-3 L), which can worsen RV overload; low threshold for vasopressors (norepinephrine preferred; dobutamine sometimes combined for inotropy) if perfusion not restored. VA-ECMO may bridge high-risk PE with refractory shock to definitive therapy.',
    keywords: ['resuscitation', 'oxygen', 'fluid', 'vasopressor', 'norepinephrine', 'ecmo', 'mechanical ventilation'],
  },
];

function scoreChunk(chunk: GuidelineChunk, queryTerms: string[]): number {
  const haystack = (chunk.heading + ' ' + chunk.text + ' ' + chunk.keywords.join(' ')).toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    const t = term.toLowerCase().trim();
    if (!t) continue;
    if (chunk.keywords.some((k) => k.toLowerCase() === t)) score += 3;
    else if (chunk.keywords.some((k) => k.toLowerCase().includes(t))) score += 2;
    if (haystack.includes(t)) score += 1;
  }
  return score;
}

/** Simple lexical retrieval over the guideline corpus. Returns top-N chunks by score. */
export function retrieveGuidelineChunks(queryTerms: string[], topN = 3): GuidelineChunk[] {
  return GUIDELINE_CHUNKS.map((c) => ({ chunk: c, score: scoreChunk(c, queryTerms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((x) => x.chunk);
}
