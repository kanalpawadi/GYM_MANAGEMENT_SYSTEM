// RV Fitness, Narsobawadi membership plans (fallback when the database is empty).
// Keep in sync with apps/web/src/config/site.ts and supabase/seed.sql.

const BASE_FEATURES = ['Full gym access', 'Cardio & strength equipment', 'Locker facility', 'RO water'];

export const PLANS = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Monthly',
    description: 'Flexible monthly membership with full gym access.',
    duration_months: 1,
    original_price: 1500,
    offer_price: 1500,
    features: BASE_FEATURES,
    is_active: true,
  },
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    title: 'Six Month',
    description: 'Best value for committed members — save with a 6-month plan.',
    duration_months: 6,
    original_price: 7500,
    offer_price: 7500,
    features: [...BASE_FEATURES, 'Diet guidance', 'Personalised workout plan'],
    is_active: true,
  },
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    title: 'Yearly',
    description: 'Maximum savings with a full year of transformation.',
    duration_months: 12,
    original_price: 12000,
    offer_price: 12000,
    features: [
      ...BASE_FEATURES,
      'Diet guidance',
      'Personalised workout plan',
      'Body progress tracking',
      'Priority trainer support',
    ],
    is_active: true,
  },
];

export const findPlan = (id: string) => PLANS.find((p) => p.id === id);
