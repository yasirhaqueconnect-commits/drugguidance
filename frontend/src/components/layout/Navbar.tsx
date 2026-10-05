"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pill, UserCheck, ShieldCheck, LogOut, User as UserIcon, Sun, Moon, LayoutDashboard, MessageSquare, ArrowLeft } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { clearAuthToken } from "@/lib/api";

interface NavbarProps {
  user?: any;
  theme?: "dark" | "light";
  hideAuthButtons?: boolean;
  showHomeButton?: boolean;
  onToggleTheme?: () => void;
  onOpenAuth?: (mode: "user_login" | "pharmacist_login" | "user_signup" | "pharmacist_signup") => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onContinueGuest?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  theme: customTheme,
  hideAuthButtons = false,
  showHomeButton = false,
  onToggleTheme: customToggleTheme,
  onOpenAuth,
  onOpenProfile,
  onLogout,
  onContinueGuest,
}) => {
  const router = useRouter();
  const contextTheme = useTheme();
  
  const currentTheme = customTheme || contextTheme.theme;
  const toggleTheme = customToggleTheme || contextTheme.toggleTheme;
  const isLight = currentTheme === "light";

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      clearAuthToken();
      router.push("/");
    }
  };

  const isPharmacist = user?.role?.toLowerCase() === "pharmacist";

  return (
    <header
      className={`sticky top-0 z-30 border-b px-4 lg:px-8 py-3 flex items-center justify-between shadow-lg transition-colors ${
        isLight
          ? "bg-white/90 backdrop-blur-md border-slate-200 text-slate-900"
          : "glass-panel border-gray-800 text-slate-100"
      }`}
    >
      {/* Brand Logo & Links */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition">
            <img src="/images/rag-system-logo.png" alt="PharmRAG Logo" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Drug Guidance System
            </h1>
            <p className={`text-xs font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Evidence-Based Drug Guidance & Safety Guardrails
            </p>
          </div>
        </Link>

        {/* Quick Nav Links if logged in */}
        {user && (
          <nav className="hidden md:flex items-center gap-2 text-xs font-semibold">
            {!isPharmacist && (
              <Link
                href="/user/dashboard"
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  isLight ? "hover:bg-slate-100 text-slate-700" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-teal-500" />
                <span>Dashboard</span>
              </Link>
            )}
            <Link
              href={isPharmacist ? "/pharmacist/chat" : "/user/chat"}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                isLight ? "hover:bg-slate-100 text-slate-700" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-cyan-500" />
              <span>Chat Assistant</span>
            </Link>
            <Link
              href={isPharmacist ? "/pharmacist/chat/history" : "/user/chat/history"}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                isLight ? "hover:bg-slate-100 text-slate-700" : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <span>History</span>
            </Link>
          </nav>
        )}
      </div>

      {/* Action / User Bar */}
      <div className="flex items-center gap-3">
        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-medium ${
            isLight
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
          title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {isLight ? (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          )}
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            {isPharmacist ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 border border-cyan-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Licensed Pharmacist
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-600 border border-teal-500/30">
                <UserCheck className="w-3.5 h-3.5" />
                Patient / User
              </span>
            )}

            {/* Profile Button */}
            {onOpenProfile ? (
              <button
                onClick={onOpenProfile}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition border ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                    : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
              >
                <UserIcon className="w-4 h-4 text-teal-500" />
                <span>{user.full_name}</span>
              </button>
            ) : (
              <Link
                href={isPharmacist ? "/pharmacist/chat" : "/user/dashboard"}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition border ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                    : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
              >
                <UserIcon className="w-4 h-4 text-teal-500" />
                <span>{user.full_name}</span>
              </Link>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`p-2 rounded-lg transition text-slate-400 hover:text-red-400 ${
                isLight ? "hover:bg-slate-100" : "hover:bg-slate-800"
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {(showHomeButton || hideAuthButtons) && (
              <Link
                href="/"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  isLight
                    ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border-blue-800"
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Home</span>
              </Link>
            )}

            {!hideAuthButtons && (
              <>
                {onContinueGuest ? (
                  <button
                    onClick={onContinueGuest}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    Guest Chat
                  </button>
                ) : (
                  <Link
                    href="/chat/guest"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    Guest Chat
                  </Link>
                )}

                {onOpenAuth ? (
                  <button
                    onClick={() => onOpenAuth("user_login")}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-xs transition shadow-sm"
                  >
                    Sign In
                  </button>
                ) : (
                  <Link
                    href="/user/login"
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-xs transition shadow-sm"
                  >
                    Sign In
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
