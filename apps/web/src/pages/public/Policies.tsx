import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, FileText, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';

export const Policies: React.FC = () => {
  const [activeTab, setActiveTab] = useState('privacy');

  return (
    <>
      <Helmet>
        <title>Privacy Policy, Terms & Refund Policy | RV Fitness</title>
        <meta name="description" content="Read RV Fitness, Narsobawadi policies on user privacy, terms of service, membership freezing rules, and refund guidelines." />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-8">
        <div className="text-center">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">LEGAL & TRANSPARENCY</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl break-words font-heading text-white tracking-wide uppercase mt-1">
            GYM <span className="text-gym-primary">POLICIES</span>
          </h1>
        </div>

        <Tabs
          tabs={[
            { id: 'privacy', label: 'Privacy Policy' },
            { id: 'terms', label: 'Terms of Service' },
            { id: 'refund', label: 'Refund & Freeze Policy' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <Card className="text-gym-text text-sm leading-relaxed space-y-4 font-body border-gym-border">
          {activeTab === 'privacy' && (
            <>
              <h3 className="text-2xl font-heading text-white uppercase flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-gym-primary" /> PRIVACY POLICY
              </h3>
              <p>
                RV Fitness values your privacy. We collect personal information such as name, phone number, email address, and emergency contact details solely to manage gym memberships, process Razorpay transactions, and ensure safety on the premises.
              </p>
              <h4 className="text-lg font-heading text-white uppercase mt-4">Data Security & Third Parties</h4>
              <p>
                Your phone numbers and email addresses are never sold to third-party advertisers. All online payment data is encrypted and processed via Razorpay’s PCI-DSS compliant payment gateway.
              </p>
            </>
          )}

          {activeTab === 'terms' && (
            <>
              <h3 className="text-2xl font-heading text-white uppercase flex items-center gap-2">
                <FileText className="w-6 h-6 text-gym-primary" /> TERMS OF SERVICE
              </h3>
              <p>
                By accessing RV Fitness premises or using our online booking platform, members agree to adhere to the following rules:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gym-muted">
                <li>Proper athletic footwear and gym attire are mandatory on the exercise floor.</li>
                <li>Rerack all dumbbells and barbells after completing your sets.</li>
                <li>Wipe down machine seats after heavy use for hygiene protocol.</li>
                <li>Digital QR cards must be scanned at reception upon every check-in.</li>
              </ul>
            </>
          )}

          {activeTab === 'refund' && (
            <>
              <h3 className="text-2xl font-heading text-white uppercase flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-gym-primary" /> REFUND & MEMBERSHIP FREEZE POLICY
              </h3>
              <h4 className="text-lg font-heading text-white uppercase mt-2">Refund Policy</h4>
              <p>
                All membership purchases (Monthly, Six Month, Yearly) are non-refundable once activated. In cases of accidental double-payment, refunds are processed within 5-7 working days back to the original source account.
              </p>
              <h4 className="text-lg font-heading text-white uppercase mt-4">Freeze Request Policy</h4>
              <p>
                - <strong>Six Month and Yearly Plans</strong>: Freeze requests are reviewed by gym management on a case-by-case basis.<br />
                Requests must be submitted via the Member Portal or written application to gym management.
              </p>
            </>
          )}
        </Card>
      </div>
    </>
  );
};
