import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { DateOfBirthInput, formatDobTyping, isoToDmy, parseDmy } from './DateOfBirthInput';

function Harness({ initial = '', max = '2026-10-23', spy }: { initial?: string; max?: string; spy?: (iso: string, typed: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DateOfBirthInput
        value={value}
        max={max}
        onChange={(iso, typed) => {
          setValue(iso);
          spy?.(iso, typed);
        }}
      />
      <output data-testid="iso">{value}</output>
    </>
  );
}

describe('Date of birth field', () => {
  it('can be typed with the number keyboard; slashes are added automatically', async () => {
    render(<Harness />);
    const box = screen.getByLabelText(/^date of birth$/i);
    expect(box).toHaveAttribute('type', 'text');
    expect(box).toHaveAttribute('inputmode', 'numeric');

    await userEvent.setup().type(box, '25081998');
    expect(box).toHaveValue('25/08/1998');
    expect(screen.getByTestId('iso')).toHaveTextContent('1998-08-25');
  });

  it('typing the slashes yourself also works', async () => {
    render(<Harness />);
    const box = screen.getByLabelText(/^date of birth$/i);
    await userEvent.setup().type(box, '01/02/1999');
    expect(box).toHaveValue('01/02/1999');
    expect(screen.getByTestId('iso')).toHaveTextContent('1999-02-01');
  });

  it('flags dates that do not exist or are in the future', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const box = screen.getByLabelText(/^date of birth$/i);
    const user = userEvent.setup();

    await user.type(box, '31022000');
    expect(screen.getByText(/not a real date/i)).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(spy).toHaveBeenLastCalledWith('', '31/02/2000');

    await user.clear(box);
    await user.type(box, '01012030');
    expect(screen.getByText(/cannot be in the future/i)).toBeInTheDocument();
    expect(screen.getByTestId('iso')).toHaveTextContent('');
  });

  it('shows a saved date and keeps the calendar picker in sync', () => {
    render(<Harness initial="1995-05-01" />);
    expect(screen.getByLabelText(/^date of birth$/i)).toHaveValue('01/05/1995');

    // Picking from the calendar fills the typed box.
    const picker = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(picker.value).toBe('1995-05-01');
    fireEvent.change(picker, { target: { value: '1990-12-31' } });
    expect(screen.getByLabelText(/^date of birth$/i)).toHaveValue('31/12/1990');
    expect(screen.getByTestId('iso')).toHaveTextContent('1990-12-31');
  });

  it('the calendar button opens the phone/browser date picker', async () => {
    render(<Harness />);
    const picker = document.querySelector('input[type="date"]') as HTMLInputElement;
    const showPicker = vi.fn();
    (picker as any).showPicker = showPicker;
    await userEvent.setup().click(screen.getByRole('button', { name: /pick date of birth from calendar/i }));
    expect(showPicker).toHaveBeenCalled();
  });
});

describe('date helpers', () => {
  it.each([
    ['2', '2'],
    ['250', '25/0'],
    ['25081', '25/08/1'],
    ['25/08/1998', '25/08/1998'],
    ['250819981234', '25/08/1998'],
    ['1999-02-01', '01/02/1999'],
  ])('formats %s as %s', (raw, out) => expect(formatDobTyping(raw)).toBe(out));

  it('parses only real dates', () => {
    expect(parseDmy('29/02/2000')).toBe('2000-02-29');
    expect(parseDmy('29/02/2001')).toBeNull();
    expect(parseDmy('32/01/2000')).toBeNull();
    expect(parseDmy('1/1/2000')).toBeNull();
    expect(isoToDmy('2000-02-29')).toBe('29/02/2000');
    expect(isoToDmy(null)).toBe('');
  });
});
