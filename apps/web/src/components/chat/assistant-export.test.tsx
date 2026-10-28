import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MemberChatWidget, openMemberChat } from './MemberChatWidget';
import { HealthAssistant } from './HealthAssistant';
import { AdminMembers } from '../../pages/admin/AdminMembers';
import { ExportMenu } from '../ui/ExportMenu';
import { exportTable, toHtmlDocument } from '../../utils/exportTable';
import { makeProfile, seed, signInAs } from '../../test/supabaseMock';
import { CurrentPath, renderPortal } from '../../test/renderPortal';

const coach = makeProfile('trainer', { id: 'coach', full_name: 'Coach Arjun' });
const asha = makeProfile('member', { id: 'asha', full_name: 'Asha Patil', assigned_trainer_id: 'coach', approval_status: 'approved' });

const apiReply = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('Member chat popup', () => {
  it('opens from the floating button with Messages and AI Trainer tabs', async () => {
    seed('profiles', [coach]);
    signInAs(asha);
    renderPortal(<MemberChatWidget />);
    const user = userEvent.setup();

    expect(screen.queryByRole('dialog', { name: 'Chat' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /^open chat/i }));
    const dialog = screen.getByRole('dialog', { name: 'Chat' });
    expect(await within(dialog).findByRole('button', { name: /chat with coach arjun/i })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('tab', { name: /ai trainer/i }));
    expect(within(dialog).getByText(/I'm Coach RV, your RV Fitness AI trainer/)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Chat' })).not.toBeInTheDocument();
  });

  it('"Chat in app" opens the popup straight into the trainer conversation', async () => {
    seed('profiles', [coach]);
    signInAs(asha);
    renderPortal(<MemberChatWidget />);
    await screen.findByRole('button', { name: /^open chat/i });
    act(() => openMemberChat('coach'));
    expect(await screen.findByRole('region', { name: /conversation with coach arjun/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to chats/i })).toBeInTheDocument();
  });
});

describe('Health assistant', () => {
  it('sends the question with the sign-in token and shows the reply', async () => {
    signInAs(asha);
    const fetchSpy = apiReply({ success: true, reply: 'Drink about 3 litres of water a day.' });
    renderPortal(<HealthAssistant />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/ask the ai trainer/i), 'How much water should I drink?{Enter}');
    expect(await screen.findByText('Drink about 3 litres of water a day.')).toBeInTheDocument();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/health-assistant$/);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-asha');
    expect(JSON.parse(init.body as string).messages).toEqual([{ role: 'user', content: 'How much water should I drink?' }]);
  });

  it('suggestion chips ask straight away', async () => {
    signInAs(asha);
    apiReply({ success: true, reply: 'About 1.6 g per kg.' });
    renderPortal(<HealthAssistant />);
    await userEvent.setup().click(screen.getByRole('button', { name: /how much protein/i }));
    expect(await screen.findByText('About 1.6 g per kg.')).toBeInTheDocument();
  });

  it('shows the server message when the assistant is not set up', async () => {
    signInAs(asha);
    apiReply({ error: { message: 'The health assistant is not set up yet. Please ask the gym to add the Grok API key.' } }, 503);
    renderPortal(<HealthAssistant />);
    await userEvent.setup().type(screen.getByLabelText(/ask the ai trainer/i), 'Diet tips?{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(/not set up yet/);
  });

  it('keeps the conversation when the popup is reopened', async () => {
    signInAs(asha);
    apiReply({ success: true, reply: 'Sleep 7 to 9 hours.' });
    const first = renderPortal(<HealthAssistant />);
    await userEvent.setup().type(screen.getByLabelText(/ask the ai trainer/i), 'How much sleep?{Enter}');
    await screen.findByText('Sleep 7 to 9 hours.');
    first.unmount();
    renderPortal(<HealthAssistant />);
    expect(screen.getByText('How much sleep?')).toBeInTheDocument();
  });
});

describe('Members list', () => {
  it('each member has a Message button that opens a direct chat', async () => {
    seed('profiles', [asha]);
    signInAs(makeProfile('owner'));
    renderPortal(
      <>
        <Routes>
          <Route path="/admin/members" element={<AdminMembers />} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
        <CurrentPath />
      </>,
      { route: '/admin/members' },
    );
    const link = await screen.findByRole('link', { name: /message asha patil/i });
    expect(link).toHaveAttribute('href', '/admin/messages?with=asha');
  });
});

describe('Export in CSV, PDF and HTML', () => {
  const spec = { title: 'Members', filename: 'members', rows: [{ member_id: 'RVF-0001', name: 'Asha <Patil>', status: 'active' }] };

  it('the export menu offers the three formats', async () => {
    const user = userEvent.setup();
    renderPortal(<ExportMenu getSpec={() => spec} />);
    await user.click(screen.getByRole('button', { name: /export/i }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((b) => b.textContent)).toEqual([
      expect.stringContaining('CSV'),
      expect.stringContaining('PDF'),
      expect.stringContaining('HTML'),
    ]);
  });

  it('CSV and HTML download files', async () => {
    const created: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      created.push(b as Blob);
      return 'blob:x';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    });

    exportTable('csv', spec);
    exportTable('html', spec);

    expect(clicks).toEqual(['members.csv', 'members.html']);
    const csv = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(created[0]);
    });
    expect(csv).toContain('member_id,name,status');
    expect(csv).toContain('RVF-0001');
    expect(created[1].type).toContain('text/html');
  });

  it('PDF opens a print-ready page, and explains blocked pop-ups', () => {
    const write = vi.fn();
    const fakeWin = { document: { open: vi.fn(), write, close: vi.fn() } };
    vi.spyOn(window, 'open').mockReturnValueOnce(fakeWin as unknown as Window).mockReturnValueOnce(null);

    exportTable('pdf', spec);
    expect(write.mock.calls[0][0]).toContain('window.print()');
    expect(() => exportTable('pdf', spec)).toThrow(/allow pop-ups/i);
  });

  it('the HTML document has the gym heading and escapes names', () => {
    const html = toHtmlDocument(spec, new Date('2026-10-23T10:00:00Z'));
    expect(html).toContain('RV <span>FITNESS</span> · Members');
    expect(html).toContain('<th>Member Id</th>');
    expect(html).toContain('Asha &lt;Patil&gt;');
    expect(html).not.toContain('Asha <Patil>');
  });

  it('refuses to export an empty list', () => {
    expect(() => exportTable('csv', { ...spec, rows: [] })).toThrow(/nothing to export/i);
  });
});
