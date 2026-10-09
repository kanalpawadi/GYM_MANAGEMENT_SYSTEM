import React, { useState } from 'react';
import { Calculator, Activity, Flame, Scale } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';

export const FitnessCalculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState('bmi');

  // BMI State
  const [bmiHeight, setBmiHeight] = useState<number | ''>(175);
  const [bmiWeight, setBmiWeight] = useState<number | ''>(70);
  const [bmiResult, setBmiResult] = useState<{ score: number; status: string; color: string } | null>(null);

  // TDEE State
  const [tdeeAge, setTdeeAge] = useState<number | ''>(25);
  const [tdeeGender, setTdeeGender] = useState('male');
  const [tdeeHeight, setTdeeHeight] = useState<number | ''>(175);
  const [tdeeWeight, setTdeeWeight] = useState<number | ''>(70);
  const [tdeeActivity, setTdeeActivity] = useState('1.375');
  const [tdeeResult, setTdeeResult] = useState<{ maintenance: number; loss: number; gain: number } | null>(null);

  // Body Fat State
  const [bfGender, setBfGender] = useState('male');
  const [bfWaist, setBfWaist] = useState<number | ''>(85);
  const [bfNeck, setBfNeck] = useState<number | ''>(38);
  const [bfHip, setBfHip] = useState<number | ''>(95);
  const [bfHeight, setBfHeight] = useState<number | ''>(175);
  const [bfResult, setBfResult] = useState<{ percentage: number; category: string } | null>(null);

  // Ideal Weight State
  const [iwGender, setIwGender] = useState('male');
  const [iwHeight, setIwHeight] = useState<number | ''>(175);
  const [iwResult, setIwResult] = useState<{ min: number; max: number } | null>(null);

  // Handlers
  const calculateBMI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bmiHeight || !bmiWeight) return;
    const hMeters = Number(bmiHeight) / 100;
    const score = Number((Number(bmiWeight) / (hMeters * hMeters)).toFixed(1));
    let status = 'Normal Weight';
    let color = 'text-gym-success';

    if (score < 18.5) {
      status = 'Underweight';
      color = 'text-amber-400';
    } else if (score >= 25 && score < 29.9) {
      status = 'Overweight';
      color = 'text-amber-400';
    } else if (score >= 30) {
      status = 'Obese';
      color = 'text-gym-danger';
    }
    setBmiResult({ score, status, color });
  };

  const calculateTDEE = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tdeeAge || !tdeeHeight || !tdeeWeight) return;
    const w = Number(tdeeWeight);
    const h = Number(tdeeHeight);
    const a = Number(tdeeAge);
    const mult = Number(tdeeActivity);

    // BMR Mifflin-St Jeor
    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr = tdeeGender === 'male' ? bmr + 5 : bmr - 161;

    const maintenance = Math.round(bmr * mult);
    setTdeeResult({
      maintenance,
      loss: Math.round(maintenance - 500),
      gain: Math.round(maintenance + 400),
    });
  };

  const calculateBodyFat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bfHeight || !bfWaist || !bfNeck) return;
    const h = Number(bfHeight);
    const w = Number(bfWaist);
    const n = Number(bfNeck);
    const hp = Number(bfHip);

    let percentage = 0;
    if (bfGender === 'male') {
      percentage = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
    } else {
      percentage = 495 / (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.22100 * Math.log10(h)) - 450;
    }
    percentage = Math.max(3, Math.min(50, Number(percentage.toFixed(1))));

    let category = 'Fitness Standard';
    if (percentage < 10) category = 'Essential / Athlete';
    else if (percentage >= 25) category = 'Higher Body Fat';

    setBfResult({ percentage, category });
  };

  const calculateIdealWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iwHeight) return;
    const hCm = Number(iwHeight);
    const hInches = hCm / 2.54;
    const inchesOver5ft = Math.max(0, hInches - 60);

    let baseWeight = iwGender === 'male' ? 50 : 45.5;
    const idealKg = baseWeight + (2.3 * inchesOver5ft);
    const min = Math.round(idealKg * 0.9);
    const max = Math.round(idealKg * 1.1);

    setIwResult({ min, max });
  };

  return (
    <Card className="max-w-4xl mx-auto border-gym-primary/30">
      <div className="text-center mb-6">
        <h3 className="text-3xl font-heading text-white tracking-wide uppercase flex items-center justify-center gap-2">
          <Calculator className="w-7 h-7 text-gym-primary" /> FIT<span className="text-gym-primary">CALCULATORS</span>
        </h3>
        <p className="text-sm text-gym-muted">
          Scientifically precise fitness indicators to help you map your transformation goals.
        </p>
      </div>

      <Tabs
        tabs={[
          { id: 'bmi', label: 'BMI Calculator' },
          { id: 'tdee', label: 'TDEE / Calories' },
          { id: 'bodyfat', label: 'Body Fat %' },
          { id: 'ideal', label: 'Ideal Weight' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-8"
      />

      {/* BMI TAB */}
      {activeTab === 'bmi' && (
        <form onSubmit={calculateBMI} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <Input
              label="Height (cm)"
              type="number"
              value={bmiHeight}
              onChange={(e) => setBmiHeight(e.target.value ? Number(e.target.value) : '')}
              required
            />
            <Input
              label="Weight (kg)"
              type="number"
              value={bmiWeight}
              onChange={(e) => setBmiWeight(e.target.value ? Number(e.target.value) : '')}
              required
            />
            <Button type="submit" variant="primary" leftIcon={<Scale className="w-4 h-4" />}>
              Calculate BMI
            </Button>
          </div>
          <div className="bg-gym-bg border border-gym-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
            {bmiResult ? (
              <>
                <span className="text-xs text-gym-muted font-heading uppercase tracking-widest">YOUR BMI SCORE</span>
                <span className={`text-5xl font-heading my-2 ${bmiResult.color}`}>{bmiResult.score}</span>
                <span className="text-lg font-heading text-white uppercase">{bmiResult.status}</span>
                <p className="text-xs text-gym-muted mt-3">
                  Normal range: 18.5 - 24.9. Join RV-Fitness to reach your optimal weight zone!
                </p>
              </>
            ) : (
              <p className="text-sm text-gym-muted">Enter your metrics and press calculate to view your BMI result.</p>
            )}
          </div>
        </form>
      )}

      {/* TDEE TAB */}
      {activeTab === 'tdee' && (
        <form onSubmit={calculateTDEE} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Gender"
                options={[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                ]}
                value={tdeeGender}
                onChange={(e) => setTdeeGender(e.target.value)}
              />
              <Input
                label="Age (Years)"
                type="number"
                value={tdeeAge}
                onChange={(e) => setTdeeAge(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Height (cm)"
                type="number"
                value={tdeeHeight}
                onChange={(e) => setTdeeHeight(e.target.value ? Number(e.target.value) : '')}
                required
              />
              <Input
                label="Weight (kg)"
                type="number"
                value={tdeeWeight}
                onChange={(e) => setTdeeWeight(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>
            <Select
              label="Activity Level"
              options={[
                { label: 'Sedentary (Office job)', value: '1.2' },
                { label: 'Lightly Active (1-3 days/wk)', value: '1.375' },
                { label: 'Moderately Active (3-5 days/wk)', value: '1.55' },
                { label: 'Very Active (6-7 days/wk)', value: '1.725' },
              ]}
              value={tdeeActivity}
              onChange={(e) => setTdeeActivity(e.target.value)}
            />
            <Button type="submit" variant="primary" leftIcon={<Flame className="w-4 h-4" />}>
              Calculate Calories
            </Button>
          </div>
          <div className="bg-gym-bg border border-gym-border rounded-xl p-6 flex flex-col justify-center">
            {tdeeResult ? (
              <div className="space-y-4">
                <div className="bg-gym-surface p-3 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-gym-muted">Maintenance Calories</span>
                  <span className="text-xl font-heading text-gym-primary">{tdeeResult.maintenance} kcal/day</span>
                </div>
                <div className="bg-gym-surface p-3 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-gym-muted">Weight Loss (-0.5 kg/wk)</span>
                  <span className="text-xl font-heading text-gym-success">{tdeeResult.loss} kcal/day</span>
                </div>
                <div className="bg-gym-surface p-3 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-gym-muted">Muscle Gain (+0.25 kg/wk)</span>
                  <span className="text-xl font-heading text-amber-400">{tdeeResult.gain} kcal/day</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gym-muted text-center">Fill in details to calculate daily energy expenditure.</p>
            )}
          </div>
        </form>
      )}

      {/* BODY FAT TAB */}
      {activeTab === 'bodyfat' && (
        <form onSubmit={calculateBodyFat} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <Select
              label="Gender"
              options={[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
              ]}
              value={bfGender}
              onChange={(e) => setBfGender(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Height (cm)"
                type="number"
                value={bfHeight}
                onChange={(e) => setBfHeight(e.target.value ? Number(e.target.value) : '')}
                required
              />
              <Input
                label="Waist (cm)"
                type="number"
                value={bfWaist}
                onChange={(e) => setBfWaist(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Neck (cm)"
                type="number"
                value={bfNeck}
                onChange={(e) => setBfNeck(e.target.value ? Number(e.target.value) : '')}
                required
              />
              {bfGender === 'female' && (
                <Input
                  label="Hip (cm)"
                  type="number"
                  value={bfHip}
                  onChange={(e) => setBfHip(e.target.value ? Number(e.target.value) : '')}
                  required
                />
              )}
            </div>
            <Button type="submit" variant="primary" leftIcon={<Activity className="w-4 h-4" />}>
              Estimate Body Fat
            </Button>
          </div>
          <div className="bg-gym-bg border border-gym-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
            {bfResult ? (
              <>
                <span className="text-xs text-gym-muted font-heading uppercase tracking-widest">BODY FAT ESTIMATE</span>
                <span className="text-5xl font-heading text-gym-primary my-2">{bfResult.percentage}%</span>
                <span className="text-lg font-heading text-white uppercase">{bfResult.category}</span>
              </>
            ) : (
              <p className="text-sm text-gym-muted">Enter waist and neck circumferences for a US Navy formula estimate.</p>
            )}
          </div>
        </form>
      )}

      {/* IDEAL WEIGHT TAB */}
      {activeTab === 'ideal' && (
        <form onSubmit={calculateIdealWeight} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <Select
              label="Gender"
              options={[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
              ]}
              value={iwGender}
              onChange={(e) => setIwGender(e.target.value)}
            />
            <Input
              label="Height (cm)"
              type="number"
              value={iwHeight}
              onChange={(e) => setIwHeight(e.target.value ? Number(e.target.value) : '')}
              required
            />
            <Button type="submit" variant="primary" leftIcon={<Scale className="w-4 h-4" />}>
              Calculate Ideal Weight
            </Button>
          </div>
          <div className="bg-gym-bg border border-gym-border rounded-xl p-6 flex flex-col items-center justify-center text-center">
            {iwResult ? (
              <>
                <span className="text-xs text-gym-muted font-heading uppercase tracking-widest">IDEAL WEIGHT RANGE</span>
                <span className="text-4xl font-heading text-gym-primary my-3">
                  {iwResult.min} - {iwResult.max} kg
                </span>
                <p className="text-xs text-gym-muted">
                  Based on Devine & Robinson clinical formulas for optimal bone density and organ health.
                </p>
              </>
            ) : (
              <p className="text-sm text-gym-muted">Enter your height to find your recommended healthy body weight range.</p>
            )}
          </div>
        </form>
      )}
    </Card>
  );
};
