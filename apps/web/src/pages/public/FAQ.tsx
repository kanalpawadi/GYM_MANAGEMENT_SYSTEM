import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, Search, HelpCircle } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export const FAQ: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openId, setOpenId] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What are the operating hours of RV Fitness?',
      a: 'We are open Monday through Saturday from 5:30 AM to 10:00 PM, and Sundays from 7:00 AM to 2:00 PM.',
      category: 'General',
    },
    {
      q: 'Is a free trial pass available for new visitors?',
      a: 'Yes! We offer a complimentary 1-day pass. Simply fill out the Free Trial form on our website or show your SMS at the front desk.',
      category: 'Membership',
    },
    {
      q: 'Do you provide personal training and customized diet plans?',
      a: 'Yes. Our ACE and K11 certified personal trainers craft tailored 1-on-1 workout routines and Indian macronutrient diet blueprints based on your health goals.',
      category: 'Training',
    },
    {
      q: 'Is parking space available for members?',
      a: 'Yes, we provide dedicated two-wheeler and four-wheeler parking spaces with 24/7 CCTV surveillance.',
      category: 'Facilities',
    },
    {
      q: 'Can I freeze my membership if I travel or fall ill?',
      a: 'Freeze requests for Six Month and Yearly plans can be discussed with the gym management.',
      category: 'Policies',
    },
    {
      q: 'What payment modes do you accept?',
      a: 'We accept Razorpay online payments (Credit/Debit cards, NetBanking), UPI (Google Pay, PhonePe, Paytm), cash at reception, and credit cards.',
      category: 'Membership',
    },
    {
      q: 'What is included in each membership plan?',
      a: 'Every plan includes full gym access, cardio & strength equipment, locker facility and RO water. The Six Month plan adds diet guidance and a personalised workout plan. The Yearly plan adds body progress tracking and priority trainer support.',
      category: 'General',
    },
  ];

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Frequently Asked Questions (FAQ) | RV Fitness</title>
        <meta name="description" content="Find answers to common questions regarding RV Fitness timings, free trials, membership freeze policies, personal training, and group classes." />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
        <div className="text-center">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">GOT QUESTIONS?</span>
          <h1 className="text-5xl font-heading text-white tracking-wide uppercase mt-1">
            FREQUENTLY ASKED <span className="text-gym-primary">QUESTIONS</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Everything you need to know about our memberships, facilities, timing, and personal training.
          </p>
        </div>

        {/* Search Bar */}
        <Input
          placeholder="Search questions (e.g. trial, timing, parking, freeze)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-gym-primary" />}
        />

        {/* Accordion List */}
        <div className="space-y-4">
          {filteredFaqs.length === 0 ? (
            <p className="text-center text-gym-muted py-8">No matching questions found for "{searchTerm}". Contact our reception desk directly!</p>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openId === idx;
              return (
                <Card
                  key={idx}
                  className={`transition-colors cursor-pointer ${isOpen ? 'border-gym-primary/60 bg-gym-surface' : ''}`}
                  onClick={() => setOpenId(isOpen ? null : idx)}
                >
                  <div className="flex justify-between items-center gap-4">
                    <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-gym-primary shrink-0" />
                      {faq.q}
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-gym-primary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-gym-border text-sm text-gym-muted leading-relaxed font-body">
                      {faq.a}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
