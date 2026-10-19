/**
 * Drug Guidance Clinical API Client.
 * Enterprise HTTP client with token handling, guest session isolation, and strict TypeScript types.
 */

import {
  User,
  UserProfile,
  UserProfileUpdatePayload,
  PharmacistProfileUpdatePayload,
  AuthResponse,
  UserSignupPayload,
  PharmacistSignupPayload,
  LoginPayload,
  ForgotPasswordOtpPayload,
  ResetPasswordVerifyPayload,
  ForgotEmailPayload,
  ForgotEmailResponse,
  ChatResponsePayload,
  ConversationSummary,
  ConversationHistoryDetail,
  ClinicalNote,
  ConversationAuditDossier
} from "@/types";


const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "https://drugguidance.onrender.com"
    : "http://127.0.0.1:8001");

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user_info");
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "An unexpected API error occurred.");
  }
  return data;
}

/**
 * Guest-specific request that NEVER sends the auth token,
 * preventing logged-in user profile data from leaking into guest sessions.
 */
async function guestRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "An unexpected API error occurred.");
  }
  return data;
}

async function downloadFile(endpoint: string, fallbackFilename: string): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.detail || "Failed to download file export.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const api = {
  // Authentication
  userSignup: (data: UserSignupPayload): Promise<AuthResponse> =>
    request<AuthResponse>("/auth/user/signup", { method: "POST", body: JSON.stringify(data) }),

  userLogin: (data: LoginPayload): Promise<AuthResponse> =>
    request<AuthResponse>("/auth/user/login", { method: "POST", body: JSON.stringify(data) }),

  pharmacistSignup: (data: PharmacistSignupPayload): Promise<AuthResponse> =>
    request<AuthResponse>("/auth/pharmacist/signup", { method: "POST", body: JSON.stringify(data) }),

  pharmacistLogin: (data: LoginPayload): Promise<AuthResponse> =>
    request<AuthResponse>("/auth/pharmacist/login", { method: "POST", body: JSON.stringify(data) }),

  // Account Recovery (Forgot Password & Forgot Email)
  sendPasswordResetOtp: (data: ForgotPasswordOtpPayload): Promise<{ status: string; message: string }> =>
    request<{ status: string; message: string }>("/auth/forgot-password/send-otp", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyAndResetPassword: (data: ResetPasswordVerifyPayload): Promise<{ status: string; message: string }> =>
    request<{ status: string; message: string }>("/auth/forgot-password/verify-and-reset", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  forgotEmailFind: (data: ForgotEmailPayload): Promise<ForgotEmailResponse> =>
    request<ForgotEmailResponse>("/auth/forgot-email/find", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: (): Promise<User> =>

    request<User>("/auth/me", { method: "GET" }),

  // Profiles
  getMyProfile: (): Promise<{ profile: UserProfile }> =>
    request<{ profile: UserProfile }>("/profile/me", { method: "GET" }),

  updateUserProfile: (data: UserProfileUpdatePayload): Promise<{ status: string; message: string }> =>
    request<{ status: string; message: string }>("/profile/user", { method: "PUT", body: JSON.stringify(data) }),

  updatePharmacistProfile: (data: PharmacistProfileUpdatePayload): Promise<{ status: string; message: string }> =>
    request<{ status: string; message: string }>("/profile/pharmacist", { method: "PUT", body: JSON.stringify(data) }),

  // Conversations & History
  getConversations: (params?: { q?: string; bookmarked?: boolean; category?: string; sort?: string }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
    if (params?.bookmarked) queryParts.push(`bookmarked=true`);
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return request<any>(`/conversations${queryString}`, { method: "GET" });
  },

  createConversation: (title?: string, category?: string): Promise<ConversationSummary> =>
    request<ConversationSummary>("/conversations", { method: "POST", body: JSON.stringify({ title, category }) }),

  getConversationMessages: (id: number): Promise<ConversationHistoryDetail> =>
    request<ConversationHistoryDetail>(`/conversations/${id}`, { method: "GET" }),

  deleteConversation: (id: number): Promise<{ status: string }> =>
    request<{ status: string }>(`/conversations/${id}`, { method: "DELETE" }),

  renameConversation: (id: number, title: string): Promise<{ status: string; title: string }> =>
    request<{ status: string; title: string }>(`/conversations/${id}/rename`, { method: "PATCH", body: JSON.stringify({ title }) }),

  // Pharmacist Clinical Audits & Notes
  toggleBookmark: (id: number): Promise<{ status: string; is_bookmarked: boolean }> =>
    request<{ status: string; is_bookmarked: boolean }>(`/conversations/${id}/bookmark`, { method: "POST" }),

  getNotes: (id: number): Promise<ClinicalNote[]> =>
    request<ClinicalNote[]>(`/conversations/${id}/notes`, { method: "GET" }),

  addNote: (id: number, note: string): Promise<ClinicalNote> =>
    request<ClinicalNote>(`/conversations/${id}/notes`, { method: "POST", body: JSON.stringify({ note }) }),

  getConversationDetails: (id: number): Promise<ConversationAuditDossier> =>
    request<ConversationAuditDossier>(`/conversations/${id}/details`, { method: "GET" }),

  exportPDF: (id: number): Promise<void> =>
    downloadFile(`/conversations/${id}/export/pdf`, `pharmacist_report_conv_${id}.pdf`),

  exportCSV: (id: number): Promise<void> =>
    downloadFile(`/conversations/${id}/export/csv`, `pharmacist_report_conv_${id}.csv`),

  // Clinical Assistant RAG Query
  sendChatMessage: (message: string, conversationId?: number | null): Promise<ChatResponsePayload> =>
    request<ChatResponsePayload>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversation_id: conversationId }),
    }),

  // Guest Chat - explicitly skips auth token so user profile never leaks into guest sessions
  sendGuestChatMessage: (message: string, conversationId?: number | null): Promise<ChatResponsePayload> =>
    guestRequest<ChatResponsePayload>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversation_id: conversationId, role: "guest" }),
    }),

  // File Upload
  uploadDocument: (formData: FormData): Promise<any> =>
    request("/api/upload", {
      method: "POST",
      body: formData,
    }),
};
