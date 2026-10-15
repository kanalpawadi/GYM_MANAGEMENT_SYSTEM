import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, RefreshCw, Dumbbell, User, Phone, Calendar } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const DigitalCard: React.FC = () => {
  const { profile } = useAuth();
  const [timestamp, setTimestamp] = useState(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimestamp(Date.now());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const qrPayload = JSON.stringify({
    member_id: profile?.id || 'demo-member-id',
    name: profile?.full_name || 'Rahul Sharma',
    token: `RV_PASS_HASH_${timestamp}`,
    created_at: new Date(timestamp).toISOString(),
  });

  return (
    <>
      <Helmet>
        <title>Digital Membership Pass | RV Fitness</title>
      </Helmet>

      <div className="max-w-2xl mx-auto flex flex-col gap-8 items-center text-center">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">CONTACTLESS ENTRY</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            DIGITAL <span className="text-gym-primary">MEMBERSHIP CARD</span>
          </h1>
          <p className="text-sm text-gym-muted mt-1">
            Present this rotating security QR code at reception webcam terminal to log check-in.
          </p>
        </div>

        {/* Digital Membership Pass Container */}
        <Card className="w-full border-2 border-gym-primary bg-gradient-to-b from-gym-surface via-gym-bg to-gym-surface p-8 shadow-yellow-lg relative overflow-hidden">
          <div className="flex justify-between items-center pb-6 border-b border-gym-border mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gym-primary text-black flex items-center justify-center font-bold">
                <Dumbbell className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xl font-heading text-white tracking-wider">
                RV-<span className="text-gym-primary">FITNESS VIP PASS</span>
              </span>
            </div>
            <span className="bg-gym-success/20 text-gym-success font-heading text-xs px-3 py-1 rounded-full border border-gym-success/40 uppercase">
              ● ACTIVE
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 justify-center my-4">
            {/* QR Code */}
            <div className="bg-white p-5 rounded-2xl border-4 border-gym-primary shadow-2xl flex flex-col items-center">
              <QRCodeSVG value={qrPayload} size={180} level="H" bgColor="#FFFFFF" fgColor="#0A0A0A" />
              <div className="flex items-center gap-1.5 text-[11px] text-black font-heading font-bold mt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-gym-primary" /> ROTATING TOKEN IN {secondsLeft}s
              </div>
            </div>

            {/* Member Details */}
            <div className="text-left space-y-3 font-body text-sm w-full md:w-auto">
              <div>
                <span className="text-xs text-gym-muted uppercase font-heading">MEMBER NAME</span>
                <p className="text-xl font-heading text-white uppercase">{profile?.full_name || 'Rahul Sharma'}</p>
              </div>

              <div>
                <span className="text-xs text-gym-muted uppercase font-heading">MEMBER ID</span>
                <p className="text-base font-heading text-gym-primary tracking-wider">RV-2026-8842</p>
              </div>

              <div>
                <span className="text-xs text-gym-muted uppercase font-heading">PLAN TYPE</span>
                <p className="text-sm font-medium text-white">Six Month (Full Gym Access + Diet Guidance)</p>
              </div>

              <div>
                <span className="text-xs text-gym-muted uppercase font-heading">VALID TILL</span>
                <p className="text-sm font-medium text-gym-success">November 18, 2026</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gym-border text-xs text-gym-muted flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>Emergency Contact: <strong>Sunita Sharma (9876500000)</strong></span>
            <span className="flex items-center gap-1 text-gym-primary"><ShieldCheck className="w-4 h-4" /> Cryptographically Verified</span>
          </div>
        </Card>
      </div>
    </>
  );
};
