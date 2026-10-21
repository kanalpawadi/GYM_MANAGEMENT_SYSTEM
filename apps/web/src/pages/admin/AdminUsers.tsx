import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/account/Avatar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, assignableRoles, canManageUser } from '../../config/roles';
import { assignTrainer, listUsers, updateUserRole } from '../../services/portal';
import type { UserProfile, UserRole } from '../../types';

// Staff and owners sign up like members; an admin then gives them their role here.
export const AdminUsers: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const trainers = useMemo(() => users.filter((u) => u.role === 'trainer'), [users]);
  const roleOptions = assignableRoles(profile?.role);

  const filtered = users.filter((u) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.phone ?? '').includes(term);
    return matchesSearch && (roleFilter === 'all' || u.role === roleFilter);
  });

  const patchUser = (id: string, patch: Partial<UserProfile>) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const changeRole = async (user: UserProfile, role: UserRole) => {
    setError('');
    setNotice('');
    try {
      await updateUserRole(user.id, role);
      patchUser(user.id, { role });
      setNotice(`${user.full_name} is now ${ROLE_LABELS[role]}.`);
    } catch (err: any) {
      setError(err.message || 'Could not change role');
    }
  };

  const changeTrainer = async (user: UserProfile, trainerId: string) => {
    setError('');
    setNotice('');
    try {
      await assignTrainer(user.id, trainerId || null);
      patchUser(user.id, { assigned_trainer_id: trainerId || null });
      const trainer = trainers.find((t) => t.id === trainerId);
      setNotice(trainer ? `${user.full_name} is now coached by ${trainer.full_name}.` : `${user.full_name} has no trainer now.`);
    } catch (err: any) {
      setError(err.message || 'Could not assign trainer');
    }
  };

  return (
    <>
      <Helmet>
        <title>Users & Roles | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">ACCESS CONTROL</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            USERS & <span className="text-gym-primary">ROLES</span>
          </h1>
          <p className="text-xs text-gym-muted mt-1">
            New owners and trainers create an account on the Sign Up page, then you give them their role here.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <Input
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-gym-primary" />}
              aria-label="Search users"
            />
          </div>
          <div className="sm:col-span-4">
            <Select
              aria-label="Filter by role"
              options={[{ label: 'All Roles', value: 'all' }, ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ label, value }))]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            />
          </div>
        </div>

        {notice && (
          <div className="bg-gym-success/20 border border-gym-success text-gym-success p-3 rounded-xl flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4" /> {notice}
          </div>
        )}
        {error && <div className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <Card className="p-0 border-gym-border overflow-hidden bg-gym-surface" hoverEffect={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gym-text">
              <thead className="bg-gym-surfaceHover font-heading text-base text-gym-primary uppercase border-b border-gym-border">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email / Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Trainer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {loading && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gym-muted">Loading users...</td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gym-muted">No users found.</td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const editable = canManageUser(profile, u);
                  return (
                    <tr key={u.id} className="hover:bg-gym-surfaceHover/50" data-testid={`user-row-${u.id}`}>
                      <td className="p-4 font-heading text-white text-base uppercase">
                        <div className="flex items-center gap-3">
                          <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                          <span>
                            {u.full_name}
                            {u.id === profile?.id && <span className="ml-2 text-[10px] text-gym-primary">(YOU)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-white font-medium">{u.email}</p>
                        <span className="text-xs text-gym-muted">{u.phone || '—'}</span>
                      </td>
                      <td className="p-4 min-w-[170px]">
                        {editable ? (
                          <Select
                            aria-label={`Role for ${u.full_name}`}
                            options={Array.from(new Set([u.role, ...roleOptions])).map((r) => ({ label: ROLE_LABELS[r], value: r }))}
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value as UserRole)}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-heading uppercase text-gym-primary">
                            <ShieldCheck className="w-4 h-4" /> {ROLE_LABELS[u.role]}
                          </span>
                        )}
                      </td>
                      <td className="p-4 min-w-[190px]">
                        {u.role === 'member' ? (
                          <Select
                            aria-label={`Trainer for ${u.full_name}`}
                            options={[{ label: 'No trainer', value: '' }, ...trainers.map((t) => ({ label: t.full_name, value: t.id }))]}
                            value={u.assigned_trainer_id ?? ''}
                            onChange={(e) => changeTrainer(u, e.target.value)}
                          />
                        ) : (
                          <span className="text-xs text-gym-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
};
