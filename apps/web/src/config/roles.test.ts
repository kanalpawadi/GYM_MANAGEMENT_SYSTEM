import { describe, expect, it } from 'vitest';
import { assignableRoles, canEditContent, canManageData, canManageUser, isAdminRole } from './roles';

describe('role rules', () => {
  it('only the super admin can hand out owner and super admin access', () => {
    expect(assignableRoles('super_admin')).toEqual(expect.arrayContaining(['owner', 'super_admin', 'trainer', 'member']));
    expect(assignableRoles('owner')).not.toContain('owner');
    expect(assignableRoles('owner')).not.toContain('super_admin');
    expect(assignableRoles('owner')).toContain('trainer');
    expect(assignableRoles('trainer')).toEqual([]);
    expect(assignableRoles('member')).toEqual([]);
  });

  it('nobody can change their own role', () => {
    const me = { id: 'me', role: 'super_admin' as const };
    expect(canManageUser(me, me)).toBe(false);
  });

  it('an owner can manage trainers and members but not other owners or the super admin', () => {
    const owner = { id: 'o', role: 'owner' as const };
    expect(canManageUser(owner, { id: 't', role: 'trainer' })).toBe(true);
    expect(canManageUser(owner, { id: 'm', role: 'member' })).toBe(true);
    expect(canManageUser(owner, { id: 'o2', role: 'owner' })).toBe(false);
    expect(canManageUser(owner, { id: 's', role: 'super_admin' })).toBe(false);
  });

  it('trainers, receptionists and members cannot manage users', () => {
    for (const role of ['trainer', 'receptionist', 'member'] as const) {
      expect(canManageUser({ id: 'x', role }, { id: 'm', role: 'member' })).toBe(false);
    }
  });

  it('owner and super admin edit website content; others cannot', () => {
    expect(canEditContent('super_admin')).toBe(true);
    expect(canEditContent('owner')).toBe(true);
    expect(canEditContent('manager')).toBe(false);
    expect(canEditContent('trainer')).toBe(false);
    expect(isAdminRole('super_admin')).toBe(true);
    expect(isAdminRole('receptionist')).toBe(false);
  });

  it('follows the role chain for viewing and changing dashboards', () => {
    const sup = { id: 's', role: 'super_admin' as const };
    const owner = { id: 'o', role: 'owner' as const };
    const trainer = { id: 't', role: 'trainer' as const };
    const member = { id: 'm', role: 'member' as const };
    expect(canManageData(sup, owner)).toBe(true);
    expect(canManageData(owner, trainer)).toBe(true);
    expect(canManageData(owner, member)).toBe(true);
    expect(canManageData(trainer, member)).toBe(true);
    expect(canManageData(trainer, owner)).toBe(false);
    expect(canManageData(member, { id: 'm2', role: 'member' })).toBe(false);
    expect(canManageData(member, member)).toBe(true);
    expect(canManageData(owner, sup)).toBe(false);
  });
});
