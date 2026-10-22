import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Pin, PinOff, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, roleRank } from '../../config/roles';
import { Notice, createNotice, deleteNotice, isNoticeActive, listNotices, setNoticePinned, todayIST } from '../../services/chat';

const textarea =
  'w-full bg-black text-white placeholder-gym-muted/70 border border-gym-border rounded-xl p-3 text-sm font-body focus:outline-none focus:border-gym-primary';
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

interface Props {
  /** Dashboard card: latest few current notices and a link to the full board. */
  compact?: boolean;
  /** Where "See all notices" goes in compact mode. */
  allHref?: string;
}

/** Gym notice board. Trainers and staff post; everyone reads. */
export const NoticeBoard: React.FC<Props> = ({ compact = false, allHref }) => {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [expires, setExpires] = useState('');
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState('');

  const rank = roleRank(profile?.role);
  const canPost = rank >= 2;
  const canManage = (n: Notice) => canPost && (n.created_by === profile?.id || rank >= 4);

  const load = () =>
    listNotices()
      .then(setNotices)
      .catch((err: Error) => setError(err.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setPosting(true);
    setError('');
    try {
      await createNotice(profile.id, { title, body, pinned, expires_on: expires || null });
      setTitle('');
      setBody('');
      setPinned(false);
      setExpires('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not post the notice');
    } finally {
      setPosting(false);
    }
  };

  const act = async (n: Notice, action: () => Promise<void>) => {
    setBusy(n.id);
    setError('');
    try {
      await action();
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update the notice');
    } finally {
      setBusy('');
    }
  };

  const today = todayIST();
  const shown = compact ? notices.filter((n) => isNoticeActive(n, today)).slice(0, 3) : notices;

  if (compact) {
    if (!loading && shown.length === 0) return null;
    return (
      <Card hoverEffect={false} className="flex flex-col gap-3" aria-label="Latest notices">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-heading text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-gym-primary" /> Notice board
          </h3>
          {allHref && (
            <Link to={allHref} className="text-xs text-gym-primary hover:underline">
              See all notices
            </Link>
          )}
        </div>
        {loading && <p className="text-sm text-gym-muted">Loading notices...</p>}
        {shown.map((n) => (
          <div key={n.id} className="border-l-2 border-gym-primary pl-3">
            <p className="font-heading text-white text-sm flex items-center gap-1.5">
              {n.pinned && <Pin className="w-3.5 h-3.5 text-gym-primary" aria-label="Pinned" />} {n.title}
            </p>
            <p className="text-xs text-gym-muted line-clamp-2 whitespace-pre-line">{n.body}</p>
          </div>
        ))}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {canPost && (
        <Card hoverEffect={false}>
          <form onSubmit={post} className="flex flex-col gap-4" aria-label="Post a notice">
            <h3 className="text-lg font-heading text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-gym-primary" /> Post a notice
            </h3>
            <Input label="Title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gym closed on Sunday" required />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-gym-muted">
              Notice
              <textarea rows={4} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} className={textarea} placeholder="Write the details for members and trainers" required />
            </label>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <Input label="Show until (optional)" type="date" value={expires} min={today} onChange={(e) => setExpires(e.target.value)} />
              <label className="flex items-center gap-2 text-sm text-gym-muted min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-gym-primary w-4 h-4" />
                Pin to top
              </label>
            </div>
            <p className="text-xs text-gym-muted">Everyone (members, trainers and staff) sees it and gets a notification.</p>
            <Button type="submit" variant="primary" isLoading={posting} className="sm:self-start">
              Post Notice
            </Button>
          </form>
        </Card>
      )}

      {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}
      {loading && <p className="text-sm text-gym-muted">Loading notices...</p>}
      {!loading && shown.length === 0 && (
        <Card hoverEffect={false}>
          <p className="text-sm text-gym-muted">No notices yet.</p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {shown.map((n) => {
          const expired = !isNoticeActive(n, today);
          return (
            <Card key={n.id} hoverEffect={false} className={`flex flex-col gap-2 ${n.pinned ? 'border-gym-primary/60' : ''} ${expired ? 'opacity-60' : ''}`} aria-label={`Notice: ${n.title}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading text-white text-lg flex items-center gap-2 break-words min-w-0">
                  {n.pinned && <Pin className="w-4 h-4 text-gym-primary shrink-0" aria-label="Pinned" />}
                  {n.title}
                </h3>
                {canManage(n) && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={busy === n.id}
                      onClick={() => act(n, () => setNoticePinned(n.id, !n.pinned))}
                      className="p-2 rounded-lg text-gym-muted hover:text-gym-primary"
                      aria-label={n.pinned ? `Unpin ${n.title}` : `Pin ${n.title}`}
                    >
                      {n.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      disabled={busy === n.id}
                      onClick={() => {
                        if (window.confirm(`Delete the notice "${n.title}"?`)) void act(n, () => deleteNotice(n.id));
                      }}
                      className="p-2 rounded-lg text-gym-muted hover:text-gym-danger"
                      aria-label={`Delete ${n.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-line break-words">{n.body}</p>
              <p className="text-xs text-gym-muted">
                {n.author ? `${n.author.full_name} (${ROLE_LABELS[n.author.role] ?? n.author.role}) · ` : ''}
                {fmt(n.created_at)}
                {n.expires_on ? ` · ${expired ? 'expired' : 'until'} ${fmt(n.expires_on)}` : ''}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
