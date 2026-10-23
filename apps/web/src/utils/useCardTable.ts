import { useCallback, useRef } from 'react';

/**
 * Lets a table turn into stacked cards on phones (the `table-cards` class in index.css).
 * Copies each column heading into its cells' `data-label`, which the phone layout shows
 * next to the value. Returns a callback ref, so it also works for tables that appear later
 * (e.g. inside a tab), and keeps labels up to date when rows change.
 */
export function useCardTable<T extends HTMLTableElement = HTMLTableElement>() {
  const observer = useRef<MutationObserver | null>(null);

  return useCallback((table: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!table) return;
    const apply = () => {
      const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent?.trim() ?? '');
      table.querySelectorAll('tbody tr').forEach((tr) => {
        [...tr.children].forEach((cell, i) => {
          if (!cell.hasAttribute('colspan') && cell.getAttribute('data-label') !== heads[i]) cell.setAttribute('data-label', heads[i] ?? '');
        });
      });
    };
    apply();
    observer.current = new MutationObserver(apply);
    observer.current.observe(table, { childList: true, subtree: true });
  }, []);
}
