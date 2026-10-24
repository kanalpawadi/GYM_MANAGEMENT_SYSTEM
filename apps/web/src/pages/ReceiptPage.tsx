import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useSiteInfo } from '../content/ContentContext';
import { formatINR, phoneDisplay } from '../config/site';
import { Receipt, downloadFile, getReceipt } from '../services/gym';
import { INVOICE_CSS } from './InvoicePage';

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Printable receipt for one amount received: Print / Save as PDF, or download as HTML. */
export const ReceiptPage: React.FC = () => {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();
  const site = useSiteInfo();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!receiptId) return;
    getReceipt(receiptId)
      .then((r) => (r ? setReceipt(r) : setError('Receipt not found, or you do not have access to it.')))
      .catch((err: Error) => setError(err.message));
  }, [receiptId]);

  const downloadHtml = () => {
    if (!ref.current || !receipt) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${receipt.receipt_no}</title><style>body{background:#f5f5f5;padding:24px}${INVOICE_CSS}</style></head><body>${ref.current.outerHTML}</body></html>`;
    downloadFile(`${receipt.receipt_no}.html`, html, 'text/html');
  };

  const bill = receipt?.payment;
  const name = receipt?.member?.full_name ?? bill?.deleted_member_label ?? 'Member';
  const billPaid = bill ? (bill.status === 'paid' ? Number(bill.total_amount) : Number(bill.amount_paid ?? 0)) : 0;
  const billLeft = bill ? Math.max(Number(bill.total_amount) - billPaid, 0) : 0;

  return (
    <>
      <Helmet>
        <title>{receipt ? `Receipt ${receipt.receipt_no}` : 'Receipt'} | RV Fitness</title>
      </Helmet>
      <style>{`${INVOICE_CSS} @media print { .no-print{display:none!important} body{background:#fff!important} .inv{border:0} }`}</style>

      <div className="min-h-screen bg-gym-bg p-4 sm:p-8 print:bg-white print:p-0">
        <div className="no-print max-w-[760px] mx-auto mb-4 flex flex-wrap gap-2 justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          {receipt && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadHtml} leftIcon={<Download className="w-4 h-4" />}>
                Download HTML
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()} leftIcon={<Printer className="w-4 h-4" />}>
                Print / Save as PDF
              </Button>
            </div>
          )}
        </div>

        {error && <p role="alert" className="text-center text-gym-danger">{error}</p>}
        {!receipt && !error && <p className="text-center text-gym-muted">Loading receipt...</p>}

        {receipt && (
          <div ref={ref} className="inv" aria-label="Receipt">
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
                <h1 style={{ fontSize: 20 }}>PAYMENT RECEIPT</h1>
                <p className="muted">
                  Receipt no: <strong>{receipt.receipt_no}</strong>
                </p>
                <p className="muted">Date: {when(receipt.received_at)}</p>
              </div>
            </div>

            <div className="row" style={{ marginTop: 28 }}>
              <div>
                <p className="muted">RECEIVED FROM</p>
                <p style={{ margin: '4px 0', fontWeight: 700 }}>{name}</p>
                {receipt.member?.member_code && <p className="muted">Member ID: {receipt.member.member_code}</p>}
                {receipt.member?.phone && <p className="muted">{phoneDisplay(receipt.member.phone)}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="muted">PAID BY</p>
                <span className="badge">{receipt.payment_mode.toUpperCase()}</span>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {bill?.plan_title || 'Payment'}
                    {bill?.gst_invoice_no ? ` (invoice ${bill.gst_invoice_no})` : ''}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatINR(Number(receipt.amount))}</td>
                </tr>
                <tr className="total">
                  <td>Amount received</td>
                  <td style={{ textAlign: 'right' }}>{formatINR(Number(receipt.amount))}</td>
                </tr>
              </tbody>
            </table>

            {bill && (
              <table aria-label="Bill status">
                <tbody>
                  <tr>
                    <td>Bill total</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(Number(bill.total_amount))}</td>
                  </tr>
                  <tr>
                    <td>Paid so far</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(billPaid)}</td>
                  </tr>
                  <tr className="total">
                    <td>Remaining</td>
                    <td style={{ textAlign: 'right' }}>{billLeft > 0 ? formatINR(billLeft) : 'Nil · fully paid'}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {receipt.note && (
              <p className="muted" style={{ marginTop: 16 }}>
                Note: {receipt.note}
              </p>
            )}
            {receipt.staff?.full_name && (
              <p className="muted" style={{ marginTop: 4 }}>
                Received by: {receipt.staff.full_name}
              </p>
            )}
            <p className="muted" style={{ marginTop: 32, textAlign: 'center' }}>
              Thank you for training with {site.fullName}. This is a computer-generated receipt.
            </p>
          </div>
        )}
      </div>
    </>
  );
};
