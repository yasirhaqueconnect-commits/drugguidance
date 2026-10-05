"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  Bookmark,
  Clock,
  User,
  Shield,
  Building2,
  BookOpen,
  FileSpreadsheet,
  AlertTriangle,
  Tag,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  BadgeCheck,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

interface ConversationDetailsDrawerProps {
  isOpen: boolean;
  conversationId: number | null;
  onClose: () => void;
  onBookmarkToggle?: (id: number) => void;
  onAddNote?: (id: number) => void;
}

export const ConversationDetailsDrawer: React.FC<ConversationDetailsDrawerProps> = ({
  isOpen,
  conversationId,
  onClose,
  onBookmarkToggle,
  onAddNote,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen && conversationId) {
      loadDetails();
    } else {
      setDetails(null);
      setError(null);
    }
  }, [isOpen, conversationId]);

  const loadDetails = async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getConversationDetails(conversationId);
      setDetails(data);
    } catch (err: any) {
      setError(err.message || "Failed to load conversation details.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!conversationId || exportingPdf) return;
    setExportingPdf(true);
    try {
      await api.exportPDF(conversationId);
    } catch (err: any) {
      alert(`PDF Export Error: ${err.message}`);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    if (!conversationId || exportingCsv) return;
    setExportingCsv(true);
    try {
      await api.exportCSV(conversationId);
    } catch (err: any) {
      alert(`CSV Export Error: ${err.message}`);
    } finally {
      setExportingCsv(false);
    }
  };

  const toggleSources = (idx: number) => {
    setExpandedSources((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!isOpen || !conversationId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity animate-fade-in cursor-pointer"
      />

      {/* Drawer Container */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[560px] z-50 flex flex-col h-full shadow-2xl transition-transform duration-300 border-l ${
          isLight
            ? "bg-slate-50 border-slate-200/90 text-slate-900"
            : "bg-gray-950 border-slate-800 text-slate-100"
        }`}
      >
        {/* Top Header Bar */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 z-10 ${
            isLight ? "bg-white/95 border-slate-200 shadow-xs" : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden pr-2">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-inner">
              <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  Clinical Session Details
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  Case #{conversationId}
                </span>
              </div>
              <p className={`text-[11px] font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Pharmacist Documentation &amp; Audit Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {details && onBookmarkToggle && (
              <button
                onClick={() => {
                  onBookmarkToggle(conversationId);
                  setDetails((prev: any) => ({ ...prev, is_bookmarked: !prev?.is_bookmarked }));
                }}
                className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                  details.is_bookmarked
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                    : isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-400"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400"
                }`}
                title={details.is_bookmarked ? "Remove Bookmark" : "Bookmark Case"}
              >
                <Bookmark className={`w-4 h-4 ${details.is_bookmarked ? "fill-amber-400 text-amber-500" : ""}`} />
              </button>
            )}

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
              }`}
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-400">Loading clinical case documentation...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
              {error}
            </div>
          ) : details ? (
            <>
              {/* Executive Clinical Summary Card */}
              <div
                className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-900"
                    : "bg-slate-900 border-slate-800 text-slate-100"
                }`}
              >
                {/* Category & Bookmark Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                    <span>{details.category || "General Consultation"}</span>
                  </div>

                  {details.is_bookmarked && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      <Bookmark className="w-3 h-3 fill-amber-400 text-amber-500" /> Bookmarked
                    </span>
                  )}
                </div>

                {/* Case Title */}
                <div>
                  <h3 className="font-extrabold text-base leading-snug text-slate-900 dark:text-slate-100">
                    {details.title}
                  </h3>
                </div>

                {/* 2x2 Structured Clinical Metadata Grid */}
                <div className={`grid grid-cols-2 gap-3.5 pt-4 border-t text-xs ${isLight ? "border-slate-100" : "border-slate-800/80"}`}>
                  <div className="space-y-1">
                    <span className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" /> Date &amp; Time
                    </span>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {new Date(details.created_at).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" /> Pharmacist Practitioner
                    </span>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {details.pharmacist?.full_name || "Licensed Pharmacist"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-slate-400" /> License Registration
                    </span>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {details.pharmacist?.license_number || "P-123456"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-slate-400" /> Organization
                    </span>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {details.pharmacist?.pharmacy_organization || "Central Hospital Pharmacy"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Toolbar: Sleek Export & Note Buttons */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? "bg-white hover:bg-rose-50/50 text-slate-800 border-slate-200 hover:border-rose-300"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-rose-500/50"
                  }`}
                >
                  <div className="w-5 h-5 rounded-lg bg-rose-500 text-white flex items-center justify-center text-[9.5px] font-black shrink-0 shadow-xs">
                    PDF
                  </div>
                  <span>{exportingPdf ? "Exporting..." : "Export PDF"}</span>
                </button>

                <button
                  onClick={handleExportCsv}
                  disabled={exportingCsv}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? "bg-white hover:bg-emerald-50/50 text-slate-800 border-slate-200 hover:border-emerald-300"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-emerald-500/50"
                  }`}
                >
                  <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[9.5px] font-black shrink-0 shadow-xs">
                    CSV
                  </div>
                  <span>{exportingCsv ? "Exporting..." : "Export CSV"}</span>
                </button>

                {onAddNote && (
                  <button
                    onClick={() => onAddNote(conversationId)}
                    className="py-2.5 px-3 rounded-2xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-white" />
                    <span>Add Note</span>
                  </button>
                )}
              </div>

              {/* Original Query Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Original Pharmacist Inquiry</span>
                </div>
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed font-medium ${
                    isLight
                      ? "bg-white border-l-4 border-l-teal-500 border-slate-200 text-slate-900 shadow-xs"
                      : "bg-slate-900 border-l-4 border-l-teal-500 border-slate-800 text-slate-100"
                  }`}
                >
                  {details.original_query}
                </div>
              </div>

              {/* Private Clinical Notes Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>Private Clinical Notes ({details.notes?.length || 0})</span>
                  </div>
                  {onAddNote && (
                    <button
                      onClick={() => onAddNote(conversationId)}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 transition cursor-pointer"
                    >
                      + Add Note
                    </button>
                  )}
                </div>

                {details.notes?.length === 0 ? (
                  <div
                    onClick={() => onAddNote && onAddNote(conversationId)}
                    className={`p-4 rounded-2xl border border-dashed text-center text-xs cursor-pointer transition ${
                      isLight
                        ? "bg-white hover:bg-slate-100/80 border-slate-300 text-slate-500"
                        : "bg-slate-900/50 hover:bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <p className="font-semibold text-xs">No clinical notes recorded yet.</p>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold block mt-1">
                      + Click here to add a private note
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {details.notes?.map((n: any) => (
                      <div
                        key={n.id}
                        className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                          isLight
                            ? "bg-amber-50/90 border-amber-200/90 text-amber-950 shadow-xs"
                            : "bg-amber-950/30 border-amber-800/60 text-amber-100"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10.5px] text-amber-800/80 dark:text-amber-400 font-bold pb-1.5 border-b border-amber-200/60 dark:border-amber-800/40">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>
                              {new Date(n.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          </span>
                          <span>Clinical Note</span>
                        </div>
                        <p className="whitespace-pre-wrap font-medium text-xs pt-1">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Case Transcript & Evidence Citations */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Case Transcript &amp; Evidence Sources</span>
                </div>

                <div className="space-y-4">
                  {details.messages?.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border shadow-xs text-xs space-y-3 ${
                        m.role === "user"
                          ? isLight
                            ? "bg-white border-slate-200 text-slate-900"
                            : "bg-slate-900 border-slate-800 text-slate-100"
                          : isLight
                          ? "bg-white border-slate-200/90 text-slate-800"
                          : "bg-slate-900 border-slate-800 text-slate-200"
                      }`}
                    >
                      {/* Message Header */}
                      <div className="flex items-center justify-between font-bold text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          {m.role === "user" ? (
                            <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">
                              Rx
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold">
                              AI
                            </div>
                          )}
                          <span className={m.role === "user" ? "text-teal-700 dark:text-teal-400 font-extrabold" : "text-cyan-700 dark:text-cyan-400 font-extrabold"}>
                            {m.role === "user" ? "Pharmacist Inquiry" : "DrugGuide Evidence Synthesis"}
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400 font-medium">
                          {m.created_at
                            ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="whitespace-pre-wrap leading-relaxed font-normal text-xs">{m.content}</p>

                      {/* Evidence Citations Section */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <button
                            onClick={() => toggleSources(idx)}
                            className="flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 w-full cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Verified Citations ({m.sources.length} Documents)</span>
                            </span>
                            {expandedSources[idx] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {expandedSources[idx] && (
                            <div className="space-y-2 pt-1 animate-fade-in">
                              {m.sources.map((s: any, sIdx: number) => (
                                <div
                                  key={sIdx}
                                  className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                                    isLight
                                      ? "bg-slate-50 border-slate-200 text-slate-700"
                                      : "bg-slate-950 border-slate-800 text-slate-300"
                                  }`}
                                >
                                  <div className="font-bold text-teal-600 dark:text-teal-400 text-[10px] mb-1">
                                    Evidence Document #{s.id || sIdx + 1}
                                  </div>
                                  <p>{s.snippet || s.text || String(s)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Footer */}
              <div className={`p-4 rounded-2xl border text-center text-[10.5px] leading-relaxed ${
                isLight ? "bg-slate-100/70 border-slate-200 text-slate-500" : "bg-slate-900/50 border-slate-800 text-slate-400"
              }`}>
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 mx-auto mb-1" />
                <span>Confidential Medical Documentation. Authorized clinical records maintained for practitioner review.</span>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
};
