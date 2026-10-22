// Editable website content: default values (what ships in the code) and the
// field definitions the Website Editor uses to build its forms.
// Saved edits live in the Supabase `site_content` table, one row per section,
// and override these defaults field by field.
import { SITE, PLANS, HIGHLIGHTS, PRINCIPLES, FORCES } from '../config/site';

const img = (id: string, w = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const DEFAULT_CONTENT = {
  site: {
    name: SITE.name,
    fullName: SITE.fullName,
    tagline: SITE.tagline,
    founder: SITE.founder,
    location: SITE.location,
    address: SITE.address,
    phone: SITE.phone,
    email: SITE.email,
    instagram: SITE.instagram as string,
    hoursWeekdays: SITE.hours.weekdays,
    hoursSunday: SITE.hours.sunday,
    about: SITE.about,
  },

  home: {
    heroTitleLead: 'BUILD YOUR',
    heroTitleHighlight: 'STRENGTH.',
    heroTitleTail: 'DEFINE YOURSELF.',
    heroText: `${SITE.tagline} ${SITE.name} is a space where effort meets intent — built for those who refuse to settle.`,
    heroImage: '/images/gym/rushikesh-hero.jpg',
    heroSlides: [
      { image: '/images/gym/rushikesh-hero.jpg', caption: 'Train with purpose' },
      { image: '/images/gym/rushikesh-side-bicep.jpg', caption: 'Build real strength' },
      { image: '/images/gym/rushikesh-posing-logo.jpg', caption: 'RV Fitness, Narsobawadi' },
      { image: '/images/gym/rushikesh-warrior.jpg', caption: 'Discipline creates results' },
      { image: '/images/gym/rushikesh-gym-trophies.jpg', caption: 'Championship coaching' },
      { image: '/images/gym/rushikesh-bw.jpg', caption: 'Your transformation starts here' },
    ] as { image: string; caption: string }[],
    highlights: HIGHLIGHTS.map((h) => ({ ...h })),
    philosophyText: `${SITE.name} is a space where effort meets intent — built for those who refuse to settle.`,
  },

  about: {
    story: `${SITE.name} is a space where effort meets intent — built for those who refuse to settle. Founded by ${SITE.founder}, our gym in ${SITE.location} is built around a simple belief: ${SITE.tagline.toLowerCase()}`,
    imageOne: '/images/gym/rushikesh-posing-logo.jpg',
    imageTwo: '/images/gym/rushikesh-gym-trophies.jpg',
    principles: [...PRINCIPLES],
    forces: [...FORCES],
  },

  plans: {
    items: PLANS.map((p) => ({
      id: p.id,
      title: p.title,
      months: p.months,
      price: p.price,
      description: p.description,
      features: [...p.features],
      badge: p.badge,
      highlight: p.highlight,
    })),
  },

  trainers: {
    items: [
      {
        name: 'Rushikesh Arvind Vagare',
        specialization: 'Bodybuilding & Championship Transformation',
        experience: 'Founder & Head Coach',
        rating: '5.0 ★',
        category: 'Strength',
        bio: 'Founder of RV Fitness Narsobawadi. Certified fitness coach and competitive bodybuilding athlete dedicated to transforming physique with discipline.',
        photo: '/images/gym/rushikesh-side-bicep.jpg',
      },
      {
        name: 'Vikram Sharma',
        specialization: 'CrossFit & Heavy Strength Conditioning',
        experience: '8 Years Experience',
        rating: '4.9 ★',
        category: 'Strength',
        bio: 'Powerlifter & certified Level-3 CrossFit coach. Specialized in explosive strength and injury prevention.',
        photo: '/images/gym/rushikesh-warrior.jpg',
      },
      {
        name: 'Priya Patel',
        specialization: 'Ashtanga Yoga & Mobility',
        experience: '6 Years Experience',
        rating: '5.0 ★',
        category: 'Yoga',
        bio: 'Registered 500-hr RYT yoga master. Passionate about posture correction, flexibility, and stress release.',
        photo: '/images/gym/rushikesh-bw.jpg',
      },
      {
        name: 'Rahul Verma',
        specialization: 'Bodybuilding & Contest Preparation',
        experience: '10 Years Experience',
        rating: '4.8 ★',
        category: 'Strength',
        bio: 'State level bodybuilding coach. Has coached hundreds of successful transformations across Maharashtra.',
        photo: '/images/gym/rushikesh-gym-trophies.jpg',
      },
    ],
  },

  programs: {
    items: [
      {
        title: 'Heavy Strength & Muscle Building',
        desc: 'Build dense lean muscle and raw power with structured compound lifting routines, progressive overload, and hypertrophy protocols.',
        benefits: ['Hypertrophy Split Routines', 'Bench, Squat & Deadlift Coaching', 'Plate-Loaded Hammer Machines', 'Progressive Overload Logs'],
        image: '/images/gym/rushikesh-gym-trophies.jpg',
      },
      {
        title: 'CrossFit & Functional Fitness',
        desc: 'High-intensity functional movements designed to boost endurance, agility, VO2 max, and explosive athletic power.',
        benefits: ['Olympic Weightlifting Racks', 'Kettlebell & Plyometric Workouts', 'Rowers & Assault Air Bikes', 'Weekly Endurance Challenges'],
        image: '/images/gym/rushikesh-warrior.jpg',
      },
      {
        title: 'High-Energy Zumba & Dance Cardio',
        desc: 'Burn up to 600 calories per hour in a fun, rhythmic party atmosphere led by licensed dance instructors.',
        benefits: ['Latin & Bollywood Beats', 'Core & Leg Toning', 'Full Body Cardio Burn', 'High Energy Group Vibe'],
        image: '/images/gym/rv-forces-collage.jpg',
      },
      {
        title: 'Mindful Ashtanga Yoga & Mobility',
        desc: 'Enhance joint mobility, spinal alignment, posture correction, and mental calm through traditional yoga practices.',
        benefits: ['Breathwork & Pranayama', 'Deep Muscle Flexibility', 'Postural Alignment', 'Stress Reduction & Recovery'],
        image: '/images/gym/rushikesh-bw.jpg',
      },
      {
        title: '1-on-1 VIP Personal Training',
        desc: 'Dedicated 1-on-1 coaching customized strictly to your body type, medical history, and target timeframe.',
        benefits: ['Custom Diet & Macro Chart', 'Form Correction & Spotting', 'Weekly Fat & Muscle Audit', 'Guaranteed Results Timeline'],
        image: '/images/gym/rushikesh-side-bicep.jpg',
      },
      {
        title: 'Fat Loss & Body Transformation',
        desc: 'Targeted caloric deficit protocols combined with HIIT cardio to drop body fat percentages while maintaining muscle mass.',
        benefits: ['InBody Composition Test', 'Indian Calorie Deficit Guide', 'Fat Burn HIIT Circuit', 'Personal Accountability Coach'],
        image: '/images/gym/rushikesh-posing-logo.jpg',
      },
    ],
  },

  gallery: {
    items: [
      { title: 'RV Fitness Wall & Championship Arena', category: 'Facility', url: '/images/gym/rushikesh-hero.jpg' },
      { title: 'RV Fitness Turf & Brand Icon', category: 'Facility', url: '/images/gym/rushikesh-posing-logo.jpg' },
      { title: 'Weight Stacks, Machines & Trophies', category: 'Facility', url: '/images/gym/rushikesh-gym-trophies.jpg' },
      { title: 'Side Chest & Bicep Sculpting', category: 'Training', url: '/images/gym/rushikesh-side-bicep.jpg' },
      { title: 'Warrior Mindset Arena', category: 'Training', url: '/images/gym/rushikesh-warrior.jpg' },
      { title: 'Aesthetic Classic Conditioning', category: 'Training', url: '/images/gym/rushikesh-bw.jpg' },
      { title: 'Four Forces Transformation', category: 'Transformation', url: '/images/gym/rv-forces-collage.jpg' },
      { title: 'Competition Setup & Free Weights', category: 'Facility', url: '/images/gym/rushikesh-gym-trophies.jpg' },
    ],
  },

  transformations: {
    items: [
      {
        name: 'Rahul Sharma',
        duration: '6 Months',
        weightChange: '-18 kg Fat Loss',
        coach: 'Rushikesh Vagare',
        beforeImg: '/images/gym/rushikesh-bw.jpg',
        afterImg: '/images/gym/rushikesh-side-bicep.jpg',
        story: 'I was 98 kg with severe lower back pain. Coach Rushikesh designed a low-impact calorie deficit routine. Today I am at 80 kg with zero back pain!',
      },
      {
        name: 'Sneha Reddy',
        duration: '4 Months',
        weightChange: '+5 kg Lean Muscle',
        coach: 'Rushikesh Vagare',
        beforeImg: '/images/gym/rushikesh-bw.jpg',
        afterImg: '/images/gym/rushikesh-gym-trophies.jpg',
        story: 'Struggled with posture and low strength. Through focused weight training and guidance, my stamina and posture have drastically improved.',
      },
      {
        name: 'Amit Verma',
        duration: '8 Months',
        weightChange: 'Body Recomposition',
        coach: 'Rushikesh Vagare',
        beforeImg: '/images/gym/rushikesh-warrior.jpg',
        afterImg: '/images/gym/rushikesh-posing-logo.jpg',
        story: 'Lost 12% body fat while increasing strength significantly. The coaches at RV Fitness push you past your perceived limits!',
      },
    ],
  },

  faq: {
    items: [
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
    ],
  },

  offer: {
    barEnabled: true,
    popupEnabled: true,
    popupTag: 'LIMITED TIME OFFER',
    popupText: 'Join RV Fitness now and get the discount on every membership plan. Visit the gym or sign up online to claim it.',
  },

  schedule: {
    items: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].flatMap((day: string) => [
      { day, time: '05:30 AM - 10:00 AM', title: 'Morning Training', category: 'Strength', trainer: '', room: 'Main Floor' },
      { day, time: '05:00 PM - 10:00 PM', title: 'Evening Training', category: 'Strength', trainer: '', room: 'Main Floor' },
    ]).concat([{ day: 'Sunday', time: '07:00 AM - 02:00 PM', title: 'Sunday Open Gym', category: 'Open Gym', trainer: '', room: 'Main Floor' }]) as {
      day: string;
      time: string;
      title: string;
      category: string;
      trainer: string;
      room: string;
    }[],
  },

  blog: {
    posts: [
      {
        title: '5 Essential Rules for Gaining Lean Muscle Mass',
        slug: '5-essential-rules-gaining-lean-muscle',
        summary:
          'Master progressive overload, optimal protein intake, hydration, and sleep cycles to maximize your physique goals without excessive fat gain.',
        content: `Building lean muscle mass requires a scientific balance of progressive overload, caloric management, and deep tissue recovery.

1. **Progressive Overload**: Ensure you track your weights, reps, or sets weekly. Adding 1-2 kg or an extra repetition forces muscle hypertrophy.
2. **Protein Distribution**: Target 1.6g to 2.2g of protein per kg of body weight. Distribute this evenly across 4 meals (paneer, eggs, chicken breast, whey, or soya).
3. **Compound Movements First**: Prioritize barbell squats, bench press, overhead press, and Romanian deadlifts at the start of your training session.
4. **Hydration & Electrolytes**: Muscles are 75% water. Drink at least 3.5 to 4 liters of clean water daily.
5. **Sleep Quality**: Muscle tissue repair and human growth hormone release peak during deep REM sleep. Aim for 7 to 8 hours of quality rest every night.`,
        image: '/images/gym/rushikesh-warrior.jpg',
        date: 'October 4, 2026',
        author: 'Rushikesh Arvind Vagare',
      },
      {
        title: 'High-Protein Indian Meal Prep Blueprint',
        slug: 'high-protein-indian-meal-prep-guide',
        summary: 'Delicious paneer, chicken, chana, and soya recipes designed for busy Indian professionals striving for fat loss.',
        content: `Struggling to hit your daily protein intake on a standard Indian diet? Here is how to meal prep effortlessly for the entire week:

- **Paneer Bhurji & Soya Chunks**: 100g of paneer combined with 50g of boiled soya chunks delivers 35g of pure protein.
- **Tandoori Grilled Chicken Breast**: Marinate chicken breast in hung curd, lemon, and spices for an easy meal prep option.
- **Sprouted Moong & Chana Salad**: Add diced cucumber, tomatoes, and paneer cubes for a nutrient-dense snack.
- **Sattu Shakes**: Roasted chana flour (sattu) with cold water, roasted cumin, and black salt provides 15g of natural protein.`,
        image: '/images/gym/rushikesh-side-bicep.jpg',
        date: 'October 1, 2026',
        author: 'Rushikesh Arvind Vagare',
      },
    ],
  },
};

