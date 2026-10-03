"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import { ShieldCheck, Mail, Lock, User, Phone, ArrowRight, AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function PharmacistSignupPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    router.prefetch("/pharmacist/login");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.pharmacistSignup({
        full_name: cleanName,
        email: cleanEmail,
        password,
        phone: cleanPhone || undefined,
      });

      if (res) {
        setSuccessMsg("Pharmacist account registered successfully! Redirecting to login...");
        setTimeout(() => {
          router.push(`/pharmacist/login?registered=true&email=${encodeURIComponent(cleanEmail)}`);
        }, 750);
      }
    } catch (err: any) {
      setError(err.message || "Pharmacist registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors ${isLight ? "bg-slate-50 text-slate-900" : "bg-gray-950 text-slate-100"
      }`}>
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
              <h2 className="text-lg sm:text-xl font-bold whitespace-nowrap tracking-tight">Pharmacist Registration</h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Register as a clinical pharmacist to access interactions & patient tools
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Sarah"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                    : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                    }`}
                />
              </div>
            </div>

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
                Contact Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  autoComplete="new-password"
                  data-lpignore="true"
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

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  data-lpignore="true"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none border transition ${isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-purple-500"
                    : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-purple-500"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition p-1"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? "Registering Practitioner..." : "Register Pharmacist Account"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className={`mt-5 text-center text-xs border-t pt-4 ${isLight ? "border-slate-200 text-slate-500" : "border-slate-800 text-slate-400"
            }`}>
            <span>
              Already have a Pharmacist account?{" "}
              <Link href="/pharmacist/login" className="font-bold text-purple-600 hover:underline">
                Sign In
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
