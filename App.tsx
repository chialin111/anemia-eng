import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft, 
  Droplet, 
  FileText,
  Syringe, 
  Pill,
  Info,
  Calculator,
  ArrowDownCircle,
  XCircle,
  Stethoscope,
  Thermometer,
  ShieldAlert
} from 'lucide-react';
import { PatientGroup, Gender, Stage, PatientState, DecisionResult } from './types';
import { 
  evaluateScreening, 
  evaluateIronTherapy, 
  evaluateWorkup, 
  evaluateESA 
} from './utils/decisionEngine';

// --- Reusable Components (Optimized for Design) ---

const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Label = ({ children, icon }: { children?: React.ReactNode, icon?: React.ReactNode }) => (
  <label className="block text-base font-bold text-slate-700 mb-2 flex items-center gap-2">
    {icon && <span className="text-indigo-500">{icon}</span>}
    {children}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="relative group">
    <input
      {...props}
      className="w-full px-4 py-3.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 group-hover:border-indigo-200"
    />
  </div>
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative group">
    <select
      {...props}
      className="w-full px-4 py-3.5 text-base bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer group-hover:border-indigo-200"
    />
    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
      <ChevronRight className="w-5 h-5 text-indigo-400 rotate-90" />
    </div>
  </div>
);

const Checkbox = ({ label, checked, onChange, variant = 'default' }: { label: string, checked: boolean, onChange: (c: boolean) => void, variant?: 'default' | 'danger' | 'success' }) => {
  // Lively but professional color palette
  let activeClass = 'bg-indigo-50 border-indigo-500 shadow-sm shadow-indigo-100';
  let iconClass = 'bg-indigo-600 border-indigo-600';
  let textClass = 'text-indigo-900';

  if (variant === 'danger') {
    activeClass = 'bg-rose-50 border-rose-500 shadow-sm shadow-rose-100';
    iconClass = 'bg-rose-500 border-rose-500';
    textClass = 'text-rose-900';
  } else if (variant === 'success') {
    activeClass = 'bg-teal-50 border-teal-500 shadow-sm shadow-teal-100';
    iconClass = 'bg-teal-500 border-teal-500';
    textClass = 'text-teal-900';
  }

  return (
    <div 
      className={`flex items-start md:items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 group
        ${checked ? activeClass : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-sm'}`}
      onClick={() => onChange(!checked)}
    >
      <div className={`mt-0.5 md:mt-0 w-6 h-6 rounded-md border flex items-center justify-center mr-4 shrink-0 transition-all duration-300 
        ${checked ? iconClass : 'border-slate-300 bg-slate-50 group-hover:border-indigo-400'}`}>
        {checked && <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />}
      </div>
      <span className={`text-base font-medium leading-relaxed transition-colors ${checked ? textClass : 'text-slate-600 group-hover:text-slate-900'}`}>{label}</span>
    </div>
  );
};

