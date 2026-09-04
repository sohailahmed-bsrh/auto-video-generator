export class APIError extends Error {
  public status?: number;
  public data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

const getBaseUrl = (): string => {
  // Use VITE_API_URL if defined (set to /api for Vite proxy), fallback for direct access
  return (import.meta as any).env?.VITE_API_URL || '/api';
};

/**
 * Standardized API client for interacting with the backend.
 */
export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' });
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * For binary responses (audio buffer).
   */
  async postForBuffer(endpoint: string, data?: any): Promise<ArrayBuffer> {
    const url = `${getBaseUrl()}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errJson = await response.json();
        errorMessage = errJson.error || errorMessage;
      } catch {
        errorMessage = response.statusText;
      }
      throw new APIError(errorMessage, response.status);
    }

    return response.arrayBuffer();
  },
};

async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;

  try {
    const response = await fetch(url, options);

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();

      // 202 Accepted — treat as success (async submit acknowledged)
      if (response.status === 202) {
        return data as T;
      }

      if (!response.ok) {
        throw new APIError(data.error || 'API request failed', response.status, data);
      }

      // Treat success:false as passthrough for provider-not-configured state
      // so components can handle it without an exception being thrown
      if (
        data &&
        typeof data === 'object' &&
        'success' in data &&
        data.success === false
      ) {
        if (data.status === 'VIDEO_PROVIDER_NOT_CONFIGURED') {
          return data as T;
        }
        throw new APIError(data.error || 'Operation failed', response.status || 500, data);
      }

      return data as T;
    }

    if (!response.ok) {
      throw new APIError(response.statusText, response.status);
    }

    const text = await response.text();
    return text as unknown as T;

  } catch (error: any) {
    if (error instanceof APIError) throw error;

    const msg = error.message || 'Unknown network error';
    let hint = '';

    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      hint = ' — Backend may be offline or CORS mismatch. Ensure the backend is running on port 5000.';
    }

    throw new APIError(`${msg}${hint}`, 0);
  }
}
