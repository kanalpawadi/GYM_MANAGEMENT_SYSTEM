import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { DollarSign, Plus, Receipt, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const AdminFinancials: React.FC = () => {
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // Manual payment state
  const [memberName, setMemberName] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');

  // Expense state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Equipment Maintenance');
  const [expenseAmount, setExpenseAmount] = useState('');

  const [payments, setPayments] = useState([
    { id: 'pay1', member: 'Rahul Sharma', plan: 'Quarterly Fit', amount: '₹4,719', mode: 'online', gst: 'INV-20260818-8842', date: 'Oct 4, 2026' },
    { id: 'pay2', member: 'Sneha Reddy', plan: 'Annual Elite', amount: '₹14,158', mode: 'upi', gst: 'INV-20260901-1192', date: 'Oct 1, 2026' },
    { id: 'pay3', member: 'Vikramaditya S', plan: 'Monthly Starter', amount: '₹1,769', mode: 'cash', gst: 'INV-20260928-5541', date: 'Sep 28, 2026' },
  ]);

  const [expenses, setExpenses] = useState([
    { id: 'e1', title: 'Treadmill Belt Replacement', category: 'Maintenance', amount: '₹12,500', date: 'Oct 2, 2026' },
    { id: 'e2', title: 'Electricity Commercial Bill', category: 'Utilities', amount: '₹45,000', date: 'Oct 1, 2026' },
  ]);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName || !amount) return;
    const newPay = {
      id: `pay${payments.length + 1}`,
      member: memberName,
      plan: 'Manual Counter Membership',
      amount: `₹${amount}`,
      mode,
      gst: `INV-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString(),
    };
    setPayments([newPay, ...payments]);
    setShowAddPaymentModal(false);
    setMemberName('');
    setAmount('');
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount) return;
    const newExp = {
      id: `e${expenses.length + 1}`,
      title: expenseTitle,
      category: expenseCategory,
      amount: `₹${expenseAmount}`,
      date: new Date().toLocaleDateString(),
    };
    setExpenses([newExp, ...expenses]);
    setShowAddExpenseModal(false);
    setExpenseTitle('');
    setExpenseAmount('');
  };

  return (
    <>
      <Helmet>
        <title>Financials & Billing | RV-Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">BILLING & EXPENSES</span>
            <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
              FINANCIAL <span className="text-gym-primary">LEDGER & GST</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddExpenseModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Record Expense
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddPaymentModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Record Cash/UPI Payment
            </Button>
          </div>
        </div>

        {/* Payments Table */}
        <Card className="p-0 border-gym-border overflow-hidden bg-gym-surface">
          <div className="p-4 border-b border-gym-border flex justify-between items-center">
            <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gym-primary" /> MEMBERSHIP PAYMENT RECEIPTS
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gym-text">
              <thead className="bg-gym-surfaceHover font-heading text-base text-gym-primary uppercase border-b border-gym-border">
                <tr>
                  <th className="p-4">Member</th>
                  <th className="p-4">GST Invoice No</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gym-surfaceHover/50">
                    <td className="p-4 font-heading text-white uppercase text-base">{p.member}</td>
                    <td className="p-4 font-heading text-gym-primary tracking-wider">{p.gst}</td>
                    <td className="p-4 text-gym-muted">{p.date}</td>
                    <td className="p-4 font-heading text-white text-base">{p.amount}</td>
                    <td className="p-4">
                      <Badge variant="primary">{p.mode.toUpperCase()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Expenses List */}
        <Card className="p-0 border-gym-border overflow-hidden bg-gym-surface">
          <div className="p-4 border-b border-gym-border">
            <h3 className="text-xl font-heading text-white uppercase">MONTHLY OPERATING EXPENSES</h3>
          </div>
          <div className="divide-y divide-gym-border">
            {expenses.map((e) => (
              <div key={e.id} className="p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-heading text-white text-base uppercase">{e.title}</h4>
                  <span className="text-xs text-gym-muted">{e.category} | {e.date}</span>
                </div>
                <span className="text-lg font-heading text-gym-danger">{e.amount}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Record Payment Modal */}
        <Modal isOpen={showAddPaymentModal} onClose={() => setShowAddPaymentModal(false)} title="RECORD MANUAL COUNTER PAYMENT">
          <form onSubmit={handleRecordPayment} className="flex flex-col gap-4">
            <Input label="Member Name" value={memberName} onChange={(e) => setMemberName(e.target.value)} required />
            <Input label="Total Amount (INR)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Select
              label="Payment Mode"
              options={[
                { label: 'Cash at Reception', value: 'cash' },
                { label: 'UPI (PhonePe / GPay)', value: 'upi' },
                { label: 'Card Swipe Machine', value: 'card' },
              ]}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            />
            <Button type="submit" variant="primary" className="mt-2">Confirm & Issue GST Receipt</Button>
          </form>
        </Modal>

        {/* Record Expense Modal */}
        <Modal isOpen={showAddExpenseModal} onClose={() => setShowAddExpenseModal(false)} title="RECORD GYM EXPENSE">
          <form onSubmit={handleRecordExpense} className="flex flex-col gap-4">
            <Input label="Expense Title" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} required />
            <Select
              label="Expense Category"
              options={[
                { label: 'Equipment Maintenance', value: 'Maintenance' },
                { label: 'Electricity / Water Utilities', value: 'Utilities' },
                { label: 'Staff Salaries', value: 'Salaries' },
                { label: 'Marketing & Ads', value: 'Marketing' },
              ]}
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
            />
            <Input label="Expense Amount (INR)" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required />
            <Button type="submit" variant="primary" className="mt-2">Record Expense</Button>
          </form>
        </Modal>
      </div>
    </>
  );
};
