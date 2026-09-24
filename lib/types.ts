// Core clinical input/output types for the PE Assessment & Treatment Copilot
// Encodes: Weinberg AS, Rali P. "Acute pulmonary embolism in adults: Treatment
// overview and prognosis." UpToDate. Literature review current through Aug 2026;
// topic last updated Sep 11, 2026. Topic 8265 Version 121.0.

export interface PesiInputs {
  ageYears: number;
  male: boolean;
  cancer: boolean;
  heartFailure: boolean;
  chronicLungDisease: boolean;
  heartRateBpm: number;
  systolicBpMmHg: number;
  respiratoryRatePerMin: number;
  temperatureC: number;
  alteredMentalStatus: boolean;
  spo2Percent: number;
}

export interface HemodynamicInputs {
  cardiacArrest: boolean;
  persistentHypotension: boolean; // SBP <90 or drop >=40 from baseline >15min, unexplained
  transientHypotension: boolean;
  vasopressorOrInotropeRequired: boolean;
  normotensiveShockSigns: boolean; // hypoperfusion signs w/ normal-ish BP
}

export interface RespiratoryModifierInputs {
  spo2Below90: boolean;
  respRateAtOrAbove30: boolean;
  supplementalO2Above6L: boolean;
  nonrebreatherOrNIV: boolean;
  hypoxemicOrVentilatoryFailure: boolean;
}

export interface RvAndBiomarkerInputs {
  rvDysfunctionOnImaging: 'normal' | 'abnormal' | 'not_done';
  troponinElevated: 'normal' | 'elevated' | 'not_done';
  bnpOrNtProBnpElevated: 'normal' | 'elevated' | 'not_done';
  rightHeartThrombus: boolean;
  concomitantDvt: boolean;
  subsegmentalOnly: boolean;
  singleSmallDefectNoOtherThrombus: boolean;
}

export interface BleedingRiskInputs {
  absoluteContraindication: boolean; // recent surgery, hemorrhagic stroke, active bleeding, dissection, CNS tumor
  highBleedingRisk: boolean; // e.g. >~13% estimated risk, clinician judgment
}

export interface OutpatientEligibilityInputs {
  requiresSupplementalO2: boolean;
  requiresNarcoticsForPain: boolean;
  respiratoryDistress: boolean;
  abnormalPulseOrBp: boolean;
  recentBleedingOrRiskFactors: boolean;
  seriousComorbidity: boolean; // IHD, CLD, liver/kidney failure, thrombocytopenia, cancer
  poorMentalStatusOrSupport: boolean;
  needleAverseNoLmwhAccess: boolean;
  noAccessToDoacs: boolean;
}

export interface SpecialPopulationInputs {
  pregnant: boolean;
  activeMalignancy: boolean;
  suspectedOrConfirmedHit: boolean;
  antiphospholipidSyndrome: boolean;
  inheritedThrombophiliaSuspected: boolean;
  inheritedThrombophiliaKnownType?:
    | 'factor_v_leiden'
    | 'prothrombin_g20210a'
    | 'protein_s_deficiency'
    | 'protein_c_deficiency'
    | 'antithrombin_deficiency'
    | 'unspecified'
    | 'none';
  unprovoked: boolean;
  recurrentOnTherapeuticAnticoagulation: boolean;
}

export interface PeAssessmentInput {
  pesi: PesiInputs;
  hemodynamics: HemodynamicInputs;
  respiratoryModifiers: RespiratoryModifierInputs;
  rvAndBiomarkers: RvAndBiomarkerInputs;
  bleedingRisk: BleedingRiskInputs;
  outpatientEligibility: OutpatientEligibilityInputs;
  specialPopulations: SpecialPopulationInputs;
}

export type ErsEscRisk = 'low' | 'intermediate-low' | 'intermediate-high' | 'high';
export type AhaAccCategory =
  | 'A' | 'B1' | 'B2' | 'C1' | 'C2' | 'C3' | 'D1' | 'D2' | 'E1' | 'E2';

export interface PesiResult {
  pesiPoints: number;
  pesiClass: 'I' | 'II' | 'III' | 'IV' | 'V';
  sPesiScore: number;
  lowRiskByPesi: boolean; // class I/II
  lowRiskBySPesi: boolean; // sPESI 0
}

export interface RiskStratificationResult {
  pesi: PesiResult;
  ersEscRisk: ErsEscRisk;
  ahaAccCategory: AhaAccCategory;
  respiratoryModifierPresent: boolean;
  rationale: string[];
}

export interface InvestigationRecommendation {
  category: string;
  items: string[];
  rationale: string;
}

export interface TreatmentPlan {
  anticoagulation: {
    indicated: boolean;
    contraindicatedOrHighRisk: boolean;
    agentGuidance: string[];
    ivcFilterRecommended: boolean;
    outpatientEligible: boolean | 'not_applicable';
    durationMonths: number | string;
    durationRationale: string;
  };
  advancedTherapy: {
    thrombolysisIndicated: 'recommended' | 'consider_expert_consult' | 'not_indicated' | 'contraindicated_consider_alternative';
    embolectomyOrCdtConsideration: string;
    pertConsultRecommended: boolean;
    notes: string[];
  };
  monitoring: string[];
  followUpSchedule: { timepoint: string; purpose: string }[];
  specialPopulationNotes: string[];
}

export interface EngineOutput {
  riskStratification: RiskStratificationResult;
  investigations: InvestigationRecommendation[];
  diagnosisSuggestions: string[];
  treatmentPlan: TreatmentPlan;
  guidelineReferences: { chunkId: string; heading: string }[];
  /** Query terms used for guideline retrieval — reused by the client to call the vector-retrieval API route. */
  guidelineQueryTerms: string[];
}
