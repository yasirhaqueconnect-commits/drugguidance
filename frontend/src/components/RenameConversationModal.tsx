"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Pencil, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface RenameConversationModalProps {
  isOpen: boolean;
  conversationId: number | null;
  currentTitle: string;
  onClose: () => void;
  onRename: (id: number, newTitle: string) => Promise<void>;
}

export const RenameConversationModal: React.FC<RenameConversationModalProps> = ({
  isOpen,
  conversationId,
  currentTitle,
  onClose,
  onRename,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle || "");
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || !conversationId || saving) return;

    if (cleanTitle === currentTitle.trim()) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onRename(conversationId, cleanTitle);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to rename conversation.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !conversationId) return null;

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors ${
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
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Rename Conversation</h3>
              <p className={`text-[10.5px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Give this case a custom descriptive title
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isLight
                ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className={`block text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Conversation Title
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g. Warfarin & Aspirin Interaction Review"
              maxLength={120}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs outline-none border transition ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500 focus:bg-white"
                  : "bg-slate-900 border-slate-800 text-slate-100 focus:border-teal-500 focus:bg-slate-900"
              }`}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`py-2 px-4 rounded-xl font-bold text-xs border transition cursor-pointer ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="py-2 px-4 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Title"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
