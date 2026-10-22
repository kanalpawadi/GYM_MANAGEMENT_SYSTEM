import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ChatPanel } from './ChatPanel';
import { NoticeBoard } from '../notices/NoticeBoard';
import { MemberPortalLayout } from '../../pages/member/MemberPortalLayout';
import { isNoticeActive, sortNotices, type Notice } from '../../services/chat';
import { makeProfile, seed, signInAs, supabaseMock, table } from '../../test/supabaseMock';
import { renderPortal } from '../../test/renderPortal';

const coach = makeProfile('trainer', { id: 'coach', full_name: 'Coach Arjun' });
const other = makeProfile('trainer', { id: 'coach2', full_name: 'Coach Sam' });
const owner = makeProfile('owner', { id: 'owner', full_name: 'Gym Owner' });
const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', assigned_trainer_id: 'coach', approval_status: 'approved' });
const ravi = makeProfile('member', { id: 'ravi', full_name: 'Ravi Kale', approval_status: 'approved' });

const chat = (route = '/messages') => renderPortal(<Routes><Route path="*" element={<ChatPanel />} /></Routes>, { route });
const board = (compact = false) => renderPortal(<Routes><Route path="*" element={<NoticeBoard compact={compact} allHref="/portal/notices" />} /></Routes>);

describe('One-to-one chat', () => {
  it('a member sees their trainer and gym staff, but not other members or other trainers', async () => {
    seed('profiles', [coach, other, owner, ravi]);
    signInAs(asha);
    chat();
    expect(await screen.findByRole('button', { name: /chat with coach arjun/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chat with gym owner/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /chat with ravi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /chat with coach sam/i })).not.toBeInTheDocument();
  });

  it('a member sends their trainer a message', async () => {
    seed('profiles', [coach, owner]);
    signInAs(asha);
    chat();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /chat with coach arjun/i }));
    await user.type(screen.getByLabelText(/message coach arjun/i), 'Can I skip legs today?');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    const log = screen.getByRole('log');
    expect(await within(log).findByText('Can I skip legs today?')).toBeInTheDocument();
    expect(table('messages')[0]).toMatchObject({ sender_id: 'asha', recipient_id: 'coach', body: 'Can I skip legs today?' });
  });

  it('Enter sends, Shift+Enter adds a new line, and empty messages are not sent', async () => {
    seed('profiles', [coach]);
    signInAs(asha);
    chat('/messages?with=coach');
    const user = userEvent.setup();
    const box = await screen.findByLabelText(/message coach arjun/i);

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
    await user.type(box, 'Line one{Shift>}{Enter}{/Shift}line two{Enter}');
    expect(table('messages')).toHaveLength(1);
    expect(table('messages')[0].body).toBe('Line one\nline two');
    expect(box).toHaveValue('');
  });

  it('the trainer sees unread messages, opens the chat and they are marked read', async () => {
    seed('profiles', [asha, ravi, owner]);
    seed('messages', [
      { id: 'm1', sender_id: 'asha', recipient_id: 'coach', body: 'Hi coach', read_at: null, created_at: '2026-10-22T09:00:00Z' },
      { id: 'm2', sender_id: 'asha', recipient_id: 'coach', body: 'Are you in today?', read_at: null, created_at: '2026-10-22T09:01:00Z' },
    ]);
    signInAs(coach);
    chat();
    const user = userEvent.setup();

    const row = await screen.findByRole('button', { name: /chat with asha patil, 2 unread/i });
    expect(row).toHaveTextContent('Are you in today?');
    // Trainers can chat with every member.
    expect(screen.getByRole('button', { name: /chat with ravi kale/i })).toBeInTheDocument();

    await user.click(row);
    expect(await within(screen.getByRole('log')).findByText('Hi coach')).toBeInTheDocument();
    expect(supabaseMock.rpc).toHaveBeenCalledWith('mark_chat_read', { p_other: 'asha' });
    expect(table('messages').every((m) => m.read_at)).toBe(true);
    expect(await screen.findByRole('button', { name: /^chat with asha patil$/i })).toBeInTheDocument();
  });

  it('opens a person straight away from a link (?with=)', async () => {
    seed('profiles', [asha]);
    signInAs(coach);
    chat('/messages?with=asha');
    expect(await screen.findByRole('region', { name: /conversation with asha patil/i })).toBeInTheDocument();
  });

  it('shows the error when a message cannot be sent', async () => {
    seed('profiles', [coach]);
    signInAs(asha);
    chat('/messages?with=coach');
    const user = userEvent.setup();
    const { failNextWrite } = await import('../../test/supabaseMock');
    failNextWrite('messages', 'new row violates row-level security policy for table "messages"');
    await user.type(await screen.findByLabelText(/message coach arjun/i), 'hello{Enter}');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(table('messages')).toHaveLength(0);
  });

  it('the member portal menu shows the unread count', async () => {
    seed('messages', [{ id: 'm1', sender_id: 'coach', recipient_id: 'asha', body: 'Drink water', read_at: null, created_at: '2026-10-22T09:00:00Z' }]);
    signInAs(asha);
    renderPortal(<MemberPortalLayout><p>page</p></MemberPortalLayout>);
    expect(await screen.findByLabelText('1 unread')).toBeInTheDocument();
  });
});

