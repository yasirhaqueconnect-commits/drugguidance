"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { api, getAuthToken } from "@/lib/api";
import { History, MessageSquare, Trash2, ArrowRight, Calendar, Stethoscope, Sparkles } from "lucide-react";

import { formatFullDateTime } from "@/lib/dateUtils";

export default function PharmacistChatHistoryPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/pharmacist/login");
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
      if (userData?.role?.toLowerCase() !== "pharmacist") {
        router.push("/user/chat/history");
        return;
      }
      setUser(userData);
      setConversations(Array.isArray(data) ? data : data?.conversations || []);
    } catch (err) {
      router.push("/pharmacist/login");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this clinical consultation log?")) return;
    // 1. Optimistic Instant UI Update (0ms delay)
    setConversations((prev) => prev.filter((c) => c.id !== id));
    // 2. Call backend delete in background
    try {
      await api.deleteConversation(id);
    } catch (err) {
      console.error("Failed to delete consultation log:", err);
      fetchHistoryData();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} theme={theme} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 lg:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-600">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Pharmacist Clinical Archive</h1>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Saved clinical consultations, drug interaction alerts & dosage checks
              </p>
            </div>
          </div>

          <Link
            href="/pharmacist/chat"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Clinical Engine</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading clinical archive...
          </div>
        ) : conversations.length === 0 ? (
          <div className={`p-12 rounded-3xl border text-center ${
            isLight ? "bg-white border-slate-200" : "glass-panel border-slate-800"
          }`}>
            <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold mb-1">No clinical consultation logs found</h3>
            <p className={`text-xs mb-6 max-w-sm mx-auto ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              All queries performed under your Pharmacist account are stored here with evidence citations.
            </p>
            <Link
              href="/pharmacist/chat"
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition inline-flex items-center gap-2"
            >
              <span>Launch Clinical Engine</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`p-5 rounded-2xl border transition group flex flex-col justify-between shadow-md ${
                  isLight ? "bg-white border-slate-200 hover:border-cyan-400" : "glass-card border-slate-800 hover:border-cyan-500/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-600 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5" />
                      Consultation #{c.id}
                    </span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Delete Log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="font-bold text-sm line-clamp-2 mb-2">{c.title || "Clinical Drug Query"}</h3>
                  <div className={`flex items-center gap-1 text-[11px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    <Calendar className="w-3 h-3" />
                    <span>{formatFullDateTime(c.updated_at || c.created_at)}</span>
                  </div>
                </div>

                <Link
                  href="/pharmacist/chat"
                  className={`mt-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border ${
                    isLight ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-800"
                  }`}
                >
                  <span>Open Clinical Session</span>
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
