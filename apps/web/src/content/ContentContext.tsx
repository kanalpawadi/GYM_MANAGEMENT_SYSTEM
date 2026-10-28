import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_CONTENT, SectionKey, SiteContent } from './sections';
import { fetchSavedContent } from '../services/content';
import { listSubscriptionPlans, toSitePlan } from '../services/plans';
import { SITE } from '../config/site';

type Saved = Partial<Record<SectionKey, Record<string, unknown>>>;

/** Applies saved edits over the built-in defaults. Unknown or empty values fall back. */
export function mergeContent(saved: Saved): SiteContent {
  const merged = { ...DEFAULT_CONTENT } as Record<SectionKey, any>;
  for (const key of Object.keys(DEFAULT_CONTENT) as SectionKey[]) {
    const value = saved[key];
    if (!value || typeof value !== 'object') continue;
    merged[key] = { ...DEFAULT_CONTENT[key], ...value };
  }
  // Prices and durations always come from code: the payment server charges these.
  merged.plans = {
    items: DEFAULT_CONTENT.plans.items.map((plan) => {
      const edited = (merged.plans.items as any[]).find((p) => p?.id === plan.id) ?? {};
      return { ...plan, ...edited, id: plan.id, price: plan.price, months: plan.months };
    }),
  };
  return merged as SiteContent;
}

interface ContentContextValue {
  content: SiteContent;
  loading: boolean;
  /** Re-reads saved content (after the editor saves a section). */
  refresh: () => Promise<void>;
}

// Without a provider (unit tests, error states) pages render the defaults.
const ContentContext = createContext<ContentContextValue>({
  content: DEFAULT_CONTENT,
  loading: false,
  refresh: async () => {},
});

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [saved, plans] = await Promise.all([
        fetchSavedContent(),
        // Owner-managed plans (migration 16); older databases keep the built-in plans.
        listSubscriptionPlans().catch(() => []),
      ]);
      const merged = mergeContent(saved);
      if (plans.length) merged.plans = { items: plans.map(toSitePlan) } as SiteContent['plans'];
      setContent(merged);
    } catch (err) {
      // Keep showing the built-in content if Supabase is unreachable.
      console.error('Failed to load website content', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ content, loading, refresh }), [content, loading, refresh]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};

export const useContentState = () => useContext(ContentContext);

export function useContent<K extends SectionKey>(key: K): SiteContent[K] {
  return useContext(ContentContext).content[key];
}

/** Gym details in the same shape as config/site.ts SITE, with saved edits applied. */
export function useSiteInfo() {
  const site = useContent('site');
  return {
    ...SITE,
    ...site,
    hours: { ...SITE.hours, weekdays: site.hoursWeekdays, sunday: site.hoursSunday },
  };
}

export function usePlans() {
  return useContent('plans').items;
}
