"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { UserProfileModal } from "@/components/UserProfileModal";
import { useTheme } from "@/context/ThemeContext";
import { api, getAuthToken, clearAuthToken } from "@/lib/api";

import { formatMessageTimestamp } from "@/lib/dateUtils";

function UserChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/user/login");
      return;
    }
    initializeChatData();
  }, [searchParams]);

  const initializeChatData = async () => {
    try {
      // Parallel loading: fetch user info, conversation list, and profile simultaneously
      const [userRes, convsRes, profRes] = await Promise.allSettled([
        api.getMe(),
        api.getConversations(),
        api.getMyProfile(),
      ]);

      if (userRes.status === "fulfilled") {
        if (userRes.value.role === "pharmacist") {
          router.push("/pharmacist/chat");
          return;
        }
        setUser(userRes.value);
      } else {
        router.push("/user/login");
        return;
      }

      if (convsRes.status === "fulfilled") {
        const data = convsRes.value;
        setConversations(Array.isArray(data) ? data : data?.conversations || []);
      }

      if (profRes.status === "fulfilled") {
        const p = profRes.value?.profile;
        const isCompleted = Boolean(
          p && (
            (p.age !== null && p.age !== undefined && p.age !== "") ||
            (p.height && p.height.trim()) ||
            (p.weight && p.weight.trim()) ||
            (p.allergies && p.allergies.trim()) ||
            (p.medical_conditions && p.medical_conditions.trim()) ||
            (p.current_medications && p.current_medications.trim())
          )
        );
        setProfileModalOpen(!isCompleted);
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data);
    } catch (err) {
      router.push("/user/login");
    }
  };

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(Array.isArray(data) ? data : data?.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = async (id: number) => {
    setActiveConversationId(id);
    setLoadingHistory(true);
    setMessages([]);
    try {
      const data = await api.getConversationMessages(id);
      const formatted = (data.messages || []).map((m: any) => ({
        ...m,
        timestamp: m.created_at ? formatMessageTimestamp(m.created_at) : formatMessageTimestamp(new Date()),
      }));
      setMessages(formatted);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteConversation = async (id: number) => {
    // 1. Optimistic Instant UI Update (0ms delay)
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      handleNewChat();
    }
    // 2. Call backend delete in background
    try {
      await api.deleteConversation(id);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      loadConversations();
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push("/user/login");
  };

  const handleSendMessage = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || loadingChat) return;

    // 1. INSTANT UI update: Render user message immediately (0ms delay)
    const now = new Date();
    const nowIso = now.toISOString();
    const nowTime = formatMessageTimestamp(now);

    const userMsg = {
      role: "user" as const,
      content: cleanText,
      timestamp: nowTime,
      created_at: nowIso,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoadingChat(true);

    // 2. INSTANT Sidebar update: If new chat, immediately prepend optimistic conversation to history
    let convId = activeConversationId;
    const isNew = !convId;
    const tempId = isNew ? -Date.now() : convId;

    if (isNew) {
      const tempTitle = cleanText.length > 40 ? cleanText.slice(0, 38) + "..." : cleanText;
      const optimisticConv = {
        id: tempId,
        title: tempTitle,
        created_at: nowIso,
        updated_at: nowIso,
      };
      setConversations((prev) => [optimisticConv, ...prev.filter((c) => c.id !== tempId)]);
    } else {
      // If existing conversation, immediately bump it to the top with current timestamp
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === convId);
        const rest = prev.filter((c) => c.id !== convId);
        if (existing) {
          return [{ ...existing, updated_at: nowIso }, ...rest];
        }
        return prev;
      });
    }

    try {
      const res = await api.sendChatMessage(cleanText, isNew ? null : convId);

      const assistantMsg = {
        role: "assistant" as const,
        content: res.answer,
        safety_alert: res.safety_alert,
        emergency: res.emergency,
        warnings: res.warnings,
        sources: res.sources,
        disclaimer: res.disclaimer,
        timestamp: formatMessageTimestamp(new Date()),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      const realConvId = res.conversation_id || convId;
      if (realConvId) {
        setActiveConversationId(realConvId);
        if (isNew) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === tempId ? { ...c, id: realConvId, updated_at: new Date().toISOString() } : c
            )
          );
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Request Error: ${err.message}` },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isGuest={false}
        isPharmacist={false}
        theme={theme}
        isOpen={sidebarOpen}
        user={user}
        onOpenProfile={() => setProfileModalOpen(true)}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Chat Area */}
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loadingChat}
        loadingHistory={loadingHistory}
        userRole={user?.role}
        userName={user?.full_name}
        theme={theme}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onOpenProfile={() => setProfileModalOpen(true)}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Patient Medical Profile Modal overlay */}
      <UserProfileModal
        isOpen={profileModalOpen}
        theme={theme}
        onClose={() => setProfileModalOpen(false)}
        onProfileUpdated={fetchCurrentUser}
      />
    </div>
  );
}

export default function UserChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-gray-950 text-slate-400 text-xs font-semibold">
        Loading Chat Assistant...
      </div>
    }>
      <UserChatContent />
    </Suspense>
  );
}
