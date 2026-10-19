/**
 * Core TypeScript Type Definitions for Drug Guidance Clinical System.
 * Provides strict type-safety across authentication, profiles, clinical chats, and audit reports.
 */

export type UserRole = "user" | "pharmacist" | "guest";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  age?: number | null;
  gender?: string;
  height?: string;
  weight?: string;
  pregnancy_status?: string;
  allergies?: string;
  medical_conditions?: string;
  current_medications?: string;
}

export interface Pharmacist {
  id: number;
  email: string;
  role: "pharmacist";
  full_name: string;
  phone?: string;
  license_number?: string;
  pharmacy_organization?: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  role: UserRole;
  age?: number | null;
  gender?: string;
  height?: string;
  weight?: string;
  pregnancy_status?: string;
  allergies?: string;
  medical_conditions?: string;
  current_medications?: string;
  phone?: string;
  license_number?: string;
}

export interface UserProfileUpdatePayload {
  age?: number | null;
  gender?: string;
  height?: string;
  weight?: string;
  pregnancy_status?: string;
  allergies?: string;
  medical_conditions?: string;
  current_medications?: string;
}

export interface PharmacistProfileUpdatePayload {
  license_number?: string;
  phone?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    role: string;
    full_name: string;
    phone?: string;
  };
}

export interface UserSignupPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface PharmacistSignupPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  license_number?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordOtpPayload {
  email: string;
  role: "user" | "pharmacist";
}

export interface ResetPasswordVerifyPayload {
  email: string;
  role: "user" | "pharmacist";
  otp_code: string;
  new_password: string;
}

export interface ForgotEmailPayload {
  phone: string;
  role: "user" | "pharmacist";
}

export interface ForgotEmailResponse {
  status: string;
  email: string;
  full_name: string;
  role: string;
  message: string;
}


export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  safety_alert?: boolean;
  emergency?: boolean;
  warnings?: string[];
  sources?: any[];
  disclaimer?: string;
  created_at?: string;
}

export interface ChatRequestPayload {
  message: string;
  conversation_id?: number | null;
  role?: string;
}

export interface ChatResponsePayload {
  conversation_id: number;
  answer: string;
  response?: string;
  safety_alert: boolean;
  emergency: boolean;
  warnings: string[];
  sources: any[];
  disclaimer: string;
}

export interface ConversationSummary {
  id: number;
  title: string;
  category?: string;
  is_bookmarked?: boolean;
  notes_count?: number;
  snippet?: string;
  created_at: string;
  updated_at?: string;
  messages?: ChatMessage[];
}

export interface ConversationHistoryDetail {
  conversation: {
    id: number;
    title: string;
    category?: string;
    is_bookmarked?: boolean;
    created_at: string;
  };
  messages: ChatMessage[];
}

export interface ClinicalNote {
  id: number;
  note: string;
  created_at: string;
}

export interface ConversationAuditDossier {
  id: number;
  title: string;
  category: string;
  is_bookmarked: boolean;
  message_count: number;
  original_query: string;
  pharmacist?: {
    full_name: string;
    license_number: string;
    pharmacy_organization: string;
  } | null;
  notes: ClinicalNote[];
  sources: any[];
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}
