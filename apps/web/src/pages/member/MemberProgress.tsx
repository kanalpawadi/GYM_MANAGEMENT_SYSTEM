import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Activity, Plus, TrendingDown, Scale } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const MemberProgress: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const [history, setHistory] = useState([
    { date: 'Jul 1', weight: 78.0, bodyFat: 22.5 },
    { date: 'Aug 1', weight: 76.5, bodyFat: 20.8 },
    { date: 'Sep 1', weight: 75.2, bodyFat: 19.5 },
    { date: 'Oct 1', weight: 74.5, bodyFat: 18.2 },
  ]);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    const newEntry = {
      date: 'Today',
      weight: Number(weight),
      bodyFat: bodyFat ? Number(bodyFat) : 18.0,
    };
    setHistory([...history, newEntry]);
    setShowModal(false);
    setWeight('');
    setBodyFat('');
  };

  return (
    <>
      <Helmet>
        <title>Body Metrics & Progress Tracker | RV-Fitness Gym</title>
      </Helmet>

      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">BODY COMPOSITION AUDIT</span>
            <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
              PROGRESS <span className="text-gym-primary">TRACKER</span>
            </h1>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Log New Measurement
          </Button>
        </div>

        {/* Progress Line Chart Card */}
        <Card className="border-gym-border bg-gym-surface p-6">
          <h3 className="text-xl font-heading text-white uppercase mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gym-primary" /> WEIGHT LOSS TREND (KG)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" />
                <XAxis dataKey="date" stroke="#B3B3B3" fontSize={12} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#B3B3B3" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#FFD400', borderRadius: '8px' }}
                  itemStyle={{ color: '#FFD400' }}
                />
                <Line type="monotone" dataKey="weight" stroke="#FFD400" strokeWidth={3} dot={{ r: 6, fill: '#FFD400' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Historical Logs List */}
        <Card className="border-gym-border bg-gym-surface p-0 overflow-hidden">
          <div className="p-4 border-b border-gym-border">
            <h3 className="text-lg font-heading text-white uppercase">MEASUREMENT HISTORY LOG</h3>
          </div>
          <div className="divide-y divide-gym-border text-sm">
            {history.map((log, idx) => (
              <div key={idx} className="p-4 flex justify-between items-center hover:bg-gym-surfaceHover/50">
                <div>
                  <span className="font-heading text-white uppercase text-base">{log.date}</span>
                  <span className="text-xs text-gym-muted block">InBody Scan Result</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-heading text-gym-primary">{log.weight} KG</span>
                  <span className="text-xs text-gym-muted block">{log.bodyFat}% Body Fat</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Add Metric Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="LOG BODY MEASUREMENT">
          <form onSubmit={handleAddLog} className="flex flex-col gap-4">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              placeholder="e.g. 74.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
            <Input
              label="Body Fat Percentage (%)"
              type="number"
              step="0.1"
              placeholder="e.g. 18.2"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
            <Button type="submit" variant="primary" className="mt-2">
              Save Log
            </Button>
          </form>
        </Modal>
      </div>
    </>
  );
};