export type SiteContent = typeof DEFAULT_CONTENT;
export type SectionKey = keyof SiteContent;

// ---- Editor field definitions ------------------------------------------------

export type FieldDef =
  | { key: string; label: string; type: 'text' | 'textarea' | 'image' | 'boolean'; help?: string }
  | { key: string; label: string; type: 'readonly'; help?: string }
  | { key: string; label: string; type: 'stringList'; help?: string; itemLabel?: string }
  | {
      key: string;
      label: string;
      type: 'list';
      help?: string;
      itemLabel: string;
      titleKey: string;
      fields: FieldDef[];
      /** Items can be edited but not added or removed (e.g. plans tied to payments). */
      fixed?: boolean;
    };

export interface SectionDef {
  key: SectionKey;
  label: string;
  description: string;
  fields: FieldDef[];
}

export const SECTIONS: SectionDef[] = [
  {
    key: 'site',
    label: 'Gym Details',
    description: 'Name, contact details and opening hours shown in the header, footer, Contact page and WhatsApp button.',
    fields: [
      { key: 'name', label: 'Short name', type: 'text' },
      { key: 'fullName', label: 'Full name', type: 'text' },
      { key: 'tagline', label: 'Tagline', type: 'text' },
      { key: 'founder', label: 'Founder', type: 'text' },
      { key: 'location', label: 'Town / area', type: 'text' },
      { key: 'address', label: 'Full address', type: 'text' },
      { key: 'phone', label: 'Phone (10 digits, no +91)', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'instagram', label: 'Instagram handle (without @, leave empty to hide)', type: 'text' },
      { key: 'hoursWeekdays', label: 'Opening hours (Mon – Sat)', type: 'text' },
      { key: 'hoursSunday', label: 'Opening hours (Sunday)', type: 'text' },
      { key: 'about', label: 'About the gym (footer & About page intro)', type: 'textarea' },
    ],
  },
  {
    key: 'home',
    label: 'Home Page',
    description: 'Big banner at the top of the home page and the "Why RV Fitness" cards.',
    fields: [
      { key: 'heroImage', label: 'Banner background image', type: 'image' },
      {
        key: 'heroSlides',
        label: 'Sliding photos next to the headline (5–6 work best)',
        type: 'list',
        itemLabel: 'Photo',
        titleKey: 'caption',
        fields: [
          { key: 'image', label: 'Photo', type: 'image' },
          { key: 'caption', label: 'Caption (optional)', type: 'text' },
        ],
      },
      { key: 'heroTitleLead', label: 'Headline – first part', type: 'text' },
      { key: 'heroTitleHighlight', label: 'Headline – yellow part', type: 'text' },
      { key: 'heroTitleTail', label: 'Headline – last part', type: 'text' },
      { key: 'heroText', label: 'Text under the headline', type: 'textarea' },
      {
        key: 'highlights',
        label: '"Why RV Fitness" cards',
        type: 'list',
        itemLabel: 'Card',
        titleKey: 'title',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
        ],
      },
      { key: 'philosophyText', label: '"More than a gym" text', type: 'textarea' },
    ],
  },
  {
    key: 'about',
    label: 'About Page',
    description: 'Story, photos and principles. Principles also appear on the home page.',
    fields: [
      { key: 'story', label: 'Our story', type: 'textarea' },
      { key: 'imageOne', label: 'Photo 1', type: 'image' },
      { key: 'imageTwo', label: 'Photo 2', type: 'image' },
      { key: 'principles', label: 'Principles', type: 'stringList', itemLabel: 'Principle' },
      { key: 'forces', label: 'Mindset words', type: 'stringList', itemLabel: 'Word' },
    ],
  },
  {
    key: 'plans',
    label: 'Membership Plans',
    description:
      'Plan names, descriptions and features. Prices and durations are fixed here because the payment server charges them; ask your developer to change a price.',
    fields: [
      {
        key: 'items',
        label: 'Plans',
        type: 'list',
        itemLabel: 'Plan',
        titleKey: 'title',
        fixed: true,
        fields: [
          { key: 'title', label: 'Plan name', type: 'text' },
          { key: 'price', label: 'Price (₹)', type: 'readonly' },
          { key: 'months', label: 'Duration (months)', type: 'readonly' },
          { key: 'badge', label: 'Badge', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'features', label: 'Features', type: 'stringList', itemLabel: 'Feature' },
          { key: 'highlight', label: 'Highlight this plan', type: 'boolean' },
        ],
      },
    ],
  },
  {
    key: 'trainers',
    label: 'Trainers',
    description: 'Coaches shown on the Trainers page. Category is used for the filter buttons.',
    fields: [
      {
        key: 'items',
        label: 'Trainers',
        type: 'list',
        itemLabel: 'Trainer',
        titleKey: 'name',
        fields: [
          { key: 'photo', label: 'Photo', type: 'image' },
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'specialization', label: 'Specialization', type: 'text' },
          { key: 'experience', label: 'Experience', type: 'text' },
          { key: 'rating', label: 'Rating', type: 'text' },
          { key: 'category', label: 'Category (e.g. Strength, Yoga)', type: 'text' },
          { key: 'bio', label: 'Bio', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'programs',
    label: 'Programs',
    description: 'Training programs on the Programs page.',
    fields: [
      {
        key: 'items',
        label: 'Programs',
        type: 'list',
        itemLabel: 'Program',
        titleKey: 'title',
        fields: [
          { key: 'image', label: 'Image', type: 'image' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'desc', label: 'Description', type: 'textarea' },
          { key: 'benefits', label: 'Benefits', type: 'stringList', itemLabel: 'Benefit' },
        ],
      },
    ],
  },
  {
    key: 'gallery',
    label: 'Gallery',
    description: 'Photos on the Gallery page. Category is used for the filter buttons.',
    fields: [
      {
        key: 'items',
        label: 'Photos',
        type: 'list',
        itemLabel: 'Photo',
        titleKey: 'title',
        fields: [
          { key: 'url', label: 'Image', type: 'image' },
          { key: 'title', label: 'Caption', type: 'text' },
          { key: 'category', label: 'Category (e.g. Facility, Classes)', type: 'text' },
        ],
      },
    ],
  },
  {
    key: 'transformations',
    label: 'Transformations',
    description: 'Before / after member stories.',
    fields: [
      {
        key: 'items',
        label: 'Stories',
        type: 'list',
        itemLabel: 'Story',
        titleKey: 'name',
        fields: [
          { key: 'beforeImg', label: 'Before photo', type: 'image' },
          { key: 'afterImg', label: 'After photo', type: 'image' },
          { key: 'name', label: 'Member name', type: 'text' },
          { key: 'weightChange', label: 'Result (e.g. -18 kg Fat Loss)', type: 'text' },
          { key: 'duration', label: 'Duration', type: 'text' },
          { key: 'coach', label: 'Coach', type: 'text' },
          { key: 'story', label: 'Story', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'faq',
    label: 'FAQ',
    description: 'Questions and answers on the FAQ page.',
    fields: [
      {
        key: 'items',
        label: 'Questions',
        type: 'list',
        itemLabel: 'Question',
        titleKey: 'q',
        fields: [
          { key: 'q', label: 'Question', type: 'text' },
          { key: 'a', label: 'Answer', type: 'textarea' },
          { key: 'category', label: 'Category', type: 'text' },
        ],
      },
    ],
  },
  {
    key: 'offer',
    label: 'Offer Banner',
    description:
      'The discount strip and pop-up appear only while the discount is ON (Admin → Gym Settings → Discount). The percentage and offer name come from there.',
    fields: [
      { key: 'barEnabled', label: 'Show the strip at the top of every page', type: 'boolean' },
      { key: 'popupEnabled', label: 'Show the pop-up once per visit', type: 'boolean' },
      { key: 'popupTag', label: 'Pop-up small heading', type: 'text' },
      { key: 'popupText', label: 'Pop-up text', type: 'textarea' },
    ],
  },
  {
    key: 'schedule',
    label: 'Class Schedule',
    description: 'Sessions on the Schedule page. Day must be Monday–Sunday; category is used for the filter buttons.',
    fields: [
      {
        key: 'items',
        label: 'Sessions',
        type: 'list',
        itemLabel: 'Session',
        titleKey: 'title',
        fields: [
          { key: 'day', label: 'Day (e.g. Monday)', type: 'text' },
          { key: 'time', label: 'Time (e.g. 06:30 AM - 07:30 AM)', type: 'text' },
          { key: 'title', label: 'Session name', type: 'text' },
          { key: 'category', label: 'Category (e.g. Strength, Yoga)', type: 'text' },
          { key: 'trainer', label: 'Coach (optional)', type: 'text' },
          { key: 'room', label: 'Location (optional)', type: 'text' },
        ],
      },
    ],
  },
  {
    key: 'blog',
    label: 'Blog',
    description: 'Articles on the Blog page. The link is /blog/<slug>; separate paragraphs with an empty line.',
    fields: [
      {
        key: 'posts',
        label: 'Articles',
        type: 'list',
        itemLabel: 'Article',
        titleKey: 'title',
        fields: [
          { key: 'image', label: 'Cover image', type: 'image' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'slug', label: 'Link name (lowercase-with-dashes)', type: 'text' },
          { key: 'date', label: 'Date', type: 'text' },
          { key: 'author', label: 'Author', type: 'text' },
          { key: 'summary', label: 'Summary', type: 'textarea' },
          { key: 'content', label: 'Article text', type: 'textarea' },
        ],
      },
    ],
  },
];
