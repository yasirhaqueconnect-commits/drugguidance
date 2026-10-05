"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Paperclip,
  Pill,
  AlertTriangle,
  Siren,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Bot,
  User as UserIcon,
  ShieldAlert,
  X,
  Clock,
  Menu,
  UserCheck,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  PanelLeft,
  Star,
  Copy,
  Check,
  ArrowLeft
} from "lucide-react";
import { api, clearAuthToken } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { formatMessageTimestamp } from "@/lib/dateUtils";

interface MessageItem {
  id?: string | number;
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  safety_alert?: boolean;
  emergency?: boolean;
  warnings?: string[];
  disclaimer?: string;
  timestamp?: string;
}

interface ChatAreaProps {
  messages: MessageItem[];
  onSendMessage: (text: string) => Promise<void>;
  loading: boolean;
  loadingHistory?: boolean;
  userRole?: string;
  userName?: string;
  theme?: "dark" | "light";
  activeConversationId?: number | null;
  onNewChat?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  hideHeader?: boolean;
  activeConversationTitle?: string;
  activeConversationCategory?: string;
  activeConversationDate?: string;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onAddNote?: () => void;
  onViewDetails?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  loading,
  loadingHistory = false,
  userRole,
  userName,
  theme: propTheme,
  activeConversationId,
  onNewChat,
  onOpenProfile,
  onLogout,
  sidebarOpen = true,
  onToggleSidebar,
  hideHeader = false,
  activeConversationTitle,
  activeConversationCategory,
  activeConversationDate,
  isBookmarked = false,
  onToggleBookmark,
  onAddNote,
  onViewDetails,
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const currentTheme = propTheme || theme;
  const isLight = currentTheme === "light";

  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  // Helper to cleanly render markdown bold, tables, and lists
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    const parseInlineStyles = (text: string) => {
      // Split text by **bold** or *italic*
      const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          return (
            <strong key={idx} className="font-bold text-teal-800 dark:text-teal-200">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
          return (
            <em key={idx} className="italic text-slate-600 dark:text-slate-400">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      });
    };

    const rawLines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let tableRows: string[][] = [];

