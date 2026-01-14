import { PatientState, PatientGroup, Gender, DecisionResult } from '../types';

export const evaluateScreening = (data: PatientState): DecisionResult => {
  if (data.hb === '' || !data.gender) {
    return { status: 'continue', title: 'Data Entry', message: 'Please enter patient data.' };
  }

  // 1. Diagnose Anemia
  const isAnemic =
    (data.gender === Gender.Male && data.hb < 13) ||
    (data.gender === Gender.Female && data.hb < 12);

  if (!isAnemic) {
    return {
      status: 'stop',
      title: 'No Anemia Detected',
      message: 'The patient does not meet the KDIGO criteria for anemia diagnosis.',
      details: [
        `Male Threshold: < 13 g/dL`,
        `Female Threshold: < 12 g/dL`,
        `Patient Hb: ${data.hb} g/dL`
      ],
      recommendationType: 'treatment' // Green for "No Anemia" (Healthy)
    };
  }

  return {
    status: 'continue',
    title: 'Anemia Diagnosed',
    message: 'Hemoglobin levels indicate anemia. Proceed to Iron Therapy Assessment.',
    details: [
      `Patient Hb: ${data.hb} g/dL`
    ],
    recommendationType: 'urgent' // Red for "Anemia Detected"
  };
};

export const evaluateIronTherapy = (data: PatientState): DecisionResult => {
  if (data.ferritin === '' || data.tsat === '' || !data.group) return { status: 'continue', title: '', message: '' };

  // 1. Severe Iron Deficiency Check (Moved from Screening)
  if (data.ferritin < 45) {
    return {
      status: 'stop',
      title: 'Severe Iron Deficiency Detected',
      message: 'Ferritin is < 45 ng/ml. Suspect bleeding.',
      details: [
        'Urology referral: Assess for hematuria',
        'Gynecology referral: Assess for menstrual blood loss',
        'Gastroenterology referral: Assess for occult GI blood loss'
      ],
      recommendationType: 'urgent'
    };
  }

  // 2. Check Stop Criteria (Active Infection)
  if (data.hasActiveInfection) {
    return {
      status: 'stop',
      title: 'Hold Iron Therapy',
      message: 'Iron therapy should be suspended during active infection.',
      recommendationType: 'urgent'
    };
  }

  // 3. Check Overload
  if (data.ferritin > 700 || data.tsat >= 40) {
    return {
      status: 'continue', // Proceed to ESA evaluation if iron is high but still anemic
      title: 'Iron Stores Sufficient / High',
      message: 'Iron parameters are above the upper limit for iron therapy.',
      details: [
        'Do NOT start iron.',
        'If currently on iron, withhold therapy.',
        'Proceed to investigate other causes (Stage 3).'
      ],
      recommendationType: 'info'
    };
  }

  // 4. Start Criteria based on Group
  let startIron = false;
  let route = '';
  let rationale = '';

  if (data.group === PatientGroup.HD) {
    // HD Group
    if (data.ferritin <= 500 && data.tsat <= 30) {
      startIron = true;
      route = 'Intravenous (IV) Iron';
      rationale = 'Standard for HD patients.';
    }
  } else {
    // Non-HD Groups (PD, ND-CKD)
    if (
      (data.ferritin < 100 && data.tsat < 40) ||
      (data.ferritin >= 100 && data.ferritin <= 300 && data.tsat < 25)
    ) {
      startIron = true;
      route = 'Oral or Intravenous Iron';
      rationale = 'Based on patient values and preferences. Switch to IV if oral is ineffective or not tolerated.';
    }
  }

  if (startIron) {
    return {
      status: 'action_required', // Means we found a treatment, but user might want to continue to see ESA options? Usually Iron is first.
      title: 'Start Iron Therapy',
      message: `Recommended Route: ${route}`,
      details: [
        rationale,
        `Monitor Hb, Ferritin, TSAT every ${data.group === PatientGroup.HD ? 'month' : '3 months'}.`
      ],
      recommendationType: 'treatment'
    };
  }

  return {
    status: 'continue',
    title: 'Iron Sufficient',
    message: 'Iron criteria for initiation not met. Proceed to Full Anemia Workup.',
    recommendationType: 'info'
  };
};

