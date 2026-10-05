"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, ChatArea } from "@/components";
import { api } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

export default function GuestChatPage() {
  const { theme } = useTheme();

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.messages) {
      setMessages(conv.messages);
    }
  };

  const handleDeleteConversation = (id: number) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      handleNewChat();
    }
  };

  const handleSendMessage = async (text: string) => {
    setLoading(true);

    const userMsg = { role: "user" as const, content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const res = await api.sendGuestChatMessage(text, activeConversationId);

      const assistantMsg = {
        role: "assistant" as const,
        content: res.answer,
        safety_alert: res.safety_alert,
        emergency: res.emergency,
        warnings: res.warnings,
        sources: res.sources || [],
        disclaimer: res.disclaimer,
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      const realConvId = res.conversation_id || activeConversationId || Date.now();
      if (!activeConversationId) {
        setActiveConversationId(realConvId);
        setConversations((prev) => [
          {
            id: realConvId,
            title: text.length > 28 ? text.slice(0, 26) + "..." : text,
            created_at: new Date().toISOString(),
            messages: finalMessages,
          },
          ...prev,
        ]);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === realConvId ? { ...c, messages: finalMessages } : c
          )
        );
      }
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
    <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-full flex overflow-hidden overscroll-none">
      {/* Left Sidebar - Exact same component and styling across all 3 modules */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isGuest={true}
        isPharmacist={false}
        theme={theme}
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Chat Area - Exact same component, styling, bubbles and composer */}
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
        userRole="GUEST"
        userName="Guest User"
        theme={theme}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        hideHeader={false}
      />
    </div>
  );
}
