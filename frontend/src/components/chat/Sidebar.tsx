import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Trash2,
  Clock,
  Info,
  User as UserIcon,
  X,
  Search,
  Star,
  MoreVertical,
  FileText,
  Eye,
  Download,
  FileSpreadsheet,
  SlidersHorizontal,
  ArrowUpDown,
  Bookmark,
  Pencil,
  ArrowLeft,
  LogIn
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export interface ConversationItem {
  id: number;
  title: string;
  created_at?: string;
  updated_at?: string;
  is_bookmarked?: boolean;
  category?: string;
  notes_count?: number;
  snippet?: string;
}

import { formatConversationTime } from "@/lib/dateUtils";

function formatCleanTitle(title: string): string {
  if (!title) return "Medical Query";
  const clean = title.trim();
  if (clean.toLowerCase() === "hi" || clean.toLowerCase() === "hello") {
    return "General Consultation";
  }
  return clean.length > 28 ? clean.substring(0, 26) + "..." : clean;
}

export interface SidebarProps {
  conversations: ConversationItem[];
  activeConversationId?: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: number) => void;
  isGuest?: boolean;
  isPharmacist?: boolean;
  theme?: "dark" | "light";
  isOpen?: boolean;
  user?: any;
  onOpenProfile?: () => void;
  onToggleSidebar?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  selectedCategory?: string;
  onCategorySelect?: (cat: string) => void;
  selectedSort?: string;
  onSortSelect?: (sort: string) => void;
  onToggleBookmark?: (id: number) => void;
  onAddNote?: (id: number) => void;
  onViewDetails?: (id: number) => void;
  onRenameConversation?: (id: number, currentTitle: string) => void;
  onExportPDF?: (id: number) => void;
  onExportCSV?: (id: number) => void;
}

