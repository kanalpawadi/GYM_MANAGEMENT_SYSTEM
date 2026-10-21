// Who can do what in the portal. The database enforces the same rules
// (supabase/migrations/04_roles_plans_content.sql); these lists only drive the UI.
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

export const ADMIN_ROLES: UserRole[] = ['manager', 'owner', 'super_admin'];
export const STAFF_ROLES: UserRole[] = ['receptionist', ...ADMIN_ROLES];
export const TRAINER_PANEL_ROLES: UserRole[] = ['trainer', ...ADMIN_ROLES];
export const PORTAL_ROLES: UserRole[] = ['member', 'trainer', ...STAFF_ROLES];

// Must match public.can_edit_content() in the database.
export const CONTENT_EDITOR_ROLES: UserRole[] = ['super_admin'];

export const canEditContent = (role?: UserRole | null) => !!role && CONTENT_EDITOR_ROLES.includes(role);
export const isAdminRole = (role?: UserRole | null) => !!role && ADMIN_ROLES.includes(role);

/** Roles the signed-in user may hand out on the Users screen. */
export function assignableRoles(actor?: UserRole | null): UserRole[] {
  if (actor === 'super_admin') return ['member', 'trainer', 'receptionist', 'manager', 'owner', 'super_admin'];
  if (actor === 'owner' || actor === 'manager') return ['member', 'trainer', 'receptionist', 'manager'];
  return [];
}

/** Whether the actor may change this user's role at all. */
export function canManageUser(actor: { id: string; role: UserRole } | null | undefined, target: { id: string; role: UserRole }) {
  if (!actor || actor.id === target.id) return false;
  if (actor.role === 'super_admin') return true;
  if (!isAdminRole(actor.role)) return false;
  return target.role !== 'owner' && target.role !== 'super_admin';
}