describe('Notice board', () => {
  it('a trainer posts a notice and it appears for everyone', async () => {
    signInAs(coach);
    board();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/^title/i), 'Gym closed on Sunday');
    await user.type(screen.getByLabelText(/^notice$/i), 'Maintenance work. See you Monday!');
    await user.click(screen.getByLabelText(/pin to top/i));
    await user.click(screen.getByRole('button', { name: /post notice/i }));

    expect(await screen.findByLabelText(/notice: gym closed on sunday/i)).toBeInTheDocument();
    expect(table('notices')[0]).toMatchObject({ title: 'Gym closed on Sunday', pinned: true, created_by: 'coach' });
  });

  it('members read notices but cannot post or delete', async () => {
    seed('notices', [{ id: 'n1', title: 'Diwali timings', body: '6-10 AM only', pinned: false, expires_on: null, created_by: 'owner', created_at: '2026-10-20T10:00:00Z' }]);
    signInAs(asha);
    board();
    expect(await screen.findByLabelText(/notice: diwali timings/i)).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: /post a notice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete diwali timings/i })).not.toBeInTheDocument();
  });

  it('a trainer can delete their own notice but not the owner’s', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    seed('notices', [
      { id: 'n1', title: 'Owner notice', body: 'x', pinned: false, expires_on: null, created_by: 'owner', created_at: '2026-10-20T10:00:00Z' },
      { id: 'n2', title: 'My notice', body: 'y', pinned: false, expires_on: null, created_by: 'coach', created_at: '2026-10-21T10:00:00Z' },
    ]);
    signInAs(coach);
    board();
    const user = userEvent.setup();

    await screen.findByLabelText(/notice: owner notice/i);
    expect(screen.queryByRole('button', { name: /delete owner notice/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /delete my notice/i }));
    expect(await screen.findByText('Owner notice')).toBeInTheDocument();
    expect(screen.queryByText('My notice')).not.toBeInTheDocument();
    expect(table('notices')).toHaveLength(1);
  });

  it('the dashboard card shows only current notices, pinned first', async () => {
    seed('notices', [
      { id: 'n1', title: 'Old offer', body: 'gone', pinned: false, expires_on: '2020-01-01', created_by: 'owner', created_at: '2026-10-22T10:00:00Z' },
      { id: 'n2', title: 'New batch', body: 'Evening batch starts', pinned: false, expires_on: null, created_by: 'owner', created_at: '2026-10-21T10:00:00Z' },
      { id: 'n3', title: 'Important', body: 'Fees due', pinned: true, expires_on: null, created_by: 'owner', created_at: '2026-10-01T10:00:00Z' },
    ]);
    signInAs(asha);
    board(true);
    const card = await screen.findByLabelText(/latest notices/i);
    expect(await within(card).findByText(/important/i)).toBeInTheDocument();
    expect(within(card).getByText(/new batch/i)).toBeInTheDocument();
    expect(within(card).queryByText(/old offer/i)).not.toBeInTheDocument();
    expect(card.textContent!.indexOf('Important')).toBeLessThan(card.textContent!.indexOf('New batch'));
    expect(within(card).getByRole('link', { name: /see all notices/i })).toHaveAttribute('href', '/portal/notices');
  });

  it('sorting and expiry helpers', () => {
    const n = (id: string, pinned: boolean, created_at: string) => ({ id, pinned, created_at }) as Notice;
    expect(sortNotices([n('a', false, '2026-10-02'), n('b', true, '2026-10-01'), n('c', false, '2026-10-03')]).map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(isNoticeActive({ expires_on: null }, '2026-10-22')).toBe(true);
    expect(isNoticeActive({ expires_on: '2026-10-22' }, '2026-10-22')).toBe(true);
    expect(isNoticeActive({ expires_on: '2026-10-21' }, '2026-10-22')).toBe(false);
  });
});
