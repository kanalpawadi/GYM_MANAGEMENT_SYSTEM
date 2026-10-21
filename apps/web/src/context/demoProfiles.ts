// Dev-only mock profiles for the role switcher on the Login page.
// Never available in production builds: isDemoAuthEnabled() is false there.
import { UserProfile, UserRole } from '../types';

export function isDemoAuthEnabled(): boolean {
  return import.meta.env.DEV === true;
}

const createdAt = new Date().toISOString();

export const DEMO_IDS = {
  member: '00000000-0000-4000-8000-000000000001',
  trainer: '00000000-0000-4000-8000-000000000002',
  receptionist: '00000000-0000-4000-8000-000000000003',
  manager: '00000000-0000-4000-8000-000000000004',
  owner: '00000000-0000-4000-8000-000000000005',
  super_admin: '00000000-0000-4000-8000-000000000006',
  visitor: '00000000-0000-4000-8000-000000000007',
};

export const demoProfiles: Record<UserRole, UserProfile> = {
  member: {
    id: DEMO_IDS.member,
    full_name: 'Rahul Sharma',
    email: 'member@rvfitnessgym.in',
    phone: '9876543210',
    role: 'member',
    avatar_url: '/images/gym/rushikesh-bw.jpg',
    assigned_trainer_id: DEMO_IDS.trainer,
    emergency_contact: { name: 'Sunita Sharma', phone: '9876500000', relation: 'Mother' },
    health_notes: 'Mild lower back sensitivity. Prefer high volume over 1RM loading.',
    created_at: createdAt,
  },
  trainer: {
    id: DEMO_IDS.trainer,
    full_name: 'Vikram Sharma',
    email: 'trainer@rvfitnessgym.in',
    phone: '9876543211',
    role: 'trainer',
    avatar_url: '/images/gym/rushikesh-warrior.jpg',
    created_at: createdAt,
  },
  receptionist: {
    id: DEMO_IDS.receptionist,
    full_name: 'Pooja Verma',
    email: 'reception@rvfitnessgym.in',
    phone: '9876543212',
    role: 'receptionist',
    created_at: createdAt,
  },
  manager: {
    id: DEMO_IDS.manager,
    full_name: 'Karan Kapoor',
    email: 'manager@rvfitnessgym.in',
    phone: '9876543213',
    role: 'manager',
    created_at: createdAt,
  },
  owner: {
    id: DEMO_IDS.owner,
    full_name: 'Rushikesh Arvind Vagare (Founder)',
    email: 'owner@rvfitnessgym.in',
    phone: '9623372426',
    role: 'owner',
    avatar_url: '/images/gym/rushikesh-hero.jpg',
    created_at: createdAt,
  },
  super_admin: {
    id: DEMO_IDS.super_admin,
    full_name: 'Super Admin',
    email: 'superadmin@rvfitnessgym.in',
    role: 'super_admin',
    created_at: createdAt,
  },
  visitor: {
    id: DEMO_IDS.visitor,
    full_name: 'Guest Visitor',
    email: 'visitor@rvfitnessgym.in',
    role: 'visitor',
    created_at: createdAt,
  },
};
