import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Dumbbell, Users, Utensils, CheckCircle2, KeyRound, LineChart, Search, Crown, ExternalLink, Globe, QrCode, MessageCircle, Megaphone } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ChangePasswordModal } from '../../components/account/ChangePasswordModal';
import { Avatar } from '../../components/account/Avatar';
import { ProfilePhotoPicker } from '../../components/account/ProfilePhotoPicker';
import { NotificationBell } from '../../components/account/NotificationBell';
import { PlanEditorModal, PlanTarget } from '../../components/plans/PlanEditorModal';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, isStaffRole } from '../../config/roles';
import { ProgressEntry, listProgress, listTrainees } from '../../services/portal';
import { ProgressTimeline } from '../../components/progress/ProgressTimeline';
import { useUnreadMessages } from '../../components/chat/useUnreadMessages';
import type { UserProfile } from '../../types';

export const TrainerDashboard: React.FC = () => {
  const { profile, logout } = useAuth();
  const unread = useUnreadMessages();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PlanTarget>(null);

  const [progressFor, setProgressFor] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState('');

  useEffect(() => {
    if (!profile) return;
    // Admins opening the trainer panel start on "All members".
    if (profile.role !== 'trainer') setTab('all');
    listTrainees(profile)
      .then(setMembers)
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [profile]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members
      .filter((m) => tab === 'all' || m.assigned_trainer_id === profile?.id)
      .filter((m) => !term || m.full_name.toLowerCase().includes(term) || (m.phone ?? '').includes(term) || (m.member_code ?? '').toLowerCase().includes(term));
  }, [members, tab, search, profile?.id]);

  const openProgress = async (member: UserProfile) => {
    setProgressFor(member);
    setProgress([]);
    setProgressError('');
    setProgressLoading(true);
    try {
      setProgress(await listProgress(member.id));
    } catch (err: any) {
      setProgressError(err.message || 'Could not load progress');
    } finally {
      setProgressLoading(false);
    }
  };

  const onSaved = (message: string) => {
    setEditing(null);
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const mineCount = members.filter((m) => m.assigned_trainer_id === profile?.id).length;

  return (
    <>
      <Helmet>
        <title>Trainer Panel | RV Fitness</title>
      </Helmet>

      <div className="min-h-screen bg-gym-bg text-gym-text p-4 sm:p-6 max-w-7xl mx-auto flex flex-col gap-8">
        <div className="bg-gym-surface border border-gym-border p-4 sm:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
            <ProfilePhotoPicker size="lg" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-heading text-gym-primary uppercase">COACH TERMINAL</span>
              <h1 className="text-xl sm:text-3xl font-heading text-white uppercase break-words">{profile?.full_name}</h1>
              <p className="text-xs text-gym-muted break-all">{profile ? ROLE_LABELS[profile.role] : ''} · {profile?.email}</p>
            </div>
            <div className="md:hidden self-start">
              <NotificationBell />
            </div>
          </div>
          <div className="w-full md:w-auto flex flex-col gap-2">
            {/* Main actions: a tidy 3-column grid on phones, one row on wider screens. */}
            <div className="grid grid-cols-3 md:flex md:flex-wrap md:items-center md:justify-end gap-2">
              <span className="hidden md:inline-flex">
                <NotificationBell />
              </span>
              <Link to="/trainer/scan" className="contents md:block">
                <Button variant="primary" size="sm" className="w-full px-2 md:px-4" leftIcon={<QrCode className="w-4 h-4" />}>
                  <span className="md:hidden">Scan</span>
                  <span className="hidden md:inline">Scan Attendance</span>
                </Button>
              </Link>
              <Link to="/trainer/messages" className="contents md:block">
                <Button variant="outline" size="sm" className="w-full px-2 md:px-4" leftIcon={<MessageCircle className="w-4 h-4" />}>
                  {unread ? `Chat (${unread})` : <><span className="md:hidden">Chat</span><span className="hidden md:inline">Messages</span></>}
                </Button>
              </Link>
              <Link to="/trainer/notices" className="contents md:block">
                <Button variant="outline" size="sm" className="w-full px-2 md:px-4" leftIcon={<Megaphone className="w-4 h-4" />}>
                  Notices
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-1 gap-y-1">
              <Link to="/">
                <Button variant="ghost" size="sm" leftIcon={<Globe className="w-4 h-4" />}>Website</Button>
              </Link>
              {isStaffRole(profile?.role) && (
                <Link to="/admin/dashboard">
                  <Button variant="ghost" size="sm">Admin Panel</Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowPassword(true)} leftIcon={<KeyRound className="w-4 h-4" />}>
                <span className="sm:hidden">Password</span>
                <span className="hidden sm:inline">Change Password</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} className="text-gym-danger">
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {successMsg && (
          <div role="status" className="bg-gym-success/20 border border-gym-success text-gym-success p-4 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        <Card hoverEffect={false} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" aria-label="Common plans">
          <div>
            <h2 className="font-heading text-white">Common plans for normal members</h2>
            <p className="text-xs text-gym-muted">Members without a personal plan see these. Premium members get their own plan from you.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" leftIcon={<Utensils className="w-4 h-4" />} onClick={() => setEditing({ kind: 'diet', member: 'common' })}>
              Common Diet
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Dumbbell className="w-4 h-4" />} onClick={() => setEditing({ kind: 'workout', member: 'common' })}>
              Common Workout
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-2xl font-heading text-white uppercase flex items-center gap-2">
              <Users className="w-6 h-6 text-gym-primary" /> Members
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="flex rounded-xl border border-gym-border overflow-hidden" role="tablist">
                {(
                  [
                    ['mine', `My members (${mineCount})`],
                    ['all', `All members (${members.length})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`px-3 py-2 text-xs font-heading ${tab === key ? 'bg-gold-gradient text-black' : 'text-gym-muted hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="sm:w-56">
                <Input aria-label="Search members" placeholder="Name, phone or ID" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4 text-gym-primary" />} />
              </div>
            </div>
          </div>

          {loadError && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{loadError}</div>}
          {loading && <p className="text-sm text-gym-muted">Loading members...</p>}
          {!loading && !loadError && visible.length === 0 && (
            <Card hoverEffect={false}>
              <p className="text-sm text-gym-muted">
                {tab === 'mine'
                  ? 'No members are assigned to you yet. The gym owner assigns members to trainers from Admin → Users & Roles. You can still open any member under "All members".'
                  : 'No members found.'}
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visible.map((m) => (
              <Card key={m.id} className="border-gym-primary/30 flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <Avatar src={m.avatar_url} name={m.full_name} size="lg" zoomable />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-heading text-white uppercase truncate flex items-center gap-2">
                      {m.full_name}
                      {m.membership_tier === 'premium' && <Crown className="w-4 h-4 text-gym-primary shrink-0" aria-label="Premium member" />}
                    </h3>
                    <p className="text-xs text-gym-muted truncate">
                      {m.member_code ? `${m.member_code} · ` : ''}
                      {m.phone || m.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={`/trainer/messages?with=${m.id}`} aria-label={`Message ${m.full_name}`}>
                      <Button variant="ghost" size="sm" leftIcon={<MessageCircle className="w-4 h-4" />}>Message</Button>
                    </Link>
                    <Link to={`/trainer/members/${m.id}`} aria-label={`Open ${m.full_name}`}>
                      <Button variant="ghost" size="sm" leftIcon={<ExternalLink className="w-4 h-4" />}>Open</Button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gym-border">
                  <Button variant="primary" size="sm" className="col-span-2" onClick={() => openProgress(m)} leftIcon={<LineChart className="w-4 h-4" />} aria-label={`View progress for ${m.full_name}`}>
                    View Progress & Photos
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing({ kind: 'workout', member: m })} leftIcon={<Dumbbell className="w-4 h-4 text-gym-primary" />} aria-label={`Workout plan for ${m.full_name}`}>
                    Workout Plan
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing({ kind: 'diet', member: m })} leftIcon={<Utensils className="w-4 h-4 text-gym-primary" />} aria-label={`Diet plan for ${m.full_name}`}>
                    Diet Plan
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <PlanEditorModal target={editing} author={profile} onClose={() => setEditing(null)} onSaved={onSaved} />

        <Modal isOpen={!!progressFor} onClose={() => setProgressFor(null)} maxWidth="2xl" title={progressFor ? `PROGRESS · ${progressFor.full_name}` : ''}>
          {progressError && <p role="alert" className="text-sm text-gym-danger mb-3">{progressError}</p>}
          {progressLoading ? <p className="text-sm text-gym-muted">Loading progress...</p> : progressFor && <ProgressTimeline entries={progress} memberName={progressFor.full_name} />}
        </Modal>

        <ChangePasswordModal isOpen={showPassword} onClose={() => setShowPassword(false)} />
      </div>
    </>
  );
};