const FILTER_CHIPS = ["All", "Bookmarked", "Notes"];

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isGuest,
  isPharmacist: propIsPharmacist,
  theme: propTheme,
  isOpen = true,
  user,
  onOpenProfile,
  onToggleSidebar,
  searchQuery = "",
  onSearchChange,
  selectedCategory = "All",
  onCategorySelect,
  selectedSort = "newest",
  onSortSelect,
  onToggleBookmark,
  onAddNote,
  onViewDetails,
  onRenameConversation,
  onExportPDF,
  onExportCSV,
}) => {
  const pathname = usePathname();
  const { theme } = useTheme();
  const currentTheme = propTheme || theme;
  const isLight = currentTheme === "light";

  const [deletingConvId, setDeletingConvId] = useState<number | null>(null);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [showFilterPills, setShowFilterPills] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const isPharmacist = propIsPharmacist !== undefined
    ? propIsPharmacist
    : (user?.role?.toLowerCase() === "pharmacist" || Boolean(pathname?.includes("/pharmacist")));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const distance = touchStartXRef.current - touchEndXRef.current;
      // Right to Left swipe detected (dragged left by > 30px)
      if (distance > 30 && onToggleSidebar) {
        onToggleSidebar();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Instant 0ms Client-Side Filtering
  const displayedConversations = useMemo(() => {
    let list = [...conversations];

    // Instant Category Filter
    if (selectedCategory === "Bookmarked") {
      list = list.filter((c) => c.is_bookmarked);
    } else if (selectedCategory === "Notes") {
      list = list.filter((c) => (c.notes_count && c.notes_count > 0));
    }

    return list;
  }, [conversations, selectedCategory]);

  const handleSelect = (id: number) => {
    onSelectConversation(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024 && onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const handleNew = () => {
    onNewChat();
    if (typeof window !== "undefined" && window.innerWidth < 1024 && onToggleSidebar) {
      onToggleSidebar();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay (Click outside anywhere to close sidebar) */}
      <div
        onClick={() => {
          if (onToggleSidebar) onToggleSidebar();
        }}
        className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity animate-fade-in cursor-pointer"
      />

      <aside
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 lg:w-72 h-full lg:h-[100dvh] flex flex-col pt-4 px-4 pb-0 shrink-0 transition-all duration-300 border-r shadow-2xl lg:shadow-none overflow-hidden select-none ${isLight ? "bg-white border-slate-200/80 text-slate-800" : "bg-gray-950 border-slate-800 text-slate-100"
          }`}
      >
        {/* Brand Header — Restored PharmRAG AI Logo & Identity */}
        <div className="flex items-center justify-between mb-5 px-1 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <img src="/images/rag-system-logo.png" alt="PharmRAG Logo" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">
                {isPharmacist ? "Pharmacist Portal" : isGuest ? "Guest Portal" : "User Portal"}
              </h1>
              <p className={`text-[10px] font-semibold ${isPharmacist ? "text-purple-600 dark:text-purple-400" : isGuest ? "text-cyan-600 dark:text-cyan-400" : isLight ? "text-teal-600" : "text-teal-400"}`}>
                {isPharmacist ? "Pharmacist Workspace" : isGuest ? "Instant Clinical Guidance" : "User Workspace"}
              </p>
            </div>
          </div>

          {/* Mobile Close X Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`lg:hidden p-2 rounded-xl border transition flex items-center justify-center shrink-0 cursor-pointer shadow-xs ${isLight
                ? "bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 border-slate-200"
                : "bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800 text-slate-300 border-slate-800"
                }`}
              title="Close Sidebar"
              aria-label="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary + New Chat Pill Button */}
        <button
          onClick={handleNew}
          className={`w-full py-2.5 px-4 mb-3 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 border shrink-0 ${isLight
            ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-xs"
            : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
            }`}
        >
          <Plus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>New chat</span>
        </button>

        {/* Chat History Section Title & Controls */}
        <div className="flex items-center justify-between mb-2 px-1 shrink-0">
          <div
            className={`text-[10px] font-extrabold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-slate-500"
              }`}
          >
            Chat History
          </div>

          {onSearchChange && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearchInput((prev) => !prev)}
                className={`p-1 rounded-lg border transition ${showSearchInput || searchQuery
                  ? "bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400"
                  : isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400"
                  }`}
                title="Search conversations..."
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowFilterPills((prev) => !prev)}
                className={`p-1 rounded-lg border transition ${showFilterPills || (selectedCategory && selectedCategory !== "All")
                  ? "bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400"
                  : isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400"
                  }`}
                title="Filter Bookmarks & Notes"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Search Input Box */}
        {showSearchInput && onSearchChange && (
          <div className="mb-2.5 relative shrink-0">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className={`w-full py-1.5 pl-7 pr-7 rounded-xl text-xs outline-none border transition ${isLight
                ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                : "bg-slate-900 border-slate-800 text-slate-100 focus:border-teal-500"
                }`}
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-rose-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Filter Chips: All, Bookmarked, Notes with Customized Icons */}
        {showFilterPills && onCategorySelect && (
          <div className="mb-3 shrink-0 flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {FILTER_CHIPS.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onCategorySelect(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${isSelected
                    ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                    : isLight
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"
                    }`}
                >
                  {cat === "Bookmarked" ? (
                    <Bookmark className={`w-3.5 h-3.5 ${isSelected ? "fill-white text-white" : "fill-amber-400 text-amber-500"}`} />
                  ) : cat === "Notes" ? (
                    <FileText className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-teal-500"}`} />
                  ) : null}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Guest Mode Notice */}
        {isGuest ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div
              className={`p-3 mb-3 rounded-2xl border text-xs flex items-start gap-2 ${isLight
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                }`}
            >
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-relaxed">
                Guest mode does not save chat history. Sign in to save past sessions.
              </span>
            </div>
            <div className="flex-1 min-h-0" />
          </div>
        ) : displayedConversations.length === 0 ? (
          <div
            className={`flex-1 flex flex-col items-center justify-center text-xs p-4 text-center ${isLight ? "text-slate-400" : "text-slate-500"
              }`}
          >
            <MessageSquare className="w-7 h-7 mb-2 opacity-40" />
            <p className="text-xs">
              {searchQuery ? "No matching conversations found." : "No chat history found."}
            </p>
          </div>
        ) : (
          /* Conversation History List Scroll Container */
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar" ref={menuRef}>
            {displayedConversations.map((c) => {
              const isActive = activeConversationId === c.id;
              const displayTitle = formatCleanTitle(c.title);
              const isMenuOpen = activeMenuId === c.id;
              const timeStr = formatConversationTime(c.updated_at || c.created_at);

              return (
                <div key={c.id} className="relative group">
                  <div
                    onClick={() => handleSelect(c.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition ${isActive
                      ? isLight
                        ? "bg-teal-50 text-teal-900 font-bold"
                        : "bg-teal-500/15 text-teal-300 font-bold"
                      : isLight
                        ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-1 flex-1 min-w-0">
                      {c.is_bookmarked ? (
                        <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                      ) : (
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-teal-600" : isLight ? "text-slate-400" : "text-slate-500"
                            }`}
                        />
                      )}
                      <div className="overflow-hidden flex-1 min-w-0">
                        <span className="truncate text-xs block">{displayTitle}</span>
                      </div>
                      {c.notes_count && c.notes_count > 0 ? (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[9px] font-extrabold flex items-center gap-1 shrink-0"
                          title={`${c.notes_count} Clinical Note(s)`}
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span>{c.notes_count}</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Right side: Time + Three Dot Options */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {timeStr && (
                        <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">{timeStr}</span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : c.id);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition"
                        title="Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Three-Dot Popover Dropdown Menu */}
                  {isMenuOpen && (
                    <div
                      className={`absolute right-2 top-8 z-50 w-44 rounded-xl border shadow-xl py-1 text-xs animate-fade-in ${isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-200"
                        }`}
                    >
                      {onToggleBookmark && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark(c.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-teal-500/10 hover:text-teal-600 transition"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${c.is_bookmarked ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
                          <span>{c.is_bookmarked ? "Remove Bookmark" : "Bookmark"}</span>
                        </button>
                      )}

                      {onAddNote && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddNote(c.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-teal-500/10 hover:text-teal-600 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-500" />
                          <span>Add Note</span>
                        </button>
                      )}

                      {onViewDetails && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(c.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-teal-500/10 hover:text-teal-600 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-500" />
                          <span>View Details</span>
                        </button>
                      )}

                      {onRenameConversation && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRenameConversation(c.id, c.title);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-indigo-500/10 hover:text-indigo-600 transition"
                        >
                          <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Rename</span>
                        </button>
                      )}

                      {onExportPDF && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportPDF(c.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-rose-500/10 hover:text-rose-600 transition"
                        >
                          <Download className="w-3.5 h-3.5 text-rose-500" />
                          <span>Export PDF</span>
                        </button>
                      )}

                      {onExportCSV && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportCSV(c.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-emerald-500/10 hover:text-emerald-600 transition"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Export CSV</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingConvId(c.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom User Medical Profile Button */}
        {user && onOpenProfile && (
          <div className={`mt-auto pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t shrink-0 ${isLight ? "border-slate-100" : "border-slate-800/80"}`}>
            <button
              onClick={onOpenProfile}
              className={`w-full py-2.5 px-3.5 rounded-xl border transition-all flex items-center gap-2.5 text-xs font-bold cursor-pointer shadow-sm ${isLight
                  ? "bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-200"
                  : "bg-teal-950/60 hover:bg-teal-900/80 text-teal-200 border-teal-800"
                }`}
              title="Open Profile"
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isLight ? "bg-teal-600 text-white" : "bg-teal-500/20 text-teal-400"
                }`}>
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className="truncate">Profile ({user.full_name})</span>
            </button>
          </div>
        )}

        {/* Bottom Guest Action Button: Home */}
        {isGuest && (
          <div className={`mt-auto pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t shrink-0 ${isLight ? "border-slate-100" : "border-slate-800/80"}`}>
            <Link
              href="/"
              className={`w-full py-2.5 px-3.5 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm ${isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800"
                }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        )}
      </aside>

      {/* Delete Confirmation Modal */}
      {deletingConvId !== null && (
        <div className="fixed inset-0 z-50 p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl space-y-4 text-center ${isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-900 text-slate-100 border-slate-800"
              }`}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-base mb-1">Delete Conversation?</h3>
              <p className={`text-xs leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Are you sure you want to delete this chat history session? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingConvId(null)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs border transition cursor-pointer ${isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deletingConvId !== null) {
                    onDeleteConversation(deletingConvId);
                    setDeletingConvId(null);
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