export const evaluateWorkup = (data: PatientState): DecisionResult => {
  // Check if any option is selected
  const hasSelection =
    data.workupAllNegative ||
    data.workupSmear ||
    data.workupHemolysis ||
    data.workupInflammation ||
    data.workupB12Folate ||
    data.workupLiver ||
    data.workupThyroid ||
    data.workupParathyroid ||
    data.workupMyeloma ||
    data.workupParasites;

  if (!hasSelection) {
    return {
      status: 'action_required',
      title: 'Perform Full Anemia Screening',
      message: 'Before diagnosing Renal Anemia, you must exclude other causes. Please perform the following tests and indicate results.',
      recommendationType: 'info'
    };
  }

  // If "All Negative" is selected
  if (data.workupAllNegative) {
    return {
      status: 'continue', // Proceed to ESA
      title: 'Diagnosis: Renal Anemia',
      message: 'Other causes excluded and iron stores adequate. Proceed to ESA/HIF-PHI evaluation.',
      recommendationType: 'treatment' // Green/Positive
    };
  }

  // If specific causes found
  const findings: string[] = [];
  if (data.workupSmear) findings.push('Peripheral blood smear abnormal: Refer to Hematology');
  if (data.workupHemolysis) findings.push('Hemolysis (Haptoglobin/LDH): Refer to Hematology');
  if (data.workupInflammation) findings.push('High CRP (Inflammation): Pursue and treat underlying disease');
  if (data.workupB12Folate) findings.push('B12/Folate Deficiency: Treat deficiency');
  if (data.workupLiver) findings.push('Liver Function abnormal: Refer to Hepatology');
  if (data.workupThyroid) findings.push('Thyroid dysfunction (TSH): Refer to Endocrinology');
  if (data.workupParathyroid) findings.push('Hyperparathyroidism (PTH): Treat hyperparathyroidism');
  if (data.workupMyeloma) findings.push('Myeloma suspicion (M-protein/Light chains): Refer to Oncology');
  if (data.workupParasites) findings.push('Parasites detected: Refer to Infectious Disease');

  return {
    status: 'stop',
    title: 'Treat Underlying Cause',
    message: 'Non-renal cause(s) identified. Address these issues before considering renal anemia treatment.',
    details: findings,
    recommendationType: 'urgent' // Red/Urgent
  };
};

