import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Users, UserPlus, Clock, DollarSign, QrCode, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const revenueData = [
    { month: 'May', revenue: 210000, checkins: 1420 },
    { month: 'Jun', revenue: 245000, checkins: 1650 },
    { month: 'Jul', revenue: 280000, checkins: 1890 },
    { month: 'Aug', revenue: 310000, checkins: 2100 },
    { month: 'Sep', revenue: 325000, checkins: 2250 },
    { month: 'Oct', revenue: 342500, checkins: 2480 },
  ];

  return (
    <>
      <Helmet>
        <title>Admin Overview KPIs | RV Fitness</title>
      </Helmet>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">EXECUTIVE OVERVIEW</span>
            <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
              GYM MANAGEMENT <span className="text-gym-primary">METRICS</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/members">
              <Button variant="outline" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                Add New Member
              </Button>
            </Link>
            <Link to="/admin/attendance">
              <Button variant="primary" size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
                QR Scanner Terminal
              </Button>
            </Link>
          </div>
        </div>

        {/* Top 5 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-gym-primary/40 bg-gym-surface">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-heading text-gym-muted uppercase">ACTIVE MEMBERS</span>
                <h3 className="text-3xl font-heading text-gym-primary mt-1">1,248</h3>
                <span className="text-[11px] text-gym-success font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +12% vs last month
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gym-primary/20 text-gym-primary flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="border-gym-border bg-gym-surface">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-heading text-gym-muted uppercase">NEW JOINS (OCT)</span>
                <h3 className="text-3xl font-heading text-white mt-1">142</h3>
                <span className="text-[11px] text-gym-success font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +8% target
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gym-surfaceHover text-gym-primary flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="border-amber-500/40 bg-gym-surface">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-heading text-gym-muted uppercase">EXPIRING IN 7 DAYS</span>
                <h3 className="text-3xl font-heading text-amber-400 mt-1">18</h3>
                <span className="text-[11px] text-amber-400 font-medium">Auto SMS alert queued</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="border-gym-success/40 bg-gym-surface">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-heading text-gym-muted uppercase">MONTHLY REVENUE</span>
                <h3 className="text-3xl font-heading text-gym-success mt-1">₹3,42,500</h3>
                <span className="text-[11px] text-gym-success font-medium">GST Invoices Verified</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gym-success/20 text-gym-success flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="border-gym-border bg-gym-surface">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-heading text-gym-muted uppercase">TODAY'S CHECK-INS</span>
                <h3 className="text-3xl font-heading text-white mt-1">186</h3>
                <span className="text-[11px] text-gym-muted">Peak hours: 6-8 PM</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gym-surfaceHover text-gym-primary flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts & Quick Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Revenue Growth Bar Chart */}
          <Card className="lg:col-span-8 border-gym-border bg-gym-surface p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gym-primary" /> MONTHLY REVENUE TREND (INR)
                </h3>
                <p className="text-xs text-gym-muted">Gross membership sales including 18% GST tax</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" />
                  <XAxis dataKey="month" stroke="#B3B3B3" fontSize={12} />
                  <YAxis stroke="#B3B3B3" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#FFD400', borderRadius: '8px' }}
                    itemStyle={{ color: '#FFD400' }}
                  />
                  <Bar dataKey="revenue" fill="#FFD400" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Quick Expiring Members Alert Box */}
          <Card className="lg:col-span-4 border-amber-500/40 bg-gym-surface flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-heading text-amber-400 uppercase mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" /> EXPIRING MEMBERSHIPS
              </h3>
              <div className="space-y-3 text-xs">
                {[
                  { name: 'Karan Sharma', plan: 'Monthly', phone: '9876543210', days: 2 },
                  { name: 'Neha Gupta', plan: 'Six Month', phone: '9876511111', days: 3 },
                  { name: 'Vikramaditya S', plan: 'Yearly', phone: '9876522222', days: 5 },
                ].map((m, i) => (
                  <div key={i} className="p-3 rounded-lg bg-gym-bg border border-gym-border flex justify-between items-center">
                    <div>
                      <h4 className="font-heading text-white text-sm uppercase">{m.name}</h4>
                      <p className="text-gym-muted">{m.plan} | {m.phone}</p>
                    </div>
                    <span className="text-amber-400 font-heading text-xs bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                      {m.days} DAYS LEFT
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Link to="/admin/members" className="w-full mt-4">
              <Button variant="outline" size="sm" className="w-full">
                View All Expiring Members
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
};
