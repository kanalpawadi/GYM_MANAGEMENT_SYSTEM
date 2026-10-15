// Single source of truth for RV Fitness client details.
// Update values here and they flow through the whole website.

export const SITE = {
  name: 'RV Fitness',
  fullName: 'RV Fitness, Narsobawadi',
  tagline: 'Train with purpose. Transform with discipline.',
  founder: 'Rushikesh Arvind Vagare',
  location: 'Narsobawadi',
  address: 'Narsobawadi, Maharashtra, India',
  phone: '9623372426',
  email: 'rvfitness.narsobawadi@gmail.com',
  // Instagram handle without "@". Leave empty to hide the Instagram link.
  instagram: '',
  // GST added on top of plan prices at checkout (e.g. 0.18). 0 = prices are final.
  gstRate: 0 as number,
  hours: {
    weekdays: 'Mon - Sat: 5:30 AM - 10:00 PM',
    sunday: 'Sunday: 7:00 AM - 2:00 PM',
    schema: 'Mo-Sa 05:30-22:00, Su 07:00-14:00',
  },
  about:
    'RV Fitness, Narsobawadi is a modern fitness destination founded by Rushikesh Arvind Vagare. We combine premium equipment, focused coaching and a disciplined community to help every member build strength and transform with purpose.',
} as const;

export const phoneDisplay = (phone: string = SITE.phone) =>
  `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;

export const telHref = (phone: string = SITE.phone) => `tel:+91${phone}`;

export const whatsappHref = (
  message = `Hi ${SITE.name}! I want to enquire about membership plans.`,
  phone: string = SITE.phone,
) => `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;

export const instagramHref = (handle: string = SITE.instagram) =>
  handle ? `https://www.instagram.com/${handle.replace(/^@/, '')}/` : '';

export const mapEmbedSrc = (query = `${SITE.name} ${SITE.location}`) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

export const formatINR = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export interface MembershipPlan {
  id: 'monthly' | 'six-month' | 'yearly';
  title: string;
  months: number;
  price: number;
  description: string;
  features: string[];
  badge: string;
  highlight: boolean;
}

const BASE_FEATURES = ['Full gym access', 'Cardio & strength equipment', 'Locker facility', 'RO water'];

export const PLANS: MembershipPlan[] = [
  {
    id: 'monthly',
    title: 'Monthly',
    months: 1,
    price: 1500,
    description: 'Flexible monthly membership with full gym access.',
    features: BASE_FEATURES,
    badge: 'Flexible',
    highlight: false,
  },
  {
    id: 'six-month',
    title: 'Six Month',
    months: 6,
    price: 7500,
    description: 'Best value for committed members — save with a 6-month plan.',
    features: [...BASE_FEATURES, 'Diet guidance', 'Personalised workout plan'],
    badge: 'Best Value',
    highlight: true,
  },
  {
    id: 'yearly',
    title: 'Yearly',
    months: 12,
    price: 12000,
    description: 'Maximum savings with a full year of transformation.',
    features: [
      ...BASE_FEATURES,
      'Diet guidance',
      'Personalised workout plan',
      'Body progress tracking',
      'Priority trainer support',
    ],
    badge: 'Max Savings',
    highlight: false,
  },
];

// Every feature offered by any plan, in display order (for comparison tables).
export const ALL_PLAN_FEATURES: string[] = Array.from(new Set(PLANS.flatMap((p) => p.features)));

export const monthlyEquivalent = (plan: MembershipPlan) => Math.round(plan.price / plan.months);

export const PRINCIPLES = [
  'Strength is built through consistency.',
  'Discipline creates results.',
  'Every session matters.',
  'Your transformation starts with you.',
];

export const FORCES = ['Strength', 'Discipline', 'Power', 'Transformation'];

export const HIGHLIGHTS = [
  {
    title: 'Strength Training',
    text: 'Progressive, structured programs built around compound lifts and smart programming.',
  },
  {
    title: 'Modern Equipment',
    text: 'Curated machines and free weights maintained for performance and safety.',
  },
  {
    title: 'Personal Guidance',
    text: 'Trainers who watch your form, adjust your plan and keep you accountable.',
  },
  {
    title: 'Progress Tracking',
    text: 'Measure what matters — strength, body and consistency — over time.',
  },
];

export const EQUIPMENT = [
  { name: 'Multi-Station Cable Machine', category: 'Functional Training' },
  { name: 'Treadmill', category: 'Cardio' },
  { name: 'Olympic Barbell Set', category: 'Free Weights' },
];
