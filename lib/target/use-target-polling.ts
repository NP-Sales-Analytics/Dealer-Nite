'use client';

import { useEffect } from 'react';
import type { QueryClient } from '@tanstack/react-query';

export function targetPollingInterval() {
  return typeof document !== 'undefined' && document.visibilityState === 'visible' ? 10_000 : false;
}

export function useTargetVisibilityRefresh(queryClient: QueryClient) {
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['targets'] });
      }
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [queryClient]);
}
