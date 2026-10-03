"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useTheme } from "@/context/ThemeContext";
import { api, getAuthToken } from "@/lib/api";
import { History, MessageSquare, Trash2, ArrowRight, Calendar, Sparkles } from "lucide-react";

import { formatFullDateTime } from "@/lib/dateUtils";

export default function UserChatHistoryPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/user/login");
      return;
    }
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const [userData, data] = await Promise.all([
        api.getMe(),
        api.getConversations()
      ]);
      setUser(userData);
      setConversations(Array.isArray(data) ? data : data?.conversations || []);
    } catch (err) {
      router.push("/user/login");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this conversation history?")) return;
    // 1. Optimistic Instant UI Update (0ms delay)
    setConversations((prev) => prev.filter((c) => c.id !== id));
    // 2. Call backend delete in background
    try {
      await api.deleteConversation(id);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      fetchHistoryData();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} theme={theme} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 lg:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Saved Consultation History</h1>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Review previous medical queries, drug interaction results & prescriptions
              </p>
            </div>
          </div>

          <Link
            href="/user/chat"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start New Query</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading saved consultation history...
          </div>
        ) : conversations.length === 0 ? (
          <div className={`p-12 rounded-3xl border text-center ${
            isLight ? "bg-white border-slate-200" : "glass-panel border-slate-800"
          }`}>
            <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold mb-1">No saved conversations yet</h3>
            <p className={`text-xs mb-6 max-w-sm mx-auto ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Your previous drug queries, interaction checks, and AI recommendations will be automatically saved here.
            </p>
            <Link
              href="/user/chat"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition inline-flex items-center gap-2"
            >
              <span>Ask First Question</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`p-5 rounded-2xl border transition group flex flex-col justify-between shadow-md ${
                  isLight ? "bg-white border-slate-200 hover:border-teal-400" : "glass-card border-slate-800 hover:border-teal-500/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-teal-600 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Session #{c.id}
                    </span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Delete History"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="font-bold text-sm line-clamp-2 mb-2">{c.title || "Medical Query Session"}</h3>
                  <div className={`flex items-center gap-1 text-[11px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    <Calendar className="w-3 h-3" />
                    <span>{formatFullDateTime(c.updated_at || c.created_at)}</span>
                  </div>
                </div>

                <Link
                  href="/user/chat"
                  className={`mt-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border ${
                    isLight ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-800"
                  }`}
                >
                  <span>Open Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
