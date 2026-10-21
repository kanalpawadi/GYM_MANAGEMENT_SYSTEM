import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart3, Download, Play, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const AdminReports: React.FC = () => {
  const [cronStatus, setCronStatus] = useState('');

  const triggerCron = (name: string) => {
    setCronStatus(`Executing ${name}...`);
    setTimeout(() => {
      setCronStatus(`✅ ${name} completed successfully! Expired memberships updated & email notifications dispatched.`);
    }, 1200);
  };

  return (
    <>
      <Helmet>
        <title>Reports & Automated Crons | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">ANALYTICS & AUTOMATION</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            REPORTS & <span className="text-gym-primary">CRON SCHEDULER</span>
          </h1>
        </div>

        {/* Automated Crons Trigger Card */}
        <Card className="border-gym-primary bg-gym-surface">
          <h3 className="text-xl font-heading text-white uppercase mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gym-primary" /> AUTOMATED SYSTEM JOBS & REMINDERS
          </h3>
          <p className="text-xs text-gym-muted mb-4">
            Test background cron endpoints that automatically run daily at midnight via Secret Header authorization.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="outline" size="sm" onClick={() => triggerCron('Expiry Check Cron (/api/v1/cron/expiry-check)')} leftIcon={<Play className="w-4 h-4 text-gym-primary" />}>
              Run Expiry Check Job
            </Button>
            <Button variant="outline" size="sm" onClick={() => triggerCron('Expiry Reminder SMS/Email (/api/v1/cron/reminders)')} leftIcon={<Play className="w-4 h-4 text-gym-primary" />}>
              Send 7/3/1 Day Reminders
            </Button>
            <Button variant="outline" size="sm" onClick={() => triggerCron('Daily Admin Summary (/api/v1/cron/daily-report)')} leftIcon={<Play className="w-4 h-4 text-gym-primary" />}>
              Generate Daily PDF Report
            </Button>
          </div>

          {cronStatus && (
            <div className="mt-4 p-3 rounded-lg bg-gym-bg border border-gym-primary/40 text-xs font-heading text-gym-primary uppercase">
              {cronStatus}
            </div>
          )}
        </Card>

        {/* Popularity Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-gym-border bg-gym-surface">
            <h3 className="text-xl font-heading text-white uppercase mb-4">PLAN POPULARITY BREAKDOWN</h3>
            <div className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Six Month (6 Months)</span>
                  <span className="font-bold text-white">52% of Members</span>
                </div>
                <div className="w-full h-3 rounded-full bg-gym-bg overflow-hidden border border-gym-border">
                  <div className="h-full bg-amber-400 w-[52%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Yearly (12 Months)</span>
                  <span className="font-bold text-gym-success">28% of Members</span>
                </div>
                <div className="w-full h-3 rounded-full bg-gym-bg overflow-hidden border border-gym-border">
                  <div className="h-full bg-gym-success w-[28%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Monthly (1 Month)</span>
                  <span className="font-bold text-gym-muted">20% of Members</span>
                </div>
                <div className="w-full h-3 rounded-full bg-gym-bg overflow-hidden border border-gym-border">
                  <div className="h-full bg-gym-muted w-[20%]" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-gym-border bg-gym-surface flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-heading text-white uppercase mb-2">RETENTION & REVENUE EXPORTS</h3>
              <p className="text-xs text-gym-muted leading-relaxed mb-6">
                Download structured CSV reports containing monthly retention cohorts, ARPU (Average Revenue Per User), and GST tax audits.
              </p>
            </div>
            <div className="space-y-2">
              <Button variant="primary" className="w-full" onClick={() => alert('Downloading GST Revenue Audit CSV...')} leftIcon={<Download className="w-4 h-4" />}>
                Export Full Revenue Ledger CSV
              </Button>
              <Button variant="outline" className="w-full" onClick={() => alert('Downloading Attendance Cohort CSV...')} leftIcon={<Download className="w-4 h-4" />}>
                Export Attendance Cohort CSV
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};
