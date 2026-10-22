// Who can do what in the portal. The database enforces the same rules
// (supabase/migrations/07_role_chain_and_gym_ops.sql); these helpers only drive the UI.
//
// Role chain: Super Admin > Gym Owner > Manager > Receptionist > Trainer > Member.
// Anyone can view and change the people below them (and their own account).
import type { UserRole } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  owner: 'Gym Owner',
  manager: 'Manager',
  receptionist: 'Receptionist',
  trainer: 'Trainer',
  member: 'Member',
  visitor: 'Visitor',
};

const RANK: Record<UserRole, number> = {
  super_admin: 6,
  owner: 5,
  manager: 4,
  receptionist: 3,
  trainer: 2,
  member: 1,
  visitor: 0,
};

export const roleRank = (role?: UserRole | null) => (role ? RANK[role] : 0);

export const ADMIN_ROLES: UserRole[] = ['manager', 'owner', 'super_admin'];
export const STAFF_ROLES: UserRole[] = ['receptionist', ...ADMIN_ROLES];
export const TRAINER_PANEL_ROLES: UserRole[] = ['trainer', ...STAFF_ROLES];
export const PORTAL_ROLES: UserRole[] = ['member', 'trainer', ...STAFF_ROLES];

// Owner and Super Admin edit the website. The owner's changes may need Super Admin
// approval (Admin → Gym Settings); the database decides in public.can_edit_content().
export const CONTENT_EDITOR_ROLES: UserRole[] = ['owner', 'super_admin'];

export const canEditContent = (role?: UserRole | null) => !!role && CONTENT_EDITOR_ROLES.includes(role);
export const isAdminRole = (role?: UserRole | null) => !!role && ADMIN_ROLES.includes(role);
export const isStaffRole = (role?: UserRole | null) => roleRank(role) >= 3;
/** Owner and Super Admin: discount, geofence and other gym-wide settings. */
export const isOwnerLevel = (role?: UserRole | null) => roleRank(role) >= 5;

/**
 * A member who has not been approved by the gym yet must register / wait on /register.
 * Missing status (database before migration 09) counts as approved.
 */
export const needsRegistration = (profile?: { role: UserRole; approval_status?: string | null } | null) =>
  !!profile && profile.role === 'member' && !!profile.approval_status && profile.approval_status !== 'approved';

/** Roles the signed-in user may hand out on the Users screen (always below their own). */
export function assignableRoles(actor?: UserRole | null): UserRole[] {
  if (actor === 'super_admin') return ['member', 'trainer', 'receptionist', 'manager', 'owner', 'super_admin'];
  if (roleRank(actor) < 4) return [];
  return (['member', 'trainer', 'receptionist', 'manager', 'owner'] as UserRole[]).filter((r) => roleRank(r) < roleRank(actor));
}

/** Whether the actor may change this user's role. */
export function canManageUser(actor: { id: string; role: UserRole } | null | undefined, target: { id: string; role: UserRole }) {
  if (!actor || actor.id === target.id) return false;
  if (actor.role === 'super_admin') return true;
  if (roleRank(actor.role) < 4) return false;
  return roleRank(target.role) < roleRank(actor.role);
}

/** Whether the actor may open and edit this person's dashboard data (role chain). */
export function canManageData(actor: { id: string; role: UserRole } | null | undefined, target: { id: string; role: UserRole }) {
  if (!actor) return false;
  if (actor.id === target.id) return true;
  return roleRank(actor.role) >= 2 && roleRank(actor.role) > roleRank(target.role);
}
