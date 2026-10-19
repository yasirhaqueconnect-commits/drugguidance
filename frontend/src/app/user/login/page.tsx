"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { api, setAuthToken } from "@/lib/api";
import { User, Mail, Lock, ArrowRight, AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredMsg, setRegisteredMsg] = useState<string | null>(null);

  // Pre-load user chat page into memory for instant redirect on login
  useEffect(() => {
    router.prefetch("/user/chat");
  }, [router]);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setRegisteredMsg("Registration successful! Please enter your password to log in.");
    } else if (searchParams.get("reset") === "true") {
      setRegisteredMsg("Password successfully reset! Please sign in with your new credentials.");
    }
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRegisteredMsg(null);
    setLoading(true);

    try {
      const res = await api.userLogin({ email: email.trim().toLowerCase(), password });
      if (res && res.access_token) {
        setAuthToken(res.access_token);
        router.push("/user/chat");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full">
      {/* Back to Home Link */}
      <Link
        href="/"
        className={`inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${isLight
          ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
          : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800"
          }`}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Home</span>
      </Link>

      <div className={`rounded-2xl p-8 shadow-2xl border transition-colors ${isLight ? "bg-white border-slate-200 text-slate-900" : "glass-panel border-slate-800 text-white"
        }`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 p-1.5 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
            <img src="/images/rag-system-logo.png" alt="PharmRAG Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">User Sign In</h2>
            <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Access your personal health profile.
            </p>
          </div>
        </div>

        {registeredMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{registeredMsg}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="off"
                placeholder="user@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                  : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-teal-500"
                  }`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`block text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Password
              </label>
              <Link
                href="/user/forgot-password"
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline transition"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">

              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                data-lpignore="true"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none border transition ${isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                  : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-teal-500"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to User Portal"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className={`mt-6 text-center text-xs border-t pt-4 ${isLight ? "border-slate-200 text-slate-500" : "border-slate-800 text-slate-400"
          }`}>
          <span>
            Don't have a User account?{" "}
            <Link href="/user/signup" className="font-bold text-teal-600 hover:underline">
              Sign Up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function UserLoginPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors ${isLight ? "bg-slate-50 text-slate-900" : "bg-gray-950 text-slate-100"
      }`}>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
