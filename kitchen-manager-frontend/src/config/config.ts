import { useMemo } from 'react';

export const BASE_URL = import.meta.env.API_BASE_URL || 'http://localhost:3000';

export const useApiBaseUrl = () => {
  const organizationSlug = window.location.pathname.split('/')[1];
  return useMemo(() => {
    return `${BASE_URL}`;
  }, [organizationSlug]);
};