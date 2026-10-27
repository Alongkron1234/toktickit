import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionsTakenSection } from '../../components/ActionsTakenSection';

const members = [
  { id: 6, name: 'Alex Thompson', role: 'IT_STAFF' },
  { id: 7, name: 'Kevin Patel', role: 'IT_STAFF' },
];

const openAction = {
  id: 1,
  ticketId: 5,
  actionAt: '2026-05-13T10:40:00.000Z',
  description: 'Replace battery',
  result: null,
  performedBy: { id: 6, name: 'Alex Thompson', role: 'IT_STAFF' },
  assignee: null,
  followUpRequired: true,
  followUpNote: 'Check next week',
  attachmentNotes: 'See photo.jpg',
  status: 'OPEN',
};
const doneAction = { ...openAction, id: 2, description: 'Restart service', status: 'COMPLETED', result: 'Done', followUpRequired: false, followUpNote: null };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function mockFetch(actions: unknown[], extra?: (url: string, init?: RequestInit) => Response | undefined) {
  const fn = vi.fn((url: string, init?: RequestInit) => {
    const custom = extra?.(url, init);
    if (custom) return Promise.resolve(custom);
    return Promise.resolve(json({ success: true, data: { actions } }));
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

const renderStaff = () =>
  render(
    <ActionsTakenSection ticketId={5} getHeaders={() => ({ Authorization: 'Bearer t' })} readOnly={false} performerName="Alex Thompson" members={members} />
  );

describe('Lab 4 Actions Taken UI', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('UI-01: shows the empty state', async () => {
    mockFetch([]);
    renderStaff();
    expect(await screen.findByText('No actions have been recorded for this Ticket yet.')).toBeInTheDocument();
  });

  it('UI-02: lists actions with status, follow-up badge and OPEN-only controls', async () => {
    mockFetch([openAction, doneAction]);
    renderStaff();
    expect(await screen.findByText('Replace battery')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('✓ Completed')).toBeInTheDocument();
    expect(screen.getByText(/Follow-up required/, { selector: 'span span, span' })).toBeInTheDocument();
    expect(screen.getByText('No result yet')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Complete' })).toHaveLength(1);
  });

  it('UI-03: create form validates description and follow-up note below the fields', async () => {
    const fetchFn = mockFetch([]);
    renderStaff();
    await screen.findByText(/No actions have been recorded/);
    fireEvent.click(screen.getByRole('button', { name: 'Add Action Taken' }));
    expect(screen.getByLabelText('Performed By')).toHaveAttribute('readonly');

    fireEvent.click(screen.getByLabelText('Follow-up required'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));
    expect(await screen.findByText('Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Follow-up note is required.')).toBeInTheDocument();
    expect(fetchFn.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === 'POST')).toHaveLength(0);
  });

  it('UI-04: saving posts the action and refreshes the list', async () => {
    let posted: any = null;
    const fetchFn = mockFetch([], (url, init) => {
      if (init?.method === 'POST') {
        posted = JSON.parse(init.body as string);
        return json({ success: true, data: { ...openAction, id: 9 } }, 201);
      }
      return undefined;
    });
    renderStaff();
    await screen.findByText(/No actions have been recorded/);
    fireEvent.click(screen.getByRole('button', { name: 'Add Action Taken' }));
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Restart service' } });
    fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted.description).toBe('Restart service');
    expect(posted.assigneeId).toBe(7);
    expect(posted.performedById).toBeUndefined();
    expect(await screen.findByText(/Action added\./)).toBeInTheDocument();
    expect(fetchFn.mock.calls.filter(([, i]) => !(i as RequestInit | undefined)?.method).length).toBeGreaterThanOrEqual(2);
  });

  it('UI-04 (complete): completing requires a result', async () => {
    let completed = false;
    mockFetch([openAction], (url, init) => {
      if (init?.method === 'POST' && url.endsWith('/complete')) {
        completed = true;
        return json({ success: true, data: { ...openAction, status: 'COMPLETED', result: 'Fixed' } });
      }
      return undefined;
    });
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: 'Complete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete Action' }));
    expect(await screen.findByText('Result is required to complete an action.')).toBeInTheDocument();
    expect(completed).toBe(false);
    fireEvent.change(screen.getByLabelText(/Result/), { target: { value: 'Fixed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete Action' }));
    await waitFor(() => expect(completed).toBe(true));
  });

  it('UI-04 (cancel): cancel asks for confirmation and Keep Open dismisses it', async () => {
    let cancelled = false;
    mockFetch([openAction], (url, init) => {
      if (init?.method === 'POST' && url.endsWith('/cancel')) {
        cancelled = true;
        return json({ success: true, data: { ...openAction, status: 'CANCELLED' } });
      }
      return undefined;
    });
    renderStaff();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.getByText(/It can't be edited afterwards/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep Open' }));
    expect(cancelled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Action' }));
    await waitFor(() => expect(cancelled).toBe(true));
  });

  it('UI-01 (failure): load failure shows a safe message with Retry', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('boom'))) as unknown as typeof fetch;
    renderStaff();
    expect(await screen.findByText("We couldn't load the actions.")).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('UI-08: requester view is read-only and uses the requester endpoint', async () => {
    const fetchFn = mockFetch([openAction]);
    render(<ActionsTakenSection ticketId={5} getHeaders={() => ({})} readOnly />);
    expect(await screen.findByText('Replace battery')).toBeInTheDocument();
    expect(fetchFn.mock.calls[0][0]).toBe('/api/tickets/5/actions');
    for (const name of ['Add Action Taken', 'Edit', 'Complete', 'Cancel']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('STYLE-01: status badges use the Lab 4 colors with text labels', async () => {
    mockFetch([openAction, doneAction, { ...doneAction, id: 3, status: 'CANCELLED' }]);
    renderStaff();
    expect(await screen.findByText('Open')).toHaveStyle({ color: 'rgb(2, 132, 199)' });
    expect(screen.getByText('✓ Completed')).toHaveStyle({ color: 'rgb(22, 163, 74)' });
    expect(screen.getByText('Cancelled')).toHaveStyle({ color: 'rgb(71, 85, 105)' });
  });
});