const ResultBox = ({ result }: { result: DecisionResult | null }) => {
  if (!result) return null;

  const styles = {
    urgent: 'bg-rose-50 border-l-[6px] border-rose-500 text-rose-900',
    treatment: 'bg-teal-50 border-l-[6px] border-teal-500 text-teal-900',
    info: 'bg-sky-50 border-l-[6px] border-sky-500 text-sky-900',
  };

  const iconContainerStyles = {
    urgent: 'bg-rose-100 text-rose-600',
    treatment: 'bg-teal-100 text-teal-600',
    info: 'bg-sky-100 text-sky-600',
  };

  const type = result.recommendationType || 'info';
  
  return (
    <div className={`p-6 md:p-8 rounded-r-2xl shadow-sm flex flex-col md:flex-row gap-6 ${styles[type]} mt-10 animate-fade-in`}>
      <div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center ${iconContainerStyles[type]} shadow-inner`}>
        {type === 'urgent' && <AlertTriangle className="w-7 h-7" strokeWidth={2.5} />}
        {type === 'treatment' && <CheckCircle className="w-7 h-7" strokeWidth={2.5} />}
        {type === 'info' && <Info className="w-7 h-7" strokeWidth={2.5} />}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-2xl mb-3 tracking-tight">{result.title}</h4>
        <p className="mb-5 text-lg leading-relaxed font-medium opacity-90">{result.message}</p>
        {result.details && result.details.length > 0 && (
          <ul className="space-y-3 text-base mt-4 bg-white/50 p-5 rounded-xl border border-black/5">
            {result.details.map((d, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 w-2 h-2 rounded-full bg-current opacity-60 shrink-0 block" />
                <span className="leading-relaxed font-medium">{d}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

const initialPatientState: PatientState = {
  group: null,
  gender: null,
  hb: '',
  ferritin: '',
  tsat: '',
  serumIron: '',
  tibc: '',
  hasActiveInfection: false,
  workupAllNegative: false,
  workupSmear: false,
  workupHemolysis: false,
  workupInflammation: false,
  workupB12Folate: false,
  workupLiver: false,
  workupThyroid: false,
  workupParathyroid: false,
  workupMyeloma: false,
  workupParasites: false,
  currentStrokeOrThrombosis: false,
  isPregnant: false,
  activeMalignancy: false,
  historyOfCancer: false,
  polycysticKidneyDisease: false,
  proliferativeRetinalDisease: false,
  pulmonaryArterialHypertension: false,
  hepaticImpairment: false,
  priorCVEvents: false,
  priorThromboembolicEvents: false,
  esaIntolerance: false,
  esaHyporesponsive: false,
  highCRP: false,
  accessToRefrigeration: true,
  preference: null,
};

export default function App() {
  const [stage, setStage] = useState<Stage>(Stage.Screening);
  const [patient, setPatient] = useState<PatientState>(initialPatientState);
  const [recommendation, setRecommendation] = useState<DecisionResult | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  
  const [esaStep, setEsaStep] = useState(1);
  const tier2Ref = useRef<HTMLDivElement>(null);
  const tier3Ref = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const stages = [
    { id: Stage.Screening, label: 'Screening' },
    { id: Stage.IronTherapy, label: 'Iron Status' },
    { id: Stage.FullWorkup, label: 'Workup' },
    { id: Stage.ESAManagement, label: 'ESA/HIF-PHI' },
  ];

  const updatePatient = (field: keyof PatientState, value: any) => {
    setPatient(prev => ({ ...prev, [field]: value }));
    setRecommendation(null);
  };

  const toggleWorkupItem = (field: keyof PatientState, value: boolean) => {
    setPatient(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'workupAllNegative' && value === true) {
        newState.workupSmear = false;
        newState.workupHemolysis = false;
        newState.workupInflammation = false;
        newState.workupB12Folate = false;
        newState.workupLiver = false;
        newState.workupThyroid = false;
        newState.workupParathyroid = false;
        newState.workupMyeloma = false;
        newState.workupParasites = false;
      }
      if (field !== 'workupAllNegative' && value === true) {
        newState.workupAllNegative = false;
      }
      return newState;
    });
    setRecommendation(null);

    // Auto-advance if "All Negative" is checked (Diagnosis confirmed)
    if (field === 'workupAllNegative' && value === true) {
      setTimeout(() => {
        setRecommendation(null);
        setStage(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 600);
    }
  };

  const handleCalculatorUpdate = (field: 'serumIron' | 'tibc', value: any) => {
    const numValue = value === '' ? '' : parseFloat(value);
    const currentIron = field === 'serumIron' ? numValue : patient.serumIron;
    const currentTibc = field === 'tibc' ? numValue : patient.tibc;
    let newTsat = patient.tsat;
    
    if (currentIron !== '' && currentTibc !== '' && currentTibc !== 0) {
      newTsat = Math.round(((currentIron as number) / (currentTibc as number)) * 100);
    }

    setPatient(prev => ({
      ...prev,
      [field]: numValue,
      tsat: newTsat
    }));
    setRecommendation(null);
  };

  const handleNext = () => {
    setRecommendation(null);
    setStage(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setRecommendation(null);
    setStage(prev => Math.max(1, prev - 1));
  };

  useEffect(() => {
    let result: DecisionResult | null = null;
    switch (stage) {
      case Stage.Screening:
        if (patient.hb !== '' && patient.gender) result = evaluateScreening(patient);
        break;
      case Stage.IronTherapy:
        if (patient.ferritin !== '' && patient.tsat !== '' && patient.group) result = evaluateIronTherapy(patient);
        break;
      case Stage.FullWorkup:
        result = evaluateWorkup(patient);
        break;
      case Stage.ESAManagement:
        if (patient.hb !== '') result = evaluateESA(patient);
        break;
    }
    setRecommendation(result);
  }, [patient, stage]);

  useEffect(() => {
    if (stage === Stage.ESAManagement) setEsaStep(1);
  }, [stage]);

  useEffect(() => {
    if (stage === Stage.ESAManagement) {
      if (esaStep === 2) setTimeout(() => tier2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      if (esaStep === 3) setTimeout(() => tier3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      if (esaStep === 4) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [esaStep, stage]);

  const canProceed = () => {
    if (recommendation?.status === 'stop') return false;
    if (stage === Stage.Screening && (!patient.hb || !patient.gender || !patient.group)) return false;
    if (stage === Stage.IronTherapy && (patient.tsat === '' || patient.ferritin === '')) return false;
    if (stage === Stage.FullWorkup) {
      const hasSelection = patient.workupAllNegative || 
        patient.workupSmear || patient.workupHemolysis || patient.workupInflammation ||
        patient.workupB12Folate || patient.workupLiver || patient.workupThyroid ||
        patient.workupParathyroid || patient.workupMyeloma || patient.workupParasites;
      if (!hasSelection) return false;
      return true;
    }
    if (stage === Stage.ESAManagement) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-100/50 text-slate-800 pb-20 font-sans text-base">
      {/* Header - Vibrant Gradient */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white p-8 shadow-xl relative overflow-hidden">
        {/* Decorative Background Circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-white/10 blur-2xl"></div>
        
        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-4 tracking-tight drop-shadow-sm">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <Activity className="w-8 h-8 md:w-10 md:h-10 text-cyan-300" />
              </div>
              KDIGO Anemia Manager
            </h1>
            <p className="text-indigo-100 text-lg mt-3 font-medium opacity-90 ml-1">Clinical Decision Support System</p>
          </div>
          <div className="hidden md:block text-sm text-cyan-100 border border-white/20 bg-white/10 px-5 py-2.5 rounded-full font-semibold backdrop-blur-md shadow-sm">
            v1.0 • Guidelines Based
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto mt-10 px-4 md:px-6">
        
        {/* Progress Stepper - Optimized Visuals */}
        <div className="mb-14 flex justify-between items-center relative px-2 md:px-8">
          <div className="absolute top-1/2 left-0 w-full h-1.5 bg-slate-200 -z-0 rounded-full"></div>
          {stages.map((s, idx) => {
            const isActive = stage === s.id;
            const isPast = stage > s.id;
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl transition-all duration-300 shadow-md
                  ${isActive ? 'bg-indigo-600 text-white shadow-indigo-200 scale-110 ring-4 ring-indigo-50 rotate-3' : 
                    isPast ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-100' : 'bg-white text-slate-300 border-2 border-slate-100'}
                `}>
                  {isPast ? <CheckCircle className="w-7 h-7" /> : s.id}
                </div>
                <span className={`text-sm mt-3 font-bold uppercase tracking-wide transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Dynamic Stage Content */}
        <Card className="p-6 md:p-12 animate-fade-in-up border-t-[8px] border-t-indigo-500">
          
          {/* STAGE 1: SCREENING */}
          {stage === Stage.Screening && (
            <div className="space-y-10">
              <div className="border-b border-slate-100 pb-6 mb-2">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-sky-100 rounded-xl text-sky-600">
                        <Droplet className="w-8 h-8" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">Initial Assessment</h2>
                </div>
                <p className="text-slate-500 text-lg pl-1">Patient demographics and initial blood work.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <Label>Patient Group</Label>
                  <Select 
                    value={patient.group || ''} 
                    onChange={(e) => updatePatient('group', e.target.value as PatientGroup)}
                  >
                    <option value="" disabled>Select Group...</option>
                    {Object.values(PatientGroup).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Sex</Label>
                  <Select 
                    value={patient.gender || ''} 
                    onChange={(e) => updatePatient('gender', e.target.value as Gender)}
                  >
                    <option value="" disabled>Select Sex...</option>
                    {Object.values(Gender).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-1">
                  <Label icon={<Thermometer className="w-4 h-4" />}>Hemoglobin (Hb) [g/dL]</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 10.5" 
                    value={patient.hb} 
                    onChange={(e) => updatePatient('hb', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: IRON THERAPY */}
          {stage === Stage.IronTherapy && (
            <div className="space-y-10">
              <div className="border-b border-slate-100 pb-6 mb-2">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <Syringe className="w-8 h-8" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">Iron Therapy</h2>
                </div>
                <p className="text-slate-500 text-lg pl-1">Evaluate iron stores and eligibility for supplementation.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                 <div>
                  <Label>Ferritin [ng/ml]</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 50" 
                    value={patient.ferritin} 
                    onChange={(e) => updatePatient('ferritin', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                  />
                </div>
                 <div>
                  <Label>TSAT (Transferrin Saturation) [%]</Label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 20" 
                    value={patient.tsat} 
                    onChange={(e) => updatePatient('tsat', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                  />
                </div>
                
                {/* TSAT Calculator Section */}
                <div className="md:col-span-2">
                   <button 
                     type="button"
                     onClick={() => setShowCalculator(!showCalculator)}
                     className="flex items-center text-base font-bold text-indigo-600 hover:text-indigo-800 transition-all mb-4 group bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg"
                   >
                     <Calculator className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                     {showCalculator ? 'Hide Calculator' : 'Calculate TSAT from Serum Iron & TIBC'}
                   </button>
                   
                   {showCalculator && (
                     <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 grid grid-cols-2 gap-6 animate-fade-in shadow-inner">
                        <div className="col-span-2 text-slate-500 text-sm mb-1 flex items-center gap-2 font-medium">
                          <Info className="w-4 h-4 text-indigo-400" /> Formula: TSAT = (Serum Iron / TIBC) × 100
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2">Serum Iron [µg/dL]</label>
                          <Input 
                            type="number" 
                            placeholder="e.g. 60"
                            value={patient.serumIron}
                            onChange={(e) => handleCalculatorUpdate('serumIron', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2">TIBC [µg/dL]</label>
                          <Input 
                            type="number" 
                            placeholder="e.g. 300"
                            value={patient.tibc}
                            onChange={(e) => handleCalculatorUpdate('tibc', e.target.value)}
                          />
                        </div>
                     </div>
                   )}
                </div>

                <div className="flex flex-col justify-end md:col-span-2 mt-2">
                   <Checkbox 
                    label="Patient has Active Infection?"
                    checked={patient.hasActiveInfection}
                    onChange={(val) => updatePatient('hasActiveInfection', val)}
                    variant="danger"
                  />
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-100 p-5 rounded-2xl text-base text-sky-800 flex items-center gap-3 shadow-sm">
                <div className="bg-sky-200 p-1.5 rounded-full shrink-0">
                    <Info className="w-5 h-5 text-sky-700" />
                </div>
                <span><span className="font-bold">Context:</span> {patient.group} • Hb {patient.hb} g/dL</span>
              </div>
            </div>
          )}

          {/* STAGE 3: FULL WORKUP */}
          {stage === Stage.FullWorkup && (
            <div className="space-y-10">
              <div className="border-b border-slate-100 pb-6 mb-2">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-violet-100 rounded-xl text-violet-600">
                        <Stethoscope className="w-8 h-8" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">Comprehensive Workup</h2>
                </div>
                <p className="text-slate-500 text-lg pl-1">Check all findings. If none apply, select "All negative".</p>
              </div>

              <div className="space-y-6">
                 {/* Success Case */}
                 <Checkbox 
                  variant="success"
                  label="All negative (no other cause found) → Diagnosis: Renal Anemia"
                  checked={patient.workupAllNegative}
                  onChange={(val) => toggleWorkupItem('workupAllNegative', val)}
                />
                
                {/* Separator */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-slate-400 uppercase tracking-widest font-extrabold">Or indicate positive findings</span>
                  </div>
                </div>

                {/* Positive Findings */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Checkbox 
                    label="Peripheral blood smear abnormal"
                    checked={patient.workupSmear}
                    onChange={(val) => toggleWorkupItem('workupSmear', val)}
                    variant="danger"
                  />
                  <Checkbox 
                    label="Haptoglobin & LDH abnormal (Hemolysis)"
                    checked={patient.workupHemolysis}
                    onChange={(val) => toggleWorkupItem('workupHemolysis', val)}
                    variant="danger"
                  />
                  <Checkbox 
                    label="High CRP (Inflammation)"
                    checked={patient.workupInflammation}
                    onChange={(val) => toggleWorkupItem('workupInflammation', val)}
                    variant="danger"
                  />
                  <Checkbox 
                    label="Vitamin B12 or Folate Deficiency"
                    checked={patient.workupB12Folate}
                    onChange={(val) => toggleWorkupItem('workupB12Folate', val)}
                    variant="danger"
                  />
                  <Checkbox 
                    label="Liver Function abnormal"
                    checked={patient.workupLiver}
                    onChange={(val) => toggleWorkupItem('workupLiver', val)}
                    variant="danger"
                  />
                  <Checkbox 
                    label="TSH abnormal (Thyroid)"
                    checked={patient.workupThyroid}
                    onChange={(val) => toggleWorkupItem('workupThyroid', val)}
                    variant="danger"
                  />
                  <Checkbox 
                    label="High PTH (Hyperparathyroidism)"
                    checked={patient.workupParathyroid}
                    onChange={(val) => toggleWorkupItem('workupParathyroid', val)}
                    variant="danger"
                  />
                  <Checkbox 
                    label="M-protein/Light chains detected"
                    checked={patient.workupMyeloma}
                    onChange={(val) => toggleWorkupItem('workupMyeloma', val)}
                    variant="danger"
                  />
                  <Checkbox 
                    label="Parasites detected (if indicated)"
                    checked={patient.workupParasites}
                    onChange={(val) => toggleWorkupItem('workupParasites', val)}
                    variant="danger"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: ESA / HIF-PHI */}
          {stage === Stage.ESAManagement && (
            <div className="space-y-10">
              <div className="border-b border-slate-100 pb-6 mb-2">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-teal-100 rounded-xl text-teal-600">
                        <Pill className="w-8 h-8" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">ESA & HIF-PHI</h2>
                </div>
                <p className="text-slate-500 text-lg pl-1">Tiered assessment for medication selection.</p>
              </div>

              <div className="space-y-12">
                
                {/* Tier 1 */}
                <div className="bg-rose-50/50 p-6 md:p-8 rounded-2xl border border-rose-100 animate-fade-in shadow-sm">
                   <h3 className="text-2xl font-bold text-rose-800 mb-2 flex items-center gap-3">
                     <div className="bg-rose-200 p-1.5 rounded-lg"><ShieldAlert className="w-6 h-6 text-rose-700"/></div>
                     Tier 1: Major Clinical Factors
                   </h3>
                   <p className="text-sm text-rose-600/80 mb-6 font-bold uppercase tracking-wide ml-12">Contraindications & Safety</p>
                   
                   <div className="grid md:grid-cols-2 gap-4 ml-1">
                      <Checkbox 
                        label="Current Stroke or Thrombosis"
                        checked={patient.currentStrokeOrThrombosis}
                        onChange={(val) => updatePatient('currentStrokeOrThrombosis', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Pregnancy"
                        checked={patient.isPregnant}
                        onChange={(val) => updatePatient('isPregnant', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Cannot tolerate ESA (allergy, HTN)"
                        checked={patient.esaIntolerance}
                        onChange={(val) => updatePatient('esaIntolerance', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Active Malignancy"
                        checked={patient.activeMalignancy}
                        onChange={(val) => updatePatient('activeMalignancy', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="History of Cancer (< 5yr remission)"
                        checked={patient.historyOfCancer}
                        onChange={(val) => updatePatient('historyOfCancer', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Polycystic Kidney Disease"
                        checked={patient.polycysticKidneyDisease}
                        onChange={(val) => updatePatient('polycysticKidneyDisease', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Proliferative Retinal Disease"
                        checked={patient.proliferativeRetinalDisease}
                        onChange={(val) => updatePatient('proliferativeRetinalDisease', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Pulmonary Arterial Hypertension"
                        checked={patient.pulmonaryArterialHypertension}
                        onChange={(val) => updatePatient('pulmonaryArterialHypertension', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Hepatic Impairment"
                        checked={patient.hepaticImpairment}
                        onChange={(val) => updatePatient('hepaticImpairment', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Prior CV Events (Stroke/MI)"
                        checked={patient.priorCVEvents}
                        onChange={(val) => updatePatient('priorCVEvents', val)}
                        variant="danger"
                      />
                      <Checkbox 
                        label="Prior Thromboembolic Events"
                        checked={patient.priorThromboembolicEvents}
                        onChange={(val) => updatePatient('priorThromboembolicEvents', val)}
                        variant="danger"
                      />
                   </div>
                   
                   {esaStep === 1 && (
                     <div className="mt-8 flex justify-end">
                       <button
                        onClick={() => setEsaStep(2)}
                        className="bg-gradient-to-r from-rose-500 to-red-600 text-white px-8 py-3.5 rounded-xl text-base font-bold hover:shadow-lg hover:shadow-rose-200 transition-all flex items-center gap-2 hover:-translate-y-1"
                       >
                         Next: Clinical Status <ArrowDownCircle className="w-5 h-5" />
                       </button>
                     </div>
                   )}
                </div>

                {/* Tier 2 */}
                {esaStep >= 2 && (
                  <div ref={tier2Ref} className="bg-indigo-50/50 p-6 md:p-8 rounded-2xl border border-indigo-100 animate-fade-in shadow-sm">
                     <h3 className="text-2xl font-bold text-indigo-800 mb-2 flex items-center gap-3">
                       <div className="bg-indigo-200 p-1.5 rounded-lg"><Activity className="w-6 h-6 text-indigo-700"/></div>
                       Tier 2: Clinical Status
                     </h3>
                     <p className="text-sm text-indigo-600/80 mb-6 font-bold uppercase tracking-wide ml-12">Responsiveness & Inflammation</p>
                     <div className="grid md:grid-cols-2 gap-4 ml-1">
                        <Checkbox 
                          label="ESA Hyporesponsiveness"
                          checked={patient.esaHyporesponsive}
                          onChange={(val) => updatePatient('esaHyporesponsive', val)}
                        />
                        <Checkbox 
                          label="High CRP (> 0.3 mg/dl)"
                          checked={patient.highCRP}
                          onChange={(val) => updatePatient('highCRP', val)}
                        />
                     </div>
                     {esaStep === 2 && (
                       <div className="mt-8 flex justify-end">
                         <button
                          onClick={() => setEsaStep(3)}
                          className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-8 py-3.5 rounded-xl text-base font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 hover:-translate-y-1"
                         >
                           Next: Preferences <ArrowDownCircle className="w-5 h-5" />
                         </button>
                       </div>
                     )}
                  </div>
                )}

                {/* Tier 3 */}
                {esaStep >= 3 && (
                  <div ref={tier3Ref} className="bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-200 animate-fade-in shadow-sm">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                      <div className="bg-slate-200 p-1.5 rounded-lg"><FileText className="w-6 h-6 text-slate-700"/></div>
                      Tier 3: Logistics
                    </h3>
                     <p className="text-sm text-slate-500 mb-6 font-bold uppercase tracking-wide ml-12">Patient Preferences</p>
                    <div className="grid md:grid-cols-2 gap-4 ml-1">
                       <Checkbox 
                          label="No access to refrigeration"
                          checked={patient.accessToRefrigeration === false}
                          onChange={(val) => updatePatient('accessToRefrigeration', !val)}
                        />
                        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
                          <Label>Preferred Route:</Label>
                          <div className="flex gap-3">
                            <button
                              className={`px-6 py-2.5 text-base font-bold rounded-lg border-2 transition-all ${patient.preference === 'Oral' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
                              onClick={() => updatePatient('preference', 'Oral')}
                            >
                              Oral
                            </button>
                            <button
                              className={`px-6 py-2.5 text-base font-bold rounded-lg border-2 transition-all ${patient.preference === 'Injection' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
                              onClick={() => updatePatient('preference', 'Injection')}
                            >
                              Injection
                            </button>
                          </div>
                        </div>
                    </div>
                    {esaStep === 3 && (
                       <div className="mt-8 flex justify-end">
                         <button
                          onClick={() => setEsaStep(4)}
                          className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-10 py-4 rounded-xl text-lg font-bold hover:shadow-xl hover:shadow-teal-200 transition-all flex items-center gap-3 hover:-translate-y-1"
                         >
                           Generate Recommendation <CheckCircle className="w-6 h-6" />
                         </button>
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RECOMMENDATION DISPLAY */}
          <div ref={resultRef}>
            {(stage !== Stage.ESAManagement || esaStep === 4) && <ResultBox result={recommendation} />}
          </div>

          {/* ACTION BUTTONS */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center">
             <button
              onClick={handleBack}
              disabled={stage === 1}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-base transition-colors ${stage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-700'}`}
             >
               <ChevronLeft className="w-5 h-5" /> Back
             </button>

             {/* Standard Next Button */}
             {recommendation?.status !== 'stop' && stage !== Stage.ESAManagement && (
               <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-10 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg
                  ${!canProceed() 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-indigo-200 hover:-translate-y-1'}
                `}
               >
                 Next Step <ChevronRight className="w-6 h-6" />
               </button>
             )}
          </div>

        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 mt-20 mb-12 text-center text-slate-500 text-sm font-medium">
        <p className="mb-2">© 2026 KDIGO Guideline Tool. This application is for educational and clinical support purposes only.</p>
        <p className="mb-8 opacity-80">Always verify with official KDIGO Clinical Practice Guidelines for Anemia in CKD.</p>
        
        <div className="border-t border-slate-200/60 pt-8 max-w-2xl mx-auto">
            <p className="uppercase tracking-widest text-xs font-bold text-slate-400 mb-4">Key References</p>
            <ul className="space-y-3 text-slate-500 text-xs md:text-sm opacity-90">
                <li>1. Kidney International (2026) 109 (Suppl 1S): S1–S99</li>
                <li>2. Nephrology Dialysis Transplantation (2024) 39(10):1710-1730</li>
            </ul>
        </div>
      </footer>
    </div>
  );
}