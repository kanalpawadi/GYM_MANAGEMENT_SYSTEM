import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Check, X, Tag, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Link } from 'react-router-dom';

export const Plans: React.FC = () => {
  const [coupon, setCoupon] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (coupon.trim().toUpperCase() === 'RVFIT20') {
      setDiscountPercent(20);
      setCouponMessage('🎉 Coupon RVFIT20 Applied! 20% Discount Activated.');
    } else {
      setDiscountPercent(0);
      setCouponMessage('❌ Invalid coupon code. Try code: RVFIT20');
    }
  };

  const plans = [
    {
      title: 'Monthly Starter',
      months: 1,
      basePrice: 1499,
      originalPrice: 1999,
      badge: 'Starter',
      highlight: false,
    },
    {
      title: 'Quarterly Fit',
      months: 3,
      basePrice: 3999,
      originalPrice: 4999,
      badge: 'Most Popular',
      highlight: true,
    },
    {
      title: 'Half-Yearly Pro',
      months: 6,
      basePrice: 6999,
      originalPrice: 8999,
      badge: 'Best Value',
      highlight: false,
    },
    {
      title: 'Annual Elite',
      months: 12,
      basePrice: 11999,
      originalPrice: 15999,
      badge: 'VIP Privileges',
      highlight: false,
    },
  ];

  const calculateFinal = (price: number) => {
    if (discountPercent > 0) {
      return Math.round(price * (1 - discountPercent / 100));
    }
    return price;
  };

  return (
    <>
      <Helmet>
        <title>Membership Plans & Pricing | RV-Fitness Gym</title>
        <meta name="description" content="View RV-Fitness Gym membership plans: Monthly, Quarterly, Half-Yearly, and Annual Elite with zero hidden fees." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">TRANSPARENT VALUE</span>
          <h1 className="text-5xl font-heading text-white tracking-wide uppercase mt-1">
            MEMBERSHIP <span className="text-gym-primary">PACKAGES</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            No lock-in traps or hidden maintenance fees. All memberships include full gym floor access, locker rooms, and certified trainer orientation.
          </p>
        </div>

        {/* Coupon Bar */}
        <Card className="max-w-xl mx-auto w-full bg-gym-surface/80 border-gym-primary/40">
          <form onSubmit={handleApplyCoupon} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <Input
                placeholder="Have a coupon? Enter RVFIT20"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                leftIcon={<Tag className="w-4 h-4" />}
              />
            </div>
            <Button type="submit" variant="primary" size="md" className="w-full sm:w-auto">
              Apply Code
            </Button>
          </form>
          {couponMessage && (
            <p className={`text-xs font-medium mt-2 text-center ${discountPercent > 0 ? 'text-gym-success' : 'text-gym-danger'}`}>
              {couponMessage}
            </p>
          )}
        </Card>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p, idx) => {
            const finalPrice = calculateFinal(p.basePrice);
            return (
              <Card
                key={idx}
                className={`flex flex-col justify-between relative ${
                  p.highlight ? 'border-gym-primary shadow-yellow-lg bg-gym-surface' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-heading bg-gym-primary/20 text-gym-primary px-2.5 py-0.5 rounded-full border border-gym-primary/40 uppercase">
                      {p.badge}
                    </span>
                    <span className="text-xs text-gym-muted">{p.months} Month{p.months > 1 ? 's' : ''}</span>
                  </div>
                  <h3 className="text-2xl font-heading text-white uppercase">{p.title}</h3>
                  <div className="my-4">
                    <span className="text-xs text-gym-muted line-through mr-2">₹{p.originalPrice}</span>
                    <span className="text-4xl font-heading text-gym-primary">₹{finalPrice}</span>
                    {discountPercent > 0 && (
                      <span className="text-xs text-gym-success block font-heading">SAVED 20% WITH COUPON</span>
                    )}
                    <span className="text-xs text-gym-muted font-body"> + 18% GST</span>
                  </div>
                  <p className="text-xs text-gym-muted border-t border-gym-border pt-3">
                    Billed as ₹{finalPrice} upfront for full {p.months} month duration.
                  </p>
                </div>
                <Link to="/login" className="w-full mt-6">
                  <Button variant={p.highlight ? 'primary' : 'secondary'} className="w-full">
                    Proceed to Join
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-8 border border-gym-border rounded-2xl overflow-hidden bg-gym-surface">
          <div className="p-6 border-b border-gym-border bg-gym-bg/60">
            <h3 className="text-2xl font-heading text-white uppercase flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gym-primary" /> DETAILED PLAN FEATURE COMPARISON
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gym-text">
              <thead className="bg-gym-surfaceHover text-gym-primary font-heading text-base uppercase border-b border-gym-border">
                <tr>
                  <th className="p-4">Feature</th>
                  <th className="p-4 text-center">Monthly</th>
                  <th className="p-4 text-center">Quarterly</th>
                  <th className="p-4 text-center">Half-Yearly</th>
                  <th className="p-4 text-center">Annual Elite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {[
                  { name: 'Full Gym & Strength Floor Access', m: true, q: true, h: true, a: true },
                  { name: 'Locker & Hygiene Shower Access', m: true, q: true, h: true, a: true },
                  { name: 'General Trainer Orientation', m: true, q: true, h: true, a: true },
                  { name: 'Group Yoga & Zumba Classes', m: false, q: true, h: true, a: true },
                  { name: 'Complimentary PT Sessions', m: false, q: '2 Sessions', h: '3 Sessions', a: '5 Sessions' },
                  { name: 'Steam Sauna Bath Access', m: false, q: '2x / Month', h: '4x / Month', a: 'Unlimited' },
                  { name: 'Membership Freeze Privilege', m: false, q: false, h: 'Up to 15 Days', a: 'Up to 30 Days' },
                  { name: 'Free RV Merchandise T-Shirt', m: false, q: false, h: true, a: true },
                  { name: 'Dedicated Personal Locker', m: false, q: false, h: false, a: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gym-surfaceHover/50">
                    <td className="p-4 font-medium text-white">{row.name}</td>
                    <td className="p-4 text-center">{renderCheck(row.m)}</td>
                    <td className="p-4 text-center">{renderCheck(row.q)}</td>
                    <td className="p-4 text-center">{renderCheck(row.h)}</td>
                    <td className="p-4 text-center">{renderCheck(row.a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

function renderCheck(val: boolean | string) {
  if (typeof val === 'boolean') {
    return val ? (
      <Check className="w-5 h-5 text-gym-success mx-auto" />
    ) : (
      <X className="w-5 h-5 text-gym-muted/40 mx-auto" />
    );
  }
  return <span className="text-xs font-heading text-gym-primary uppercase">{val}</span>;
}
