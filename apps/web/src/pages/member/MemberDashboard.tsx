import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Flame, Clock, Calendar, QrCode, CreditCard, Award, ArrowRight, BookOpen, Activity, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';

export const MemberDashboard: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Member Dashboard | RV Fitness</title>
      </Helmet>

      <div className="flex flex-col gap-8">
        {/* KPI Overview Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-gym-primary/40 bg-gradient-to-br from-gym-surface via-gym-surface to-gym-primary/10">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-heading text-gym-muted uppercase">ACTIVE MEMBERSHIP</span>
                <h3 className="text-2xl font-heading text-gym-primary uppercase mt-1">Six Month</h3>
                <p className="text-xs text-gym-success font-medium mt-1">Ends Nov 18, 2026 (42 Days Left)</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gym-primary/20 text-gym-primary flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="border-amber-500/40 bg-gradient-to-br from-gym-surface via-gym-surface to-amber-500/10">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-heading text-gym-muted uppercase">ATTENDANCE STREAK</span>
                <h3 className="text-2xl font-heading text-amber-400 uppercase mt-1 flex items-center gap-1.5">
                  <Flame className="w-6 h-6 text-amber-400 fill-amber-400" /> 14 DAYS
                </h3>
                <p className="text-xs text-gym-muted mt-1">18 Workouts logged this month</p>
              </div>
            </div>
          </Card>

          <Card className="border-gym-border">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-heading text-gym-muted uppercase">NEXT UPCOMING CLASS</span>
                <h3 className="text-xl font-heading text-white uppercase mt-1">CrossFit Shred</h3>
                <p className="text-xs text-gym-primary font-medium mt-1">Tomorrow @ 07:30 AM (Studio B)</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gym-surfaceHover text-gym-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="border-gym-border">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-heading text-gym-muted uppercase">BODY WEIGHT LOGGED</span>
                <h3 className="text-2xl font-heading text-white uppercase mt-1">74.5 KG</h3>
                <p className="text-xs text-gym-success font-medium mt-1">-3.5 kg down since join date!</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gym-surfaceHover text-gym-primary flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Check-in QR Banner & Recommended Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Quick QR Card */}
          <Card className="lg:col-span-5 border-gym-primary flex flex-col items-center text-center p-6 bg-gym-surface">
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest mb-1">RECEPTION ENTRY PASS</span>
            <h4 className="text-xl font-heading text-white uppercase mb-4">DIGITAL MEMBERSHIP CARD</h4>

            <div className="bg-white p-4 rounded-xl shadow-yellow-glow border-4 border-gym-primary mb-4">
              <QRCodeSVG
                value={`RV_MEMBER_TOKEN_8842_${Date.now()}`}
                size={160}
                bgColor="#FFFFFF"
                fgColor="#0A0A0A"
                level="H"
              />
            </div>

            <span className="text-xs font-heading text-gym-muted uppercase">MEMBER CODE: <strong className="text-gym-primary font-bold">RV-2026-8842</strong></span>
            <p className="text-[11px] text-gym-muted mt-2">
              Scan at reception scanner terminal for automatic check-in.
            </p>
          </Card>

          {/* Right Quick Actions & Announcements */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card className="flex-1 border-gym-border flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-heading text-white uppercase mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gym-primary" /> QUICK MEMBER ACTIONS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link to="/portal/checkout">
                    <div className="p-4 rounded-xl bg-gym-bg border border-gym-border hover:border-gym-primary transition-all flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gym-primary/20 text-gym-primary flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading text-base text-white uppercase">Renew Membership</h4>
                        <p className="text-xs text-gym-muted">Apply coupon & pay via UPI</p>
                      </div>
                    </div>
                  </Link>

                  <Link to="/portal/classes">
                    <div className="p-4 rounded-xl bg-gym-bg border border-gym-border hover:border-gym-primary transition-all flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gym-primary/20 text-gym-primary flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading text-base text-white uppercase">Book Class Spot</h4>
                        <p className="text-xs text-gym-muted">Zumba, Yoga, CrossFit</p>
                      </div>
                    </div>
                  </Link>

                  <Link to="/portal/progress">
                    <div className="p-4 rounded-xl bg-gym-bg border border-gym-border hover:border-gym-primary transition-all flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gym-primary/20 text-gym-primary flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading text-base text-white uppercase">Log Weight & Fat</h4>
                        <p className="text-xs text-gym-muted">Track progress line chart</p>
                      </div>
                    </div>
                  </Link>

                  <Link to="/portal/payments">
                    <div className="p-4 rounded-xl bg-gym-bg border border-gym-border hover:border-gym-primary transition-all flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gym-primary/20 text-gym-primary flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading text-base text-white uppercase">Download Invoices</h4>
                        <p className="text-xs text-gym-muted">GST receipts PDF format</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gym-border bg-gym-bg/60 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs font-heading text-gym-primary uppercase">ANNOUNCEMENT</span>
                  <p className="text-xs text-white">Diwali Special Bootcamp Starts Next Week! Register at front desk.</p>
                </div>
                <Link to="/schedule">
                  <Button variant="outline" size="sm">Details</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};
