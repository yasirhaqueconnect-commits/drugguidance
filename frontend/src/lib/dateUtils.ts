/**
 * Date and Time utilities for reliable, timezone-accurate chat timestamps.
 */

/**
 * Safely parses an ISO date/time string from the backend.
 * Appends 'Z' if no timezone is specified to ensure it is interpreted as UTC.
 */
export function parseServerDate(isoStr?: string | null): Date | null {
  if (!isoStr) return null;
  let s = String(isoStr).trim();
  if (!s) return null;
  // If string has no timezone indicator (no 'Z' and no offset like '+05:00' or '-04:00' after date),
  // assume it's UTC from PostgreSQL/FastAPI
  if (!s.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(s)) {
    s += "Z";
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a short relative or clock time for sidebar conversations:
 * - < 60s: "Just now"
 * - Today: "06:15 PM" (exact local clock time of chat)
 * - Yesterday: "Yesterday"
 * - Past 7 days: "2d ago", "3d ago", etc. (strictly positive, never -1d)
 * - Older: "Aug 14" (short date)
 */
export function formatConversationTime(isoStr?: string | null): string {
  if (!isoStr) return "";
  try {
    const d = parseServerDate(isoStr);
    if (!d) return "";
    const now = new Date();

    const diffMs = now.getTime() - d.getTime();
    // Allow up to 2 minutes clock skew for "Just now"
    if (diffMs < 60 * 1000 && diffMs > -2 * 60 * 1000) {
      return "Just now";
    }

    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isYesterday) {
      return "Yesterday";
    }

    const diffDays = Math.floor(Math.max(0, diffMs) / (1000 * 3600 * 24));
    if (diffDays >= 1 && diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return "";
  }
}

/**
 * Formats a message timestamp inside chat bubbles:
 * Displays exact local time e.g. "06:15 PM" (or "Aug 14, 06:15 PM" if different day)
 */
export function formatMessageTimestamp(isoStrOrDate?: string | Date | null): string {
  if (!isoStrOrDate) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  try {
    const d = typeof isoStrOrDate === "string" ? parseServerDate(isoStrOrDate) : isoStrOrDate;
    if (!d) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Formats full date and time for history cards and details view:
 * e.g., "Aug 14, 2026, 06:15 PM"
 */
export function formatFullDateTime(isoStr?: string | null): string {
  if (!isoStr) return "Recent";
  try {
    const d = parseServerDate(isoStr);
    if (!d) return "Recent";
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return "Recent";
  }
}
