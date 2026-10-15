import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { submitLead } from '../../services/api';
import { SITE, phoneDisplay, telHref, whatsappHref, mapEmbedSrc } from '../../config/site';

export const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await submitLead({
        name,
        phone,
        email,
        notes,
        website_honeypot: honeypot,
      });
      setSuccessMsg(res.message);
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit enquiry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`Contact Us & Location Map | ${SITE.fullName}`}</title>
        <meta name="description" content={`Contact ${SITE.fullName}. Phone: ${phoneDisplay()}, Email: ${SITE.email}. Visit our gym in ${SITE.location}.`} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">GET IN TOUCH</span>
          <h1 className="text-5xl font-heading text-white tracking-wide uppercase mt-1">
            CONTACT <span className="text-gym-primary">RV FITNESS</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Have questions about membership plans, diet guidance or personalised workout plans? Send us a message or call us directly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Contact Form */}
          <div className="lg:col-span-7">
            <Card className="border-gym-primary/40 bg-gym-surface">
              <h3 className="text-2xl font-heading text-white uppercase mb-4">
                SEND AN <span className="text-gym-primary">ENQUIRY</span>
              </h3>

              {successMsg ? (
                <div className="bg-gym-success/20 border border-gym-success/40 text-gym-success p-6 rounded-xl text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 mx-auto" />
                  <h4 className="font-heading text-2xl uppercase">MESSAGE RECEIVED!</h4>
                  <p className="text-sm text-white">{successMsg}</p>
                  <Button variant="outline" size="sm" onClick={() => setSuccessMsg('')}>
                    Send Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Honeypot anti-spam field */}
                  <input
                    type="text"
                    name="website_honeypot"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Full Name"
                      placeholder="e.g. Vikramaditya Roy"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <Input
                      label="Mobile Phone (10-Digit Indian Phone)"
                      placeholder="9876543210"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label="Email Address (Optional)"
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gym-muted">How can we help you?</label>
                    <textarea
                      rows={4}
                      placeholder="Ask about plan prices, corporate discounts, or personal coaching..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-gym-surface text-white placeholder-gym-muted border border-gym-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-gym-primary"
                    />
                  </div>

                  {errorMsg && <span className="text-xs text-gym-danger font-medium">{errorMsg}</span>}

                  <Button type="submit" variant="primary" isLoading={loading} rightIcon={<Send className="w-4 h-4" />}>
                    Submit Enquiry
                  </Button>
                </form>
              )}
            </Card>
          </div>

          {/* Right Contact Details & Map */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card className="space-y-4">
              <h3 className="text-2xl font-heading text-white uppercase text-gym-primary">RECEPTION INFO</h3>

              <div className="space-y-3 text-sm text-gym-muted">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gym-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-heading text-base uppercase">Gym Address</h4>
                    <p>{SITE.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gym-primary shrink-0" />
                  <div>
                    <h4 className="text-white font-heading text-base uppercase">Helpline & WhatsApp</h4>
                    <a href={telHref()} className="text-gym-primary font-bold hover:underline">{phoneDisplay()}</a>
                    <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="block text-xs hover:text-white">Chat on WhatsApp</a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gym-primary shrink-0" />
                  <div>
                    <h4 className="text-white font-heading text-base uppercase">Official Email</h4>
                    <a href={`mailto:${SITE.email}`} className="hover:text-white break-all">{SITE.email}</a>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3 border-t border-gym-border">
                  <Clock className="w-5 h-5 text-gym-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-heading text-base uppercase">Opening Hours</h4>
                    <p>{SITE.hours.weekdays}</p>
                    <p className="text-xs text-gym-muted">{SITE.hours.sunday}</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="h-64 rounded-xl overflow-hidden border border-gym-border bg-gym-surface">
              <iframe
                title={`${SITE.fullName} map`}
                src={mapEmbedSrc()}
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(1) invert(0.9) contrast(1.2)' }}
                allowFullScreen={false}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
