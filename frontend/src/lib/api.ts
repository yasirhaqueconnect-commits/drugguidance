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

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export function clearAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user_info");
  }
}

async function request(endpoint: string, options: RequestInit = {}) {
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

// Guest-specific request that NEVER sends the auth token,
// preventing logged-in user profile data from leaking into guest sessions
async function guestRequest(endpoint: string, options: RequestInit = {}) {
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

async function downloadFile(endpoint: string, fallbackFilename: string) {
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
  // Auth
  userSignup: (data: any) => request("/auth/user/signup", { method: "POST", body: JSON.stringify(data) }),
  userLogin: (data: any) => request("/auth/user/login", { method: "POST", body: JSON.stringify(data) }),
  pharmacistSignup: (data: any) => request("/auth/pharmacist/signup", { method: "POST", body: JSON.stringify(data) }),
  pharmacistLogin: (data: any) => request("/auth/pharmacist/login", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/auth/me", { method: "GET" }),

  // Profiles
  getMyProfile: () => request("/profile/me", { method: "GET" }),
  updateUserProfile: (data: any) => request("/profile/user", { method: "PUT", body: JSON.stringify(data) }),
  updatePharmacistProfile: (data: any) => request("/profile/pharmacist", { method: "PUT", body: JSON.stringify(data) }),

  // Conversations & History
  getConversations: (params?: { q?: string; bookmarked?: boolean; category?: string; sort?: string }) => {
    const queryParts: string[] = [];
    if (params?.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
    if (params?.bookmarked) queryParts.push(`bookmarked=true`);
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return request(`/conversations${queryString}`, { method: "GET" });
  },
  createConversation: (title?: string, category?: string) =>
    request("/conversations", { method: "POST", body: JSON.stringify({ title, category }) }),
  getConversationMessages: (id: number) => request(`/conversations/${id}`, { method: "GET" }),
  deleteConversation: (id: number) => request(`/conversations/${id}`, { method: "DELETE" }),
  renameConversation: (id: number, title: string) =>
    request(`/conversations/${id}/rename`, { method: "PATCH", body: JSON.stringify({ title }) }),

  // Pharmacist Conversation Management
  toggleBookmark: (id: number) => request(`/conversations/${id}/bookmark`, { method: "POST" }),
  getNotes: (id: number) => request(`/conversations/${id}/notes`, { method: "GET" }),
  addNote: (id: number, note: string) => request(`/conversations/${id}/notes`, { method: "POST", body: JSON.stringify({ note }) }),
  getConversationDetails: (id: number) => request(`/conversations/${id}/details`, { method: "GET" }),
  exportPDF: (id: number) => downloadFile(`/conversations/${id}/export/pdf`, `pharmacist_report_conv_${id}.pdf`),
  exportCSV: (id: number) => downloadFile(`/conversations/${id}/export/csv`, `pharmacist_report_conv_${id}.csv`),

  // Chat RAG query
  sendChatMessage: (message: string, conversationId?: number | null) =>
    request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversation_id: conversationId }),
    }),

  // Guest chat - explicitly skips auth token so user profile never leaks into guest sessions
  sendGuestChatMessage: (message: string, conversationId?: number | null) =>
    guestRequest("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversation_id: conversationId }),
    }),

  // File Upload
  uploadDocument: (formData: FormData) =>
    request("/api/upload", {
      method: "POST",
      body: formData,
    }),
};
