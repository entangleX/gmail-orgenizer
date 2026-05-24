const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

// Auth API calls
export const authAPI = {
  getLoginUrl: async (access: 'profile' | 'gmail' = 'gmail') => {
    const params = new URLSearchParams({ access });
    return request<any>(`/api/auth/login?${params.toString()}`);
  },

  handleCallback: async (code: string, state: string, access = 'gmail') => {
    const params = new URLSearchParams({ code, state, access });
    return request<any>(`/api/auth/callback?${params.toString()}`);
  },

  refreshCredentials: async (credentials: any) => {
    return request<any>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ credentials }),
    });
  },

  logout: async () => {
    return request<any>('/api/auth/logout', { method: 'POST' });
  },
};

// Email API calls
export const emailAPI = {
  fetchEmails: async (credentials: any, maxResults: number | 'all' = 100) => {
    return request<any>('/api/emails/fetch', {
      method: 'POST',
      body: JSON.stringify({
        credentials,
        max_results: maxResults,
      }),
    });
  },

  trashEmails: async (credentials: any, messageIds: string[]) => {
    return request<any>('/api/emails/trash', {
      method: 'POST',
      body: JSON.stringify({
        credentials,
        message_ids: messageIds,
      }),
    });
  },

  archiveEmails: async (credentials: any, messageIds: string[]) => {
    return request<any>('/api/emails/archive', {
      method: 'POST',
      body: JSON.stringify({
        credentials,
        message_ids: messageIds,
      }),
    });
  },

  getStats: async (credentials: any) => {
    return request<any>('/api/emails/stats', {
      method: 'POST',
      body: JSON.stringify({ credentials }),
    });
  },
};
