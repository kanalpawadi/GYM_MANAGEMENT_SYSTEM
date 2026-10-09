import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Receipt, Download, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export const PaymentHistory: React.FC = () => {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const payments = [
    {
      id: 'p1',
      invoice_no: 'INV-20260818-8842',
      plan_title: 'Quarterly Fit Membership',
      amount: 3999,
      tax: 720,
      total: 4719,
      mode: 'online',
      payment_id: 'pay_Lx90123849',
      date: '18 Aug 2026',
      status: 'paid',
    },
    {
      id: 'p2',
      invoice_no: 'INV-20260515-3312',
      plan_title: 'Monthly Starter Membership',
      amount: 1499,
      tax: 270,
      total: 1769,
      mode: 'upi',
      payment_id: 'upi_99012311',
      date: '15 May 2026',
      status: 'paid',
    },
  ];

  const handleDownloadInvoice = (inv: any) => {
    // Generate text/PDF printable blob stream
    const content = `=====================================================
                    RV-FITNESS GYM INDIA
               TAX INVOICE / GST RECEIPT
=====================================================
Invoice No: ${inv.invoice_no}
Date: ${inv.date}
Payment ID: ${inv.payment_id}
Member Name: Rahul Sharma (RV-2026-8842)
GSTIN: 27AAAAA0000A1Z5

Description                         Amount (INR)
-----------------------------------------------------
${inv.plan_title}                   ₹${inv.amount}.00
CGST (9%)                           ₹${inv.tax / 2}.00
SGST (9%)                           ₹${inv.tax / 2}.00
-----------------------------------------------------
TOTAL PAID                           ₹${inv.total}.00
Status: SUCCESSFUL / PAID

Thank you for choosing RV-Fitness Gym!
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_no}.txt`;
    a.click();
  };

  return (
    <>
      <Helmet>
        <title>Payment History & GST Invoices | RV-Fitness Gym</title>
      </Helmet>

      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">TRANSACTION RECORDS</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            PAYMENT <span className="text-gym-primary">HISTORY & INVOICES</span>
          </h1>
        </div>

        <Card className="p-0 border-gym-border overflow-hidden bg-gym-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gym-text">
              <thead className="bg-gym-surfaceHover font-heading text-base text-gym-primary uppercase border-b border-gym-border">
                <tr>
                  <th className="p-4">Invoice No</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gym-surfaceHover/50">
                    <td className="p-4 font-heading text-white tracking-wider">{p.invoice_no}</td>
                    <td className="p-4">{p.plan_title}</td>
                    <td className="p-4 text-gym-muted">{p.date}</td>
                    <td className="p-4 font-heading text-gym-primary text-base">₹{p.total}</td>
                    <td className="p-4">
                      <Badge variant="primary">{p.mode.toUpperCase()}</Badge>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(p)} leftIcon={<Eye className="w-4 h-4" />}>
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(p)} leftIcon={<Download className="w-4 h-4" />}>
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Invoice View Modal */}
        <Modal isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} title="GST TAX INVOICE RECEIPT">
          {selectedInvoice && (
            <div className="space-y-4 font-body text-sm">
              <div className="bg-gym-bg border border-gym-border p-4 rounded-xl space-y-2">
                <div className="flex justify-between border-b border-gym-border pb-2">
                  <span className="text-gym-muted">Invoice No:</span>
                  <span className="font-heading text-gym-primary">{selectedInvoice.invoice_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gym-muted">Payment ID:</span>
                  <span className="text-white">{selectedInvoice.payment_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gym-muted">Date:</span>
                  <span className="text-white">{selectedInvoice.date}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-white font-medium">{selectedInvoice.plan_title}</span>
                  <span>₹{selectedInvoice.amount}</span>
                </div>
                <div className="flex justify-between text-xs text-gym-muted">
                  <span>GST (18%)</span>
                  <span>₹{selectedInvoice.tax}</span>
                </div>
                <div className="flex justify-between text-base font-heading text-gym-primary pt-2 border-t border-gym-border">
                  <span>TOTAL PAID</span>
                  <span>₹{selectedInvoice.total}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button variant="primary" className="w-full" onClick={() => handleDownloadInvoice(selectedInvoice)} leftIcon={<Download className="w-4 h-4" />}>
                  Download Receipt
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};
