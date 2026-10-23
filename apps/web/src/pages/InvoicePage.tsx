import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useSiteInfo } from '../content/ContentContext';
import { formatINR, phoneDisplay } from '../config/site';
import { Payment, downloadFile, getPayment, payerName } from '../services/gym';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// Plain styles so the downloaded HTML file and the printed PDF look the same without Tailwind.
const INVOICE_CSS = `
.inv{font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#111;background:#fff;max-width:760px;margin:0 auto;padding:36px;border:1px solid #e5e5e5;border-radius:12px}
.inv h1{font-size:26px;margin:0}.inv .gold{color:#997E25}.inv .muted{color:#666;font-size:12px}
.inv .row{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
.inv table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
.inv th{background:#111;color:#D4AF37;text-align:left;padding:10px}.inv td{padding:10px;border-bottom:1px solid #eee}
.inv .total td{font-weight:800;font-size:16px;border-top:2px solid #111}
.inv .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#e8f8ee;color:#15803d;font-weight:700;font-size:12px}
`;

/** Printable invoice for one payment: Print / Save as PDF, or download as an HTML file. */
export const InvoicePage: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const site = useSiteInfo();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paymentId) return;
    getPayment(paymentId)
      .then((p) => (p ? setPayment(p) : setError('Invoice not found, or you do not have access to it.')))
      .catch((err: Error) => setError(err.message));
  }, [paymentId]);

  const downloadHtml = () => {
    if (!ref.current || !payment) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${payment.gst_invoice_no ?? ''}</title><style>body{background:#f5f5f5;padding:24px}${INVOICE_CSS}</style></head><body>${ref.current.outerHTML}</body></html>`;
    downloadFile(`${payment.gst_invoice_no || 'invoice'}.html`, html, 'text/html');
  };

  return (
    <>
      <Helmet>
        <title>{payment?.gst_invoice_no ? `Invoice ${payment.gst_invoice_no}` : 'Invoice'} | RV Fitness</title>
      </Helmet>
      <style>{`${INVOICE_CSS} @media print { .no-print{display:none!important} body{background:#fff!important} .inv{border:0} }`}</style>

      <div className="min-h-screen bg-gym-bg p-4 sm:p-8 print:bg-white print:p-0">
        <div className="no-print max-w-[760px] mx-auto mb-4 flex flex-wrap gap-2 justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
          {payment && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadHtml} leftIcon={<Download className="w-4 h-4" />}>Download HTML</Button>
              <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer className="w-4 h-4" />}>Print / Save as PDF</Button>
            </div>
          )}
        </div>

        {error && <p role="alert" className="text-center text-gym-danger">{error}</p>}
        {!payment && !error && <p className="text-center text-gym-muted">Loading invoice...</p>}

        {payment && (
          <div ref={ref} className="inv" aria-label="Invoice">
            <div className="row">
              <div>
                <h1>
                  RV <span className="gold">FITNESS</span>
                </h1>
                <p className="muted">{site.address}</p>
                <p className="muted">
                  {phoneDisplay(site.phone)} · {site.email}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ fontSize: 20 }}>{payment.status === 'paid' ? 'TAX INVOICE / RECEIPT' : 'PAYMENT DUE'}</h1>
                <p className="muted">Invoice no: <strong>{payment.gst_invoice_no || 'Pending'}</strong></p>
                <p className="muted">Date: {fmt(payment.paid_at || payment.created_at)}</p>
              </div>
            </div>

            <div className="row" style={{ marginTop: 28 }}>
              <div>
                <p className="muted">BILLED TO</p>
                <p style={{ margin: '4px 0', fontWeight: 700 }}>{payerName(payment)}</p>
                <p className="muted">Member ID: {payment.member?.member_code || '—'}</p>
                <p className="muted">{payment.member?.phone ? phoneDisplay(payment.member.phone) : ''} {payment.member?.email ? `· ${payment.member.email}` : ''}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="muted">STATUS</p>
                <span className="badge" style={payment.status === 'paid' ? undefined : { background: '#fff7e6', color: '#b45309' }}>
                  {payment.status === 'paid' ? `PAID · ${payment.payment_mode.toUpperCase()}` : 'DUE'}
                </span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Period</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{payment.plan_title || 'Membership'} membership</td>
                  <td>{payment.membership
                      ? `${fmt(payment.membership.start_date)} – ${fmt(payment.membership.end_date)}`
                      : payment.period_start && payment.period_end
                        ? `${fmt(payment.period_start)} – ${fmt(payment.period_end)}`
                        : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(Number(payment.amount) + Number(payment.discount_amount || 0))}</td>
                </tr>
                {Number(payment.discount_amount) > 0 && (
                  <tr>
                    <td colSpan={2}>Discount</td>
                    <td style={{ textAlign: 'right' }}>−{formatINR(Number(payment.discount_amount))}</td>
                  </tr>
                )}
                {Number(payment.tax_amount) > 0 && (
                  <tr>
                    <td colSpan={2}>GST</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(Number(payment.tax_amount))}</td>
                  </tr>
                )}
                <tr className="total">
                  <td colSpan={2}>Total</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(Number(payment.total_amount))}</td>
                </tr>
              </tbody>
            </table>

            {payment.notes && <p className="muted" style={{ marginTop: 16 }}>Note: {payment.notes}</p>}
            <p className="muted" style={{ marginTop: 32, textAlign: 'center' }}>Thank you for training with {site.fullName}. This is a computer-generated invoice.</p>
          </div>
        )}
      </div>
    </>
  );
};
