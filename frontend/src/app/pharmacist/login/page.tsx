"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { api, setAuthToken } from "@/lib/api";
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

function PharmacistLoginContent() {
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

  useEffect(() => {
    router.prefetch("/pharmacist/chat");
  }, [router]);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setRegisteredMsg("Pharmacist registration successful! Please enter your password to sign in.");
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
      const res = await api.pharmacistLogin({ email, password });
      if (res && res.access_token) {
        setAuthToken(res.access_token);
        router.push("/pharmacist/chat");
      }
    } catch (err: any) {
      setError(err.message || "Invalid pharmacist credentials.");
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
          <div className="w-10 h-10 p-1.5 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <img src="/images/rag-system-logo.png" alt="PharmRAG Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold whitespace-nowrap tracking-tight">Pharmacist Sign In</h2>
            <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Clinical practitioner portal & drug interaction engine
            </p>
          </div>
        </div>

        {registeredMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 text-xs flex items-center gap-2 font-medium">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Pharmacist Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="pharmacist@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                  : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                  }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none border transition ${isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                  : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Pharmacist Login"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className={`mt-6 text-center text-xs border-t pt-4 ${isLight ? "border-slate-200 text-slate-500" : "border-slate-800 text-slate-400"
          }`}>
          <span>
            Don't have a Pharmacist account?{" "}
            <Link href="/pharmacist/signup" className="font-bold text-purple-600 hover:underline">
              Sign Up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PharmacistLoginPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors ${isLight ? "bg-slate-50 text-slate-900" : "bg-gray-950 text-slate-100"
      }`}>
      <Suspense fallback={<div>Loading...</div>}>
        <PharmacistLoginContent />
      </Suspense>
    </div>
  );
}