    const flushTable = (keyPrefix: string) => {
      if (tableRows.length === 0) return;
      const headers = tableRows[0];
      const bodyRows = tableRows.slice(1);
      elements.push(
        <div key={`${keyPrefix}-table`} className="my-3 overflow-x-auto rounded-xl border border-teal-200 dark:border-slate-700 bg-teal-50/40 dark:bg-slate-800/40 p-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-teal-200 dark:border-slate-700 bg-teal-100/60 dark:bg-slate-700/60">
                {headers.map((h, i) => (
                  <th key={i} className="p-2 font-bold text-teal-900 dark:text-teal-200">{parseInlineStyles(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((r, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-200/60 dark:border-slate-800/60 last:border-0 hover:bg-teal-100/30 dark:hover:bg-slate-700/30">
                  {r.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 text-slate-700 dark:text-slate-300">{parseInlineStyles(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Ignore table separator lines like |---|---| or |----------|
      if (/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line)) {
        continue;
      }

      // Check table row line starting and ending with | or containing multiple |
      if (line.includes("|") && trimmed.startsWith("|")) {
        const cells = trimmed.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        tableRows.push(cells);
        continue;
      } else {
        flushTable(`table-${i}`);
      }

      if (trimmed === "") {
        elements.push(<div key={`space-${i}`} className="h-1.5" />);
        continue;
      }

      // Horizontal dividers (e.g. ---)
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        elements.push(
          <hr key={`hr-${i}`} className="my-2.5 border-t border-teal-200 dark:border-slate-700/80" />
        );
        continue;
      }

      // Warning / Alert Callout Banner (No logo/icon)
      const cleanWarningCheck = trimmed.replace(/^[\s*•\-#]+/, "").toLowerCase();
      if (trimmed.startsWith("⚠️") || cleanWarningCheck.startsWith("warning:") || cleanWarningCheck.startsWith("**warning:")) {
        const cleanWarningText = trimmed.replace(/^[\s*•\-#⚠️]+/, "");
        elements.push(
          <div key={`alert-${i}`} className="my-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200">
            <div className="font-semibold text-xs leading-relaxed">{parseInlineStyles(cleanWarningText)}</div>
          </div>
        );
        continue;
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${i}`} className="font-bold text-sm text-teal-800 dark:text-teal-300 mt-2 mb-1 flex items-center gap-1.5">
            {parseInlineStyles(trimmed.slice(4))}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${i}`} className="font-bold text-sm sm:text-base text-teal-900 dark:text-teal-200 mt-2.5 mb-1.5">
            {parseInlineStyles(trimmed.slice(3))}
          </h2>
        );
        continue;
      }

      // Bullet points (supports -, *, •)
      if (/^[-*•]\s+/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[-*•]\s+/, "");
        elements.push(
          <div key={`bullet-${i}`} className="flex items-start gap-2.5 pl-1.5 my-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
            <div className="leading-relaxed flex-1">{parseInlineStyles(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Numbered items (e.g. 1. 2.)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2 pl-1.5 my-1 text-xs">
            <span className="font-bold text-teal-700 dark:text-teal-400 shrink-0">{numMatch[1]}.</span>
            <div className="leading-relaxed flex-1">{parseInlineStyles(numMatch[2])}</div>
          </div>
        );
        continue;
      }

      elements.push(
        <div key={`line-${i}`} className="leading-relaxed text-xs">
          {parseInlineStyles(line)}
        </div>
      );
    }

    flushTable("table-end");

    return <div className="space-y-1.5">{elements}</div>;
  };
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});
  const [dots, setDots] = useState(".");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);
  const prevLoadingHistory = useRef(loadingHistory);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 450);
    return () => clearInterval(interval);
  }, [loading]);

  // Only scroll down when a NEW message arrives - never fight user when scrolling up
  useEffect(() => {
    if (messages.length > 0 && messages.length > prevMessagesLength.current) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  // Scroll into view when generating a response
  useEffect(() => {
    if (loading) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [loading]);

  // Initial jump to bottom only after existing history finishes loading
  useEffect(() => {
    if (prevLoadingHistory.current && !loadingHistory && messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
    prevLoadingHistory.current = loadingHistory;
  }, [loadingHistory, messages.length]);

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    } else {
      clearAuthToken();
      router.push("/user/login");
    }
  };

  const promptCards = [
    {
      title: "Allergies",
      desc: "Check potential allergies related to a medicine.",
      query: "What potential allergies are related to Augmentin?",
    },
    {
      title: "Drug Interactions",
      desc: "Check possible interactions between two medicines.",
      query: "Check possible interactions between Brufen and Aspirin.",
    },
    {
      title: "Alternative Medicines",
      desc: "Find suitable alternative brands or drugs.",
      query: "Find suitable alternative medicines for Augmentin.",
    },
    {
      title: "Drug Information",
      desc: "Get information including dosage, side effects, and warnings.",
      query: "Get information about Panadol including dosage, side effects, and warnings.",
    },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await api.uploadDocument(formData);
      setAttachedFile({
        name: res.filename,
        text: res.full_text,
      });
    } catch (err: any) {
      alert(`File Upload Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || loading) return;

    let fullQuery = input.trim();
    if (attachedFile) {
      fullQuery = `${fullQuery}\n\n[Attached Document: ${attachedFile.name}]\n${attachedFile.text}`;
    }

    const textToSend = fullQuery;
    setInput("");
    setAttachedFile(null);
    await onSendMessage(textToSend);
  };

  const toggleSources = (idx: number) => {
    setExpandedSources((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full min-h-0 relative overflow-hidden transition-colors ${isLight
          ? "bg-[#f8fafc] text-slate-900"
          : "bg-gray-950 text-slate-100"
        }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".txt,.pdf,.docx,.jpg,.jpeg,.png"
      />

      {/* Top Sub-Header Bar with Sidebar Toggle, Theme & Red-Accented Logout options */}
      {!hideHeader && (
        <div className={`h-16 px-6 lg:px-8 border-b flex items-center justify-between shrink-0 z-20 transition-colors ${isLight ? "bg-white/95 border-slate-200/80 shadow-xs" : "bg-slate-950/90 border-slate-800"
          }`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Sidebar Toggle Button */}
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className={`p-1.5 rounded-xl border transition flex items-center justify-center shrink-0 ${isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                  }`}
                title={sidebarOpen ? "Collapse Chat History" : "Open Chat History"}
              >
                <PanelLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </button>
            )}

            {/* Active Conversation Title Header Info */}
            {activeConversationTitle && messages.length > 0 ? (
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-sm tracking-tight truncate max-w-xs sm:max-w-md">
                    {activeConversationTitle}
                  </h2>
                  {onToggleBookmark && (
                    <button
                      onClick={onToggleBookmark}
                      className="p-0.5 text-slate-400 hover:text-amber-500 transition shrink-0"
                      title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
                    >
                      <Star className={`w-3.5 h-3.5 ${isBookmarked ? "fill-amber-500 text-amber-500" : ""}`} />
                    </button>
                  )}
                </div>
                {activeConversationDate && (
                  <p className={`text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    Started on {new Date(activeConversationDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>
            ) : (
              <span className="font-extrabold text-sm tracking-tight">
                DrugGuide AI
              </span>
            )}
          </div>

          {/* Theme Toggle, Pharmacist Add Note & Logout Toolbar */}
          <div className="flex items-center gap-2 text-xs pr-1 lg:pr-3">
            {/* Pharmacist Add Note Quick Action */}
            {onAddNote && activeConversationTitle && messages.length > 0 && (
              <button
                onClick={onAddNote}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-sm ${isLight
                    ? "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                    : "bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 border-teal-800"
                  }`}
              >
                <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="hidden sm:inline">Add Note</span>
              </button>
            )}
            {/* Theme Toggle Button - Modern Premium Pill Control */}
            <button
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-2 border shadow-xs cursor-pointer ${
                isLight
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border-amber-300/80 shadow-amber-500/5"
                  : "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 border-indigo-500/40 shadow-indigo-500/10"
              }`}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {isLight ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
                    <Sun className="w-3.5 h-3.5 fill-amber-950" />
                  </div>
                  <span className="font-bold text-slate-800">Light</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                    <Moon className="w-3.5 h-3.5 fill-white" />
                  </div>
                  <span className="font-bold text-slate-100">Dark</span>
                </>
              )}
            </button>

            {/* Premium Red Gradient Logout Button (only if logged in) */}
            {onLogout && userRole !== "GUEST" && (
              <button
                onClick={handleLogoutAction}
                className="px-3.5 py-1.5 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 border border-rose-400/40 shadow-md shadow-rose-500/20 hover:shadow-rose-500/35 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Logout from Account"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Scroll Area with contained overscroll so body never shifts */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-3 sm:px-6 lg:px-8 py-3 sm:py-6 z-10 custom-scrollbar overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
      >
        <div className="max-w-3xl mx-auto w-full space-y-6 pt-2 sm:pt-6 pb-6 touch-pan-y">
          {loadingHistory ? (
            /* YouTube / ChatGPT-style Theme-Adaptive Skeleton Loader (matching Screenshot 3) */
            <div className="w-full space-y-6 animate-pulse max-w-3xl mx-auto py-6">
              {/* User Question Skeleton Bubble */}
              <div className="flex flex-row-reverse items-start gap-3">
                <div className={`w-9 h-9 rounded-2xl shrink-0 ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                <div className={`h-12 w-2/5 rounded-2xl rounded-tr-none ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
              </div>
              {/* Assistant Answer Skeleton Bubble */}
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-2xl shrink-0 ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                <div className="space-y-3 flex-1">
                  <div className={`h-5 w-32 rounded-xl ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                  <div className={`h-24 w-full rounded-2xl ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                  <div className={`h-14 w-4/5 rounded-2xl ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                </div>
              </div>
              {/* Second Conversation Turn Skeleton */}
              <div className="flex flex-row-reverse items-start gap-3 pt-2">
                <div className={`w-9 h-9 rounded-2xl shrink-0 ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                <div className={`h-10 w-1/3 rounded-2xl rounded-tr-none ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-2xl shrink-0 ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                <div className="space-y-3 flex-1">
                  <div className={`h-5 w-28 rounded-xl ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                  <div className={`h-20 w-11/12 rounded-2xl ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Empty / Welcome State matching reference screenshot */
            <div className="py-2 sm:py-8 lg:py-14 text-center flex flex-col items-center justify-center touch-pan-y">
              {/* Center Pure Logo */}
              <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center mb-1.5 sm:mb-3">
                <img src="/images/rag-system-logo.png" alt="PharmRAG Logo" className="w-full h-full object-contain" />
              </div>

              {/* High Contrast Title */}
              <h2 className={`text-xl sm:text-3xl lg:text-4xl font-serif italic tracking-tight font-bold mb-1 sm:mb-2 ${
                isLight ? "text-slate-900" : "text-slate-100"
              }`}>
                {userRole === "USER" && userName ? `Hi, ${userName.split(" ")[0]} — how can I help you?` : "How can I help you?"}
              </h2>
              <p className={`text-[11px] sm:text-xs lg:text-sm max-w-lg leading-relaxed mb-3 sm:mb-6 px-3 ${
                isLight ? "text-slate-600 font-medium" : "text-slate-300"
              }`}>
                I'm trained on Drug resources - ask about symptoms, dosage strategies, drug interactions, or safe treatment options.
              </p>

              {/* 2x2 Grid of 4 Cards: Compact on mobile so all 4 fit on screen without vertical scrolling */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full text-left touch-pan-y">
                {promptCards.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSendMessage(card.query)}
                    className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95 text-left select-none touch-pan-y ${
                      isLight
                        ? "bg-white border-slate-200/90 hover:border-teal-500 shadow-slate-100"
                        : "bg-slate-900/90 border-slate-800 hover:border-teal-500/60"
                    }`}
                  >
                    <h3 className={`font-bold text-[11px] sm:text-xs mb-1 ${
                      isLight ? "text-teal-800" : "text-teal-400"
                    }`}>
                      {card.title}
                    </h3>
                    <p className={`text-[10px] sm:text-[11px] leading-snug line-clamp-2 ${
                      isLight ? "text-slate-600 font-medium" : "text-slate-400"
                    }`}>
                      {card.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 sm:gap-3.5 w-full ${m.role === "user" ? "flex-row-reverse" : ""
                  }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center shrink-0 ${m.role === "user"
                      ? "bg-gradient-to-tr from-teal-600 to-cyan-600 text-white shadow-md"
                      : isLight
                        ? "bg-teal-50 border border-teal-200/80 shadow-xs p-1"
                        : "bg-slate-900 border border-slate-800 shadow-xs p-1"
                    }`}
                >
                  {m.role === "user" ? (
                    <UserIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  ) : (
                    <img src="/images/blue-capsule-icon.png" alt="PharmRAG Pill" className="w-full h-full object-contain" />
                  )}
                </div>

                {/* Message Content Bubble / Card */}
                <div
                  className={`rounded-2xl p-4 sm:p-5 text-xs leading-relaxed border shadow-md min-w-0 max-w-[88%] sm:max-w-xl lg:max-w-2xl break-words overflow-hidden ${m.role === "user"
                      ? "bg-gradient-to-r from-teal-700 to-cyan-800 text-white border-teal-600/40 rounded-tr-none"
                      : isLight
                        ? "bg-white text-slate-800 border-slate-200 rounded-tl-none shadow-slate-200/60"
                        : "bg-slate-900 text-slate-200 border-slate-800 rounded-tl-none"
                    }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-white/10 dark:border-slate-800/80 text-[11px]">
                    <span className="font-bold truncate opacity-90">
                      {m.role === "user" ? userName || "You" : "DrugGuide"}
                    </span>
                    <div className="flex items-center gap-2.5 text-[10px] shrink-0">
                      <span className="flex items-center gap-1 opacity-75">
                        <Clock className="w-3 h-3" />
                        {m.timestamp ? m.timestamp : formatMessageTimestamp((m as any).created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(m.content, idx)}
                        className={`px-1.5 py-0.5 rounded transition flex items-center gap-1 text-[10px] font-semibold cursor-pointer ${
                          m.role === "user"
                            ? "hover:bg-white/20 text-white/90"
                            : "hover:bg-teal-500/10 text-teal-600 dark:text-teal-400"
                        }`}
                        title="Copy message"
                      >
                        {copiedIdx === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Emergency Alert Box */}
                  {m.emergency && (
                    <div className="mb-4 p-4 rounded-xl bg-rose-600/20 border border-rose-500/50 text-rose-500 flex items-start gap-3 animate-pulse">
                      <Siren className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-extrabold text-sm">🚨 EMERGENCY MEDICAL ALERT</strong>
                        <span className="text-xs">Please call emergency services (115/1122) or go to the nearest hospital immediately!</span>
                      </div>
                    </div>
                  )}

                  {/* Main Text Content */}
                  <div className="leading-relaxed space-y-2 break-words overflow-hidden">{renderFormattedContent(m.content)}</div>
                </div>
              </div>
            ))
          )}

          {/* Loading / Transcribing Indicator */}
          {loading && (
            <div className="flex items-center gap-3.5 w-full">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <img src="/images/blue-capsule-icon.png" alt="PharmRAG Pill" className="w-full h-full object-contain animate-spin" />
              </div>
              <div
                className={`rounded-2xl rounded-tl-none p-4 border text-xs flex items-center gap-3 ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
                <span className="font-medium">
                  {`Analyzing${dots}`}
                </span>
              </div>
            </div>
          )}
        </div>

        <div ref={chatBottomRef} />
      </div>

      {/* Floating Bottom Composer Input Pill (matching reference screenshot) */}
      <div className={`w-full px-3 py-2 sm:px-6 sm:py-3 border-t shrink-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
        isLight ? "bg-white/95 border-slate-200/90 shadow-sm" : "bg-gray-950/95 border-slate-900"
      }`}>
        {attachedFile && (
          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-600 text-xs font-medium max-w-3xl mx-auto block">
            <FileText className="w-4 h-4 text-teal-500" />
            <span className="truncate max-w-xs">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-rose-500 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto w-full">
          <div className={`relative flex items-center gap-2 rounded-full px-3.5 py-1.5 sm:px-5 sm:py-2.5 border shadow-sm transition-all ${
            isLight
              ? "bg-white border-teal-300/80 shadow-slate-200/60 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-400/20"
              : "bg-slate-900 border-slate-800 shadow-black/50 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20"
          }`}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message DrugGuide..."
              disabled={loading}
              className={`flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm font-medium outline-none ${
                isLight ? "text-slate-900 placeholder:text-slate-500" : "text-white placeholder:text-slate-400"
              }`}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Prominent Circular Send Button */}
              <button
                type="submit"
                disabled={loading || (!input.trim() && !attachedFile)}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white transition flex items-center justify-center shadow-md disabled:opacity-40 shrink-0"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Subtitle below composer */}
        <div className="mt-1.5 text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Chatbot for Evidence-Based Medical Support
        </div>
      </div>
    </div>
  );
};
