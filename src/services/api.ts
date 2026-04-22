/**
 * API Client Service
 * Centralized API communication with error handling, retries, and timeouts
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || "10000", 10);
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  retry?: number;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Make a fetch request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: FetchOptions = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || this.timeout,
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Retry logic for failed requests
   */
  private async retryRequest(
    url: string,
    options: FetchOptions,
    attempt: number = 1,
  ): Promise<Response> {
    try {
      return await this.fetchWithTimeout(url, options);
    } catch (error: any) {
      const retries = options.retry ?? MAX_RETRIES;

      // Only retry on network errors or timeout, not on client errors
      if (
        attempt < retries &&
        (error.name === "AbortError" || !navigator.onLine)
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * attempt),
        );
        return this.retryRequest(url, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Generic GET request
   */
  async get<T = any>(
    endpoint: string,
    options?: FetchOptions,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.retryRequest(url, {
        ...options,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generic POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: FetchOptions,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.retryRequest(url, {
        ...options,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "An error occurred",
          status: response.status,
        };
      }

      return {
        success: true,
        data: data as T,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to parse response",
        status: 500,
      };
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: any): ApiResponse<never> {
    console.error("API Error:", error);

    if (error.name === "AbortError") {
      return {
        success: false,
        error: "Request timeout. Please try again.",
        status: 408,
      };
    }

    if (!navigator.onLine) {
      return {
        success: false,
        error: "No internet connection",
        status: 0,
      };
    }

    return {
      success: false,
      error: error.message || "An unexpected error occurred",
      status: 500,
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// ====================================
// API Service Methods
// ====================================

export const ApiService = {
  // Health check
  async checkHealth() {
    return apiClient.get("/api/health");
  },

  // Consultations
  async submitConsultation(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location?: string;
    preferredDate?: string;
    message?: string;
  }) {
    return apiClient.post("/api/consultations", data, { retry: 1 });
  },

  // Newsletter
  async subscribeNewsletter(email: string) {
    return apiClient.post("/api/subscribe", { email }, { retry: 1 });
  },

  // Blog
  async getBlogPosts(limit = 10, offset = 0, category?: string) {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (category) params.append("category", category);
    return apiClient.get(`/api/blog-posts?${params}`);
  },

  async getBlogPost(id: string | number) {
    return apiClient.get(`/api/blog-posts/${id}`);
  },

  // Visitor tracking
  async trackVisit(pageUrl: string, referrer?: string) {
    return apiClient.post(
      "/api/track-visit",
      { pageUrl, referrer },
      { retry: 0 },
    );
  },

  // Admin methods
  async getConsultations(
    token: string,
    limit = 100,
    offset = 0,
    status?: string,
  ) {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (status) params.append("status", status);
    return apiClient.get(`/api/consultations?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getSubscribers(token: string, limit = 100, offset = 0) {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    return apiClient.get(`/api/subscribers?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getVisitorStats(token: string) {
    return apiClient.get("/api/visitor-stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createBlogPost(token: string, data: any) {
    return apiClient.post("/api/blog-posts", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
