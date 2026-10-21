import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../context/AuthContext';
import { ContentProvider } from '../content/ContentContext';

/** Renders with the real Auth + Content providers (pair with supabaseMock). */
export function renderPortal(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <HelmetProvider>
      <AuthProvider>
        <ContentProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </ContentProvider>
      </AuthProvider>
    </HelmetProvider>,
  );
}

/** Prints the current path so tests can assert on redirects. */
export const CurrentPath: React.FC = () => <span data-testid="path">{useLocation().pathname}</span>;
