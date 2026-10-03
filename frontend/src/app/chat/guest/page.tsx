"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChatArea } from "@/components/ChatArea";
import { api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import { ArrowLeft, Pill, Sun, Moon } from "lucide-react";

export default function GuestChatPage() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    setLoading(true);

    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.sendGuestChatMessage(text, conversationId);

      if (res.conversation_id && !conversationId) {
        setConversationId(res.conversation_id);
      }

      const assistantMsg = {
        role: "assistant" as const,
        content: res.answer,
        safety_alert: res.safety_alert,
        emergency: res.emergency,
        warnings: res.warnings,
        sources: res.sources,
        disclaimer: res.disclaimer,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Request Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden transition-colors ${isLight ? "bg-slate-50 text-slate-900" : "bg-gray-950 text-slate-100"
      }`}>
      {/* Clean Top Header Control Bar with Center "General User" Heading */}
      <div className={`h-16 px-6 lg:px-8 border-b flex items-center justify-between shadow-sm shrink-0 z-20 relative ${isLight ? "bg-white border-slate-200" : "glass-panel border-gray-800"
        }`}>
        {/* Left: Brand / Guest Assistant Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <img src="/images/rag-system-logo.png" alt="PharmRAG Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Guest User
            </h2>
            <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Instant Drug Information Session
            </p>
          </div>
        </div>

        {/* Right Toolbar: Back Button + Theme Button with comfortable padding */}
        <div className="flex items-center gap-2.5 text-xs pr-1 lg:pr-6">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border shadow-sm whitespace-nowrap ${isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </Link>

          <button
            onClick={toggleTheme}
            className={`px-3.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shadow-sm ${isLight
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLight ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          loading={loading}
          userRole="GUEST"
          userName="Guest User"
          theme={theme}
          hideHeader={true}
        />
      </div>
    </div>
  );
}