export const evaluateESA = (data: PatientState): DecisionResult => {
  // Check Hb Threshold
  if (data.hb === '' || data.hb > 10) {
    return {
      status: 'stop',
      title: 'Observation Recommended',
      message: 'Hb is currently above the typical threshold for initiating ESA (> 10 g/dL).',
      details: ['Monitor Hb every 2-4 weeks.', 'Initiation is typically considered when Hb < 10 g/dL.'],
      recommendationType: 'info'
    };
  }

  // --- Priority 1: Tier 1 (Clinical History) ---

  // 1a. Absolute Hold
  if (data.currentStrokeOrThrombosis) {
    return {
      status: 'stop',
      title: 'HOLD THERAPY',
      message: 'Current stroke or thrombosis detected.',
      details: ['Hold ESA and HIF-PHI treatments immediately.', 'Re-evaluate after stabilization.'],
      recommendationType: 'urgent'
    };
  }

  // Identify Tier 1 Conditions favoring ESA (Safety / Contraindications for HIF-PHI)
  const tier1FavorESA: string[] = [];
  if (data.isPregnant) tier1FavorESA.push('Pregnancy');
  if (data.activeMalignancy) tier1FavorESA.push('Active malignancy');
  if (data.historyOfCancer) tier1FavorESA.push('History of cancer (not in complete remission for 2-5 yr)');
  if (data.polycysticKidneyDisease) tier1FavorESA.push('Polycystic kidney disease');
  if (data.proliferativeRetinalDisease) tier1FavorESA.push('Proliferative retinal disease');
  if (data.pulmonaryArterialHypertension) tier1FavorESA.push('Pulmonary arterial hypertension');
  if (data.hepaticImpairment) tier1FavorESA.push('Hepatic impairment');
  if (data.priorCVEvents) tier1FavorESA.push('Prior CV events (Stroke/MI)');
  if (data.priorThromboembolicEvents) tier1FavorESA.push('Prior thromboembolic events (DVT, vascular access thrombosis, PE)');

  // *** Conflict Check: ESA Intolerance AND Conditions favoring ESA ***
  // If patient cannot tolerate ESA but has conditions where HIF-PHI is cautioned against.
  if (data.esaIntolerance && tier1FavorESA.length > 0) {
    return {
      status: 'stop',
      title: 'Shared Decision Making (SDM)',
      message: 'Potential benefits and harms must be discussed carefully. Blood transfusion may be the only option.',
      details: [
        'Conflict Detected:',
        '- Patient has ESA Intolerance (contraindicates ESA).',
        '- Patient has conditions where HIF-PHI is typically not recommended:',
        ...tier1FavorESA.map(r => `  ** ${r}`),
        'Consider specialist consultation (Hematology/Nephrology).'
      ],
      recommendationType: 'urgent'
    };
  }

  // 1b. Favors ESA (Safety / Contraindications for HIF-PHI)
  if (tier1FavorESA.length > 0) {
    return {
      status: 'stop',
      title: 'Recommendation: ESA',
      message: 'Clinical history indicates ESA as the preferred choice.',
      details: [
        'Tier 1 Criteria (Favor ESA):',
        ...tier1FavorESA,
        'HIF-PHI is generally not recommended or requires caution in these conditions.',
        'Use lowest effective dose.'
      ],
      recommendationType: 'treatment'
    };
  }

  // 1c. Favors HIF-PHI (Intolerance to ESA)
  if (data.esaIntolerance) {
    return {
      status: 'stop',
      title: 'Recommendation: HIF-PHI',
      message: 'Clinical history (ESA Intolerance) indicates HIF-PHI as the preferred choice.',
      details: [
        'Tier 1 Criteria (Favor HIF-PHI):',
        'Cannot tolerate ESA (allergy, high BP, clotting)',
        'Monitor Hb every 2-4 weeks.'
      ],
      recommendationType: 'treatment'
    };
  }

  // --- Priority 2: Tier 2 (Clinical Preference / Status) ---
  const tier2Reasons: string[] = [];
  if (data.esaHyporesponsive) tier2Reasons.push('ESA Hyporesponsiveness');
  if (data.highCRP) tier2Reasons.push('High CRP (>0.3 mg/dl)');

  if (tier2Reasons.length > 0) {
    return {
      status: 'stop',
      title: 'Recommendation: HIF-PHI',
      message: 'Clinical status suggests HIF-PHI as the preferred alternative.',
      details: [
        'Tier 2 Criteria (Favor HIF-PHI):',
        ...tier2Reasons,
        'Discontinue if insufficient response after 3-4 months.',
        'Monitor Hb every 2-4 weeks.'
      ],
      recommendationType: 'treatment'
    };
  }

  // --- Priority 3: Tier 3 (Patient Preferences & Logistics) ---
  const tier3Reasons: string[] = [];
  if (data.preference === 'Oral') tier3Reasons.push('Patient prefers Oral medication');
  if (!data.accessToRefrigeration) tier3Reasons.push('No access to refrigeration');

  if (tier3Reasons.length > 0) {
    return {
      status: 'stop',
      title: 'Recommendation: HIF-PHI',
      message: 'Patient preferences or logistics favor HIF-PHI.',
      details: [
        'Tier 3 Criteria (Favor HIF-PHI):',
        ...tier3Reasons,
        'Discontinue if insufficient response after 3-4 months.'
      ],
      recommendationType: 'treatment'
    };
  }

  // --- Default ---
  return {
    status: 'stop',
    title: 'Recommendation: ESA',
    message: 'Standard First-line Therapy.',
    details: [
      'No specific Tier 1, 2, or 3 criteria triggered specific selection.',
      'ESA is the standard of care (IV/SC).',
      'Monitor Hb every 2-4 weeks.',
      'Do not maintain Hb >= 11.5 g/dL.'
    ],
    recommendationType: 'treatment'
  };
};