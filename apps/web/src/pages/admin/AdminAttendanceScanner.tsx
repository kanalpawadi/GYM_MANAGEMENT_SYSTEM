import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { QrCode, Search, CheckCircle2, XCircle, RefreshCw, UserCheck, ShieldAlert } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const AdminAttendanceScanner: React.FC = () => {
  const [manualInput, setManualInput] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  const handleSimulateScan = (status: 'active' | 'expired') => {
    if (status === 'active') {
      setScanResult({
        status: 'active',
        name: 'Rahul Sharma',
        memberId: 'RV-2026-8842',
        plan: 'Six Month Membership',
        daysLeft: 42,
        time: new Date().toLocaleTimeString(),
      });
    } else {
      setScanResult({
        status: 'expired',
        name: 'Karan Sharma',
        memberId: 'RV-2026-3312',
        plan: 'Monthly',
        daysLeft: 0,
        time: new Date().toLocaleTimeString(),
      });
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.includes('9876543210') || manualInput.toLowerCase().includes('rahul')) {
      handleSimulateScan('active');
    } else {
      handleSimulateScan('expired');
    }
  };

  return (
    <>
      <Helmet>
        <title>Reception Attendance Scanner | RV Fitness Admin</title>
      </Helmet>

      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">FRONT DESK TERMINAL</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            ATTENDANCE <span className="text-gym-primary">QR SCANNER</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Scanner Simulation Box */}
          <Card className="md:col-span-6 border-2 border-gym-primary bg-gym-surface flex flex-col items-center text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-gym-primary/10 text-gym-primary flex items-center justify-center mb-4">
              <QrCode className="w-10 h-10 animate-pulse" />
            </div>

            <h3 className="text-2xl font-heading text-white uppercase mb-2">WEBCAM SCANNER ACTIVE</h3>
            <p className="text-xs text-gym-muted mb-6">
              Position member's digital QR pass in front of camera sensor.
            </p>

            <div className="flex flex-col gap-2 w-full">
              <Button variant="primary" onClick={() => handleSimulateScan('active')}>
                ⚡ Simulate Scanning Active Pass (Green)
              </Button>
              <Button variant="danger" onClick={() => handleSimulateScan('expired')}>
                ⚡ Simulate Scanning Expired Pass (Red)
              </Button>
            </div>
          </Card>

          {/* Manual Search */}
          <Card className="md:col-span-6 border-gym-border bg-gym-surface">
            <h3 className="text-xl font-heading text-white uppercase mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-gym-primary" /> MANUAL PHONE / NAME CHECK-IN
            </h3>
            <form onSubmit={handleManualSearch} className="flex flex-col gap-4">
              <Input
                placeholder="Enter 10-digit mobile or member name..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                required
              />
              <Button type="submit" variant="outline">
                Lookup & Check-In
              </Button>
            </form>
          </Card>
        </div>

        {/* Scan Result Screen */}
        {scanResult && (
          <div
            className={`p-8 rounded-2xl border-4 shadow-2xl transition-all ${
              scanResult.status === 'active'
                ? 'bg-gym-success/20 border-gym-success text-white'
                : 'bg-gym-danger/20 border-gym-danger text-white'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="flex items-center gap-4">
                {scanResult.status === 'active' ? (
                  <CheckCircle2 className="w-16 h-16 text-gym-success shrink-0" />
                ) : (
                  <XCircle className="w-16 h-16 text-gym-danger shrink-0" />
                )}
                <div>
                  <span className="text-xs font-heading tracking-widest uppercase">
                    {scanResult.status === 'active' ? 'ENTRY PERMITTED' : 'ENTRY DENIED'}
                  </span>
                  <h2 className="text-3xl font-heading uppercase">{scanResult.name}</h2>
                  <p className="text-sm font-medium">
                    ID: {scanResult.memberId} | Plan: {scanResult.plan}
                  </p>
                </div>
              </div>

              <div className="text-center sm:text-right">
                {scanResult.status === 'active' ? (
                  <span className="text-2xl font-heading text-gym-success block uppercase">
                    WELCOME! ({scanResult.daysLeft} DAYS REMAINING)
                  </span>
                ) : (
                  <span className="text-2xl font-heading text-gym-danger block uppercase">
                    EXPIRED MEMBERSHIP (RENEW REQUIRED)
                  </span>
                )}
                <span className="text-xs text-gym-muted block mt-1">Check-in Logged @ {scanResult.time}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
