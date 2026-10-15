import { describe, expect, it } from 'vitest';
import {
  SITE,
  PLANS,
  ALL_PLAN_FEATURES,
  phoneDisplay,
  telHref,
  whatsappHref,
  instagramHref,
  mapEmbedSrc,
  formatINR,
  monthlyEquivalent,
} from './site';

describe('client details', () => {
  it('holds the real RV Fitness contact information', () => {
    expect(SITE.name).toBe('RV Fitness');
    expect(SITE.location).toBe('Narsobawadi');
    expect(SITE.phone).toBe('9623372426');
    expect(SITE.email).toBe('rvfitness.narsobawadi@gmail.com');
    expect(SITE.founder).toBe('Rushikesh Arvind Vagare');
  });

  it('uses a valid 10-digit Indian mobile number', () => {
    expect(SITE.phone).toMatch(/^[6-9]\d{9}$/);
  });

  it('uses a valid email address', () => {
    expect(SITE.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});

describe('contact link helpers', () => {
  it('formats the phone number for display', () => {
    expect(phoneDisplay()).toBe('+91 96233 72426');
  });

  it('builds a tel: link with country code', () => {
    expect(telHref()).toBe('tel:+919623372426');
  });

  it('builds an encoded WhatsApp link', () => {
    const url = whatsappHref('Hi there & hello');
    expect(url.startsWith('https://wa.me/919623372426?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Hi there & hello'));
  });

  it('builds an Instagram link only when a handle is set', () => {
    expect(instagramHref('')).toBe('');
    expect(instagramHref('@rv_fitness')).toBe('https://www.instagram.com/rv_fitness/');
  });

  it('builds a Google Maps embed for the gym location', () => {
    expect(mapEmbedSrc()).toBe(
      `https://maps.google.com/maps?q=${encodeURIComponent('RV Fitness Narsobawadi')}&output=embed`,
    );
  });

  it('formats rupees with Indian digit grouping', () => {
    expect(formatINR(1500)).toBe('₹1,500');
    expect(formatINR(12000)).toBe('₹12,000');
    expect(formatINR(150000)).toBe('₹1,50,000');
  });
});

describe('membership plans', () => {
  it('matches the client price list', () => {
    expect(PLANS.map((p) => [p.title, p.months, p.price])).toEqual([
      ['Monthly', 1, 1500],
      ['Six Month', 6, 7500],
      ['Yearly', 12, 12000],
    ]);
  });

  it('has unique ids', () => {
    expect(new Set(PLANS.map((p) => p.id)).size).toBe(PLANS.length);
  });

  it('includes the base features in every plan', () => {
    for (const plan of PLANS) {
      expect(plan.features.slice(0, 4)).toEqual([
        'Full gym access',
        'Cardio & strength equipment',
        'Locker facility',
        'RO water',
      ]);
    }
  });

  it('gives longer plans every feature of shorter plans', () => {
    for (let i = 1; i < PLANS.length; i++) {
      for (const feature of PLANS[i - 1].features) {
        expect(PLANS[i].features).toContain(feature);
      }
    }
  });

  it('lists the exact plan extras from the client', () => {
    expect(PLANS[1].features).toEqual(expect.arrayContaining(['Diet guidance', 'Personalised workout plan']));
    expect(PLANS[2].features).toEqual(
      expect.arrayContaining(['Body progress tracking', 'Priority trainer support']),
    );
    expect(PLANS[0].features).not.toContain('Diet guidance');
  });

  it('makes longer plans cheaper per month', () => {
    const perMonth = PLANS.map(monthlyEquivalent);
    expect(perMonth).toEqual([1500, 1250, 1000]);
  });

  it('builds a de-duplicated feature list for comparison', () => {
    expect(ALL_PLAN_FEATURES).toHaveLength(8);
    expect(new Set(ALL_PLAN_FEATURES).size).toBe(ALL_PLAN_FEATURES.length);
  });

  it('highlights exactly one plan', () => {
    expect(PLANS.filter((p) => p.highlight)).toHaveLength(1);
  });
});
