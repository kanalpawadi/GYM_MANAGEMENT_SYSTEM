import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import { Crown, ExternalLink, MessageCircle, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ExportMenu } from '../../components/ui/ExportMenu';
import { useCardTable } from '../../utils/useCardTable';
import { Avatar } from '../../components/account/Avatar';
import { Membership, currentMembership, listMembers, listMemberships, localDay } from '../../services/gym';
import type { UserProfile } from '../../types';

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
type Tier = 'all' | 'premium' | 'normal';

export const AdminMembers: React.FC = () => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tier, setTier] = useState<Tier>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tableRef = useCardTable();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;

  useEffect(() => {
    Promise.all([listMembers(), listMemberships()])
      .then(([m, ms]) => {
        setMembers(m);
        setMemberships(ms);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const today = localDay();
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members
      .filter((m) => tier === 'all' || (m.membership_tier ?? 'normal') === tier)
      .filter((m) => !term || m.full_name.toLowerCase().includes(term) || (m.phone ?? '').includes(term) || (m.member_code ?? '').toLowerCase().includes(term))
      .map((m) => {
        const ms = currentMembership(memberships.filter((x) => x.member_id === m.id));
        const status = !ms ? 'none' : ms.status === 'active' && ms.end_date >= today ? (ms.start_date > today ? 'upcoming' : 'active') : 'expired';
        return { m, ms, status };
      });
  }, [members, memberships, tier, search, today]);

  const counts = {
    all: members.length,
    premium: members.filter((m) => m.membership_tier === 'premium').length,
    normal: members.filter((m) => (m.membership_tier ?? 'normal') === 'normal').length,
  };

  const exportSpec = () => ({
    title: tier === 'all' ? 'Members' : `${tier === 'premium' ? 'Premium' : 'Normal'} members`,
    filename: `rv-fitness-members-${today}`,
    rows: rows.map(({ m, ms, status }) => ({
      member_id: m.member_code ?? '',
      name: m.full_name,
      phone: m.phone ?? '',
      email: m.email,
      type: m.membership_tier ?? 'normal',
      plan: ms?.plan_title ?? '',
      valid_till: ms?.end_date ?? '',
      status: status === 'none' ? 'no plan' : status,
    })),
  });

  const STATUS_STYLE: Record<string, string> = {
    active: 'text-gym-success border-gym-success/40 bg-gym-success/10',
    upcoming: 'text-sky-400 border-sky-400/40 bg-sky-400/10',
    expired: 'text-gym-danger border-gym-danger/40 bg-gym-danger/10',
    none: 'text-gym-muted border-gym-border',
  };

  return (
    <>
      <Helmet>
        <title>Members | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">MEMBERSHIP DIRECTORY</span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
              MEMBER <span className="text-gym-primary">MANAGEMENT</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportMenu getSpec={exportSpec} label="Export" disabled={!rows.length} />
          </div>
        </div>
        <p className="text-xs text-gym-muted -mt-3">New members join by signing up on the website (Google or email). Open a member to change their details, plans or type.</p>

        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="flex rounded-xl border border-gym-border overflow-hidden w-fit" role="tablist">
            {(['all', 'premium', 'normal'] as Tier[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tier === t}
                onClick={() => setTier(t)}
                className={`px-4 py-2 text-xs font-heading capitalize ${tier === t ? 'bg-gold-gradient text-black' : 'text-gym-muted hover:text-white'}`}
              >
                {t === 'all' ? 'All' : t === 'premium' ? 'Premium' : 'Normal'} ({counts[t]})
              </button>
            ))}
          </div>
          <div className="md:w-80">
            <Input aria-label="Search members" placeholder="Name, phone or member ID" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4 text-gym-primary" />} />
          </div>
        </div>

        {notice && <div role="status" className="bg-gym-success/15 border border-gym-success/60 text-gym-success p-3 rounded-xl text-sm">{notice}</div>}
        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <Card hoverEffect={false} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table ref={tableRef} className="table-cards w-full text-left text-sm">
              <thead className="bg-gym-surfaceHover font-heading text-gym-primary">
                <tr>
                  <th className="p-4">Member</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Valid till</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {loading && (
                  <tr><td colSpan={6} className="p-6 text-center text-gym-muted">Loading members...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gym-muted">No members found.</td></tr>
                )}
                {rows.map(({ m, ms, status }) => (
                  <tr key={m.id} className="hover:bg-gym-surfaceHover/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={m.avatar_url} name={m.full_name} size="sm" zoomable />
                        <div className="min-w-0">
                          <p className="font-heading text-white flex items-center gap-1.5">
                            {m.full_name}
                            {m.membership_tier === 'premium' && <Crown className="w-3.5 h-3.5 text-gym-primary" aria-label="Premium" />}
                          </p>
                          <p className="text-xs text-gym-muted">{m.member_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-white">{m.phone || '—'}</p>
                      <p className="text-xs text-gym-muted">{m.email}</p>
                    </td>
                    <td className="p-4">{ms?.plan_title || '—'}</td>
                    <td className="p-4 text-gym-muted">{fmt(ms?.end_date)}</td>
                    <td className="p-4">
                      <span className={`text-xs font-heading px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[status]}`}>{status === 'none' ? 'No plan' : status}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                        <Link to={`/admin/messages?with=${m.id}`} aria-label={`Message ${m.full_name}`} className="inline-flex items-center gap-1 text-gym-primary text-xs font-heading hover:underline">
                          <MessageCircle className="w-4 h-4" /> Message
                        </Link>
                        <Link to={`/admin/members/${m.id}`} aria-label={`Open ${m.full_name}`} className="inline-flex items-center gap-1 text-gym-primary text-xs font-heading hover:underline">
                          <ExternalLink className="w-4 h-4" /> Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
};
