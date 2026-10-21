import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CreditCard, Check, Tag, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SITE, formatINR } from '../../config/site';
import { usePlans } from '../../content/ContentContext';

export const MembershipCheckout: React.FC = () => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('six-month');
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [successPaid, setSuccessPaid] = useState<any>(null);

  const plans = usePlans().map((p) => ({ ...p, basePrice: p.price }));

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim().toUpperCase() === 'RVFIT20') {
      const disc = Math.round(currentPlan.basePrice * 0.2);
      setDiscountAmount(disc);
      setCouponMsg('🎉 RVFIT20 applied! 20% discount added.');
    } else if (couponCode.trim().toUpperCase() === 'FLAT500') {
      setDiscountAmount(500);
      setCouponMsg('🎉 FLAT500 applied! ₹500 discount added.');
    } else {
      setDiscountAmount(0);
      setCouponMsg('❌ Invalid coupon code. Try RVFIT20 or FLAT500.');
    }
  };

  const netPrice = Math.max(0, currentPlan.basePrice - discountAmount);
  const gstAmount = Math.round(netPrice * SITE.gstRate);
  const totalPayable = netPrice + gstAmount;

  const handleRazorpayCheckout = () => {
    setLoading(true);

    // Simulate Razorpay SDK popup & server order verification
    setTimeout(() => {
      setLoading(false);
      setSuccessPaid({
        order_id: `rzp_order_${Date.now()}`,
        payment_id: `pay_${Math.random().toString(36).substring(2, 10)}`,
        invoice_no: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        plan_title: currentPlan.title,
        amount: totalPayable,
        date: new Date().toLocaleDateString(),
      });
    }, 1500);
  };

  return (
    <>
      <Helmet>
        <title>Buy & Renew Membership | RV Fitness</title>
      </Helmet>

      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">MEMBERSHIP CHECKOUT</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            RENEW OR JOIN <span className="text-gym-primary">NOW</span>
          </h1>
        </div>

        {successPaid ? (
          <Card className="border-gym-success bg-gym-surface p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-gym-success mx-auto" />
            <h2 className="text-3xl font-heading text-white uppercase">PAYMENT SUCCESSFUL & MEMBERSHIP ACTIVATED!</h2>
            <p className="text-sm text-gym-muted">
              Thank you! Your payment of <strong>₹{successPaid.amount}</strong> was verified. Your invoice <strong>{successPaid.invoice_no}</strong> has been sent to your email.
            </p>
            <div className="bg-gym-bg border border-gym-border p-4 rounded-xl text-xs space-y-1 max-w-md mx-auto text-left">
              <p>Razorpay Payment ID: <strong className="text-gym-primary">{successPaid.payment_id}</strong></p>
              <p>Invoice Number: <strong className="text-white">{successPaid.invoice_no}</strong></p>
              <p>Activated Plan: <strong className="text-white">{successPaid.plan_title}</strong></p>
            </div>
            <Button variant="primary" onClick={() => setSuccessPaid(null)}>
              Back to Dashboard
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Plan Selector Column */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <span className="text-xs font-heading text-gym-primary uppercase">1. SELECT PACKAGES</span>
              <div className="space-y-3">
                {plans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setDiscountAmount(0);
                        setCouponMsg('');
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-gym-primary bg-gym-primary/10 shadow-yellow-glow'
                          : 'border-gym-border bg-gym-surface hover:border-gym-primary/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-heading text-white uppercase">{plan.title}</h4>
                          {plan.badge && (
                            <span className="text-[10px] bg-gold-gradient text-black font-heading px-2 py-0.5 rounded font-bold uppercase">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gym-muted">{plan.months} Month{plan.months > 1 ? 's' : ''} Full Access</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-heading text-gym-primary">{formatINR(plan.basePrice)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Form */}
              <Card className="mt-2 border-gym-border">
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <Input
                    placeholder="Enter Coupon (RVFIT20 / FLAT500)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    leftIcon={<Tag className="w-4 h-4" />}
                  />
                  <Button type="submit" variant="outline" size="sm">Apply</Button>
                </form>
                {couponMsg && (
                  <p className={`text-xs mt-2 ${discountAmount > 0 ? 'text-gym-success' : 'text-gym-danger'}`}>
                    {couponMsg}
                  </p>
                )}
              </Card>
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-5">
              <Card className="border-gym-primary/40 bg-gym-surface space-y-4">
                <h3 className="text-2xl font-heading text-white uppercase border-b border-gym-border pb-3">
                  ORDER <span className="text-gym-primary">SUMMARY</span>
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gym-muted">Base Plan Price</span>
                    <span className="text-white font-medium">₹{currentPlan.basePrice}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-gym-success">
                      <span>Coupon Discount</span>
                      <span>- ₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gym-muted">Net Amount</span>
                    <span className="text-white font-medium">₹{netPrice}</span>
                  </div>
                  {SITE.gstRate > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gym-muted">GST ({Math.round(SITE.gstRate * 100)}%)</span>
                      <span className="text-white font-medium">₹{gstAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-gym-border text-lg font-heading">
                    <span className="text-white uppercase">TOTAL PAYABLE</span>
                    <span className="text-gym-primary text-2xl">₹{totalPayable}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full mt-4"
                  isLoading={loading}
                  onClick={handleRazorpayCheckout}
                  leftIcon={<CreditCard className="w-5 h-5" />}
                >
                  Pay ₹{totalPayable} with Razorpay
                </Button>

                <div className="text-[11px] text-gym-muted text-center pt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-gym-primary" />
                  Secured by 256-bit Razorpay SSL Gateway (UPI / Credit / Debit)
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
