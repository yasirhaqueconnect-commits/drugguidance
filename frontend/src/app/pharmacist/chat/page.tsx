"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  ChatArea,
  PharmacistNoteModal,
  ConversationDetailsDrawer,
  RenameConversationModal,
} from "@/components";
import { useTheme } from "@/context/ThemeContext";
import { api, getAuthToken, clearAuthToken } from "@/lib/api";
import { formatMessageTimestamp } from "@/lib/dateUtils";

function PharmacistChatContent() {
  const router = useRouter();
  const { theme } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSort, setSelectedSort] = useState("newest");

  // Modals & Drawers
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteConvId, setNoteConvId] = useState<number | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [detailsConvId, setDetailsConvId] = useState<number | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameConvId, setRenameConvId] = useState<number | null>(null);
  const [renameCurrentTitle, setRenameCurrentTitle] = useState("");

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/pharmacist/login");
      return;
    }
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const data = await api.getMe();
      if (data && data.role !== "pharmacist") {
        router.push("/user/chat");
        return;
      }
      setUser(data);
    } catch (err) {
      console.error("Failed to load pharmacist profile:", err);
      router.push("/pharmacist/login");
    }
  };

  const loadConversations = useCallback(async () => {
    try {
      const params: any = {
        sort: selectedSort,
      };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedCategory === "Bookmarked") {
        params.bookmarked = true;
      } else if (selectedCategory === "Notes") {
        params.category = "Notes";
      } else if (selectedCategory !== "All") {
        params.category = selectedCategory;
      }

      const data = await api.getConversations(params);
      setConversations(Array.isArray(data) ? data : data?.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, [searchQuery, selectedCategory, selectedSort]);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      loadConversations();
    }
  }, [loadConversations]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = async (id: number) => {
    if (!id) return;
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
    try {
      await api.deleteConversation(id);
    } catch (err) {
      // Revert if API fails
      loadConversations();
      alert("Failed to delete conversation.");
    }
  };

  const handleToggleBookmark = async (id: number) => {
    // 1. Optimistic Instant UI Update (0ms delay)
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_bookmarked: !c.is_bookmarked } : c))
    );
    try {
      await api.toggleBookmark(id);
    } catch (err: any) {
      // Revert if API fails
      loadConversations();
      alert(`Bookmark Error: ${err.message}`);
    }
  };

  const handleOpenAddNote = (id: number) => {
    setNoteConvId(id);
    setNoteModalOpen(true);
  };

  const handleOpenDetails = (id: number) => {
    setDetailsConvId(id);
    setDetailsDrawerOpen(true);
  };

  const handleOpenRename = (id: number, currentTitle: string) => {
    setRenameConvId(id);
    setRenameCurrentTitle(currentTitle);
    setRenameModalOpen(true);
  };

  const handleRenameConversation = async (id: number, newTitle: string) => {
    // Optimistic UI update (0ms instant)
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
    try {
      await api.renameConversation(id, newTitle);
    } catch (err: any) {
      loadConversations();
      alert(`Rename Error: ${err.message}`);
    }
  };

  const handleExportPDF = async (id: number) => {
    try {
      await api.exportPDF(id);
    } catch (err: any) {
      alert(`PDF Export Error: ${err.message}`);
    }
  };

  const handleExportCSV = async (id: number) => {
    try {
      await api.exportCSV(id);
    } catch (err: any) {
      alert(`CSV Export Error: ${err.message}`);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    router.push("/pharmacist/login");
  };

  const handleSendMessage = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || loadingChat) return;

    // 1. INSTANT UI update: Render user message immediately (0ms delay)
    const userMsg = {
      role: "user" as const,
      content: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoadingChat(true);

    let convId = activeConversationId;
    if (!convId) {
      // 2. INSTANT Sidebar update: Prepend optimistic conversation to sidebar immediately
      const tempId = Date.now();
      const tempTitle = cleanText.slice(0, 45);
      const optimisticConv = {
        id: tempId,
        title: tempTitle,
        is_bookmarked: false,
        category: "General Consultation",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes_count: 0,
        snippet: cleanText.slice(0, 80),
      };
      setConversations((prev) => [optimisticConv, ...prev]);

      try {
        const newConv = await api.createConversation(tempTitle);
        convId = newConv.id;
        setActiveConversationId(convId);
        // Replace temp ID with real ID in sidebar
        setConversations((prev) =>
          prev.map((c) => (c.id === tempId ? { ...c, id: newConv.id, title: newConv.title } : c))
        );
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    }

    try {
      const res = await api.sendChatMessage(cleanText, convId);
      const aiMsg = {
        role: "assistant" as const,
        content: res.response || res.answer || "No response received.",
        sources: res.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: `Error: ${err.message || "Failed to get AI response."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const activeConvObj = conversations.find((c) => c.id === (noteConvId || activeConversationId));

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden">
      {/* Original PharmRAG 2-Column Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isGuest={false}
        isPharmacist={true}
        theme={theme}
        isOpen={sidebarOpen}
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        selectedSort={selectedSort}
        onSortSelect={setSelectedSort}
        onToggleBookmark={handleToggleBookmark}
        onAddNote={handleOpenAddNote}
        onViewDetails={handleOpenDetails}
        onRenameConversation={handleOpenRename}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
      />

      {/* Original Spacious PharmRAG Chat Area */}
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loadingChat}
        loadingHistory={loadingHistory}
        userRole={user?.role || "PHARMACIST"}
        userName={user?.full_name}
        theme={theme}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Private Pharmacist Note Modal */}
      <PharmacistNoteModal
        isOpen={noteModalOpen}
        conversationId={noteConvId}
        conversationTitle={activeConvObj?.title}
        onClose={() => {
          setNoteModalOpen(false);
          setNoteConvId(null);
        }}
        onNoteAdded={() => {
          if (noteConvId) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === noteConvId
                  ? { ...c, notes_count: (c.notes_count || 0) + 1 }
                  : c
              )
            );
          }
          loadConversations();
        }}
      />

      {/* Rename Conversation Modal */}
      <RenameConversationModal
        isOpen={renameModalOpen}
        conversationId={renameConvId}
        currentTitle={renameCurrentTitle}
        onClose={() => {
          setRenameModalOpen(false);
          setRenameConvId(null);
        }}
        onRename={handleRenameConversation}
      />

      {/* Conversation Details Drawer */}
      <ConversationDetailsDrawer
        isOpen={detailsDrawerOpen}
        conversationId={detailsConvId}
        onClose={() => {
          setDetailsDrawerOpen(false);
          setDetailsConvId(null);
        }}
        onBookmarkToggle={handleToggleBookmark}
        onAddNote={handleOpenAddNote}
      />
    </div>
  );
}

export default function PharmacistChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-gray-950 text-slate-400 text-xs font-semibold">
          Loading Drug Guidance System...
        </div>
      }
    >
      <PharmacistChatContent />
    </Suspense>
  );
}
