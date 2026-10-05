"use client";

import React, { useState, useEffect } from "react";
import { X, FileText, Send, Clock, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

interface PharmacistNoteModalProps {
  isOpen: boolean;
  conversationId: number | null;
  conversationTitle?: string;
  onClose: () => void;
  onNoteAdded?: () => void;
}

export const PharmacistNoteModal: React.FC<PharmacistNoteModalProps> = ({
  isOpen,
  conversationId,
  conversationTitle,
  onClose,
  onNoteAdded,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [noteText, setNoteText] = useState("");
  const [existingNotes, setExistingNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && conversationId) {
      loadNotes();
    } else {
      setNoteText("");
      setExistingNotes([]);
      setError(null);
    }
  }, [isOpen, conversationId]);

  const loadNotes = async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNotes(conversationId);
      setExistingNotes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSave = noteText.trim();
    if (!conversationId || !textToSave || saving) return;

    // 1. Optimistic Instant UI Update (0ms delay)
    const tempId = Date.now();
    const optimisticNote = {
      id: tempId,
      conversation_id: conversationId,
      note: textToSave,
      created_at: new Date().toISOString(),
    };

    setExistingNotes((prev) => [optimisticNote, ...prev]);
    setNoteText("");
    setError(null);
    setSaving(true);

    // Notify parent to increment note counters instantly
    if (onNoteAdded) onNoteAdded();

    try {
      const savedNote = await api.addNote(conversationId, textToSave);
      setExistingNotes((prev) =>
        prev.map((n) => (n.id === tempId ? savedNote : n))
      );
    } catch (err: any) {
      // Revert optimistic note if API fails
      setExistingNotes((prev) => prev.filter((n) => n.id !== tempId));
      setError(err.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !conversationId) return null;

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors ${
          isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-950 text-slate-100 border-slate-800"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Add Pharmacist Note</h3>
              <p className={`text-[10px] truncate max-w-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {conversationTitle || `Conversation #${conversationId}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl border transition ${
              isLight ? "bg-white hover:bg-slate-100 border-slate-200" : "bg-slate-900 hover:bg-slate-800 border-slate-800"
            }`}
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Add Note Form */}
          <form onSubmit={handleSave} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Private Clinical / Review Note
            </label>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="E.g., Potential interaction identified. Further professional review required before dispensing."
              className={`w-full p-3 rounded-xl text-xs outline-none border transition ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                  : "bg-slate-900 border-slate-800 text-slate-100 focus:border-teal-500"
              }`}
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className={`py-2 px-4 rounded-xl text-xs font-bold border transition ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !noteText.trim()}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-md transition disabled:opacity-40 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Note"}</span>
              </button>
            </div>
          </form>

          {/* Previous Notes List */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
            <h4 className="text-xs font-extrabold uppercase tracking-wider mb-3 text-slate-500 dark:text-slate-400">
              Saved Notes ({existingNotes.length})
            </h4>

            {loading ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading notes...</div>
            ) : existingNotes.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No private notes added yet for this conversation.
              </div>
            ) : (
              <div className="space-y-2.5">
                {existingNotes.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      isLight
                        ? "bg-teal-50/60 border-teal-200/80 text-slate-800"
                        : "bg-teal-950/20 border-teal-800/50 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
