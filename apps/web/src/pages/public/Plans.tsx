import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Check, X, Tag, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Link } from 'react-router-dom';
import { formatINR } from '../../config/site';
import { usePlans, useSiteInfo } from '../../content/ContentContext';

export const Plans: React.FC = () => {
  const site = useSiteInfo();
  const plans = usePlans();
  const allFeatures = Array.from(new Set(plans.flatMap((p) => p.features)));
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

  const calculateFinal = (price: number) => {
    if (discountPercent > 0) {
      return Math.round(price * (1 - discountPercent / 100));
    }
    return price;
  };

  return (
    <>
      <Helmet>
        <title>{`Membership Plans & Pricing | ${site.fullName}`}</title>
        <meta name="description" content={`Choose the plan that fits your fitness journey at ${site.fullName}: ${plans.map((p) => `${p.title} ${formatINR(p.price)}`).join(', ')}.`} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">TRANSPARENT VALUE</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl break-words font-heading text-white tracking-wide uppercase mt-1">
            MEMBERSHIP <span className="text-gym-primary">plans</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Choose the plan that fits your fitness journey at {site.fullName}.
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const finalPrice = calculateFinal(p.price);
            return (
              <Card
                key={p.id}
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
                  <p className="text-xs text-gym-muted mt-1">{p.description}</p>
                  <div className="my-4">
                    {discountPercent > 0 && (
                      <span className="text-xs text-gym-muted line-through mr-2">{formatINR(p.price)}</span>
                    )}
                    <span className="text-4xl font-heading text-gym-primary">{formatINR(finalPrice)}</span>
                    {discountPercent > 0 && (
                      <span className="text-xs text-gym-success block font-heading">SAVED 20% WITH COUPON</span>
                    )}
                  </div>
                  <ul className="space-y-2 border-t border-gym-border pt-3">
                    {p.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-gym-muted">
                        <Check className="w-4 h-4 text-gym-success shrink-0" /> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link to="/login" className="w-full mt-6">
                  <Button variant={p.highlight ? 'primary' : 'secondary'} className="w-full">
                    Join Now
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
                  {plans.map((p) => (
                    <th key={p.id} className="p-4 text-center">{p.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {allFeatures.map((feature) => (
                  <tr key={feature} className="hover:bg-gym-surfaceHover/50">
                    <td className="p-4 font-medium text-white">{feature}</td>
                    {plans.map((p) => (
                      <td key={p.id} className="p-4 text-center">{renderCheck(p.features.includes(feature))}</td>
                    ))}
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
