"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import {
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Send,
} from "lucide-react";

export default function UserForgotPasswordPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Mode: "reset_password" | "forgot_email"
  const [activeTab, setActiveTab] = useState<"reset_password" | "forgot_email">("reset_password");

  // Reset Password Flow: 1 = Email, 2 = Verify OTP alone, 3 = New Password
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);

  // Reset Password Form State
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Email Flow: 1 = Phone input, 2 = Verify OTP sent to email, 3 = Result
  const [emailStep, setEmailStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [foundName, setFoundName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Global UI State
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ----------------------------------------------------
  // RESET PASSWORD FLOW
  // ----------------------------------------------------

  // Step 1: Send OTP to Email
  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendPasswordResetOtp({
        email: cleanEmail,
        role: "user",
      });
      setSuccessMsg(res.message || "A 6-digit verification code has been dispatched to your email.");
      setResetStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyPasswordResetOtp({
        email: email.trim().toLowerCase(),
        role: "user",
        otp_code: cleanOtp,
      });
      setSuccessMsg(res.message || "Code confirmed! Now set your new password.");
      setResetStep(3);
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify your new password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyAndResetPassword({
        email: email.trim().toLowerCase(),
        role: "user",
        otp_code: otpCode.trim(),
        new_password: newPassword,
      });

      setSuccessMsg(res.message || "Password successfully reset! Redirecting to login...");
      setTimeout(() => {
        router.push(`/user/login?reset=true&email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The code may have expired. Please restart.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP for Reset Password
  const handleResendResetOtp = async () => {
    setError(null);
    setResending(true);
    try {
      const res = await api.sendPasswordResetOtp({
        email: email.trim().toLowerCase(),
        role: "user",
      });
      setSuccessMsg("A new verification code has been dispatched to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  // ----------------------------------------------------
  // FORGOT EMAIL FLOW
  // ----------------------------------------------------

  // Step 1: Enter Phone Number -> Send OTP to linked email
  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      setError("Please enter a valid registered phone number (at least 7 digits).");
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotEmailSendOtp({
        phone: cleanPhone,
        role: "user",
      });
      setMaskedEmail(res.masked_email);
      setSuccessMsg(res.message || "A 6-digit verification code has been sent to your registered email.");
      setEmailStep(2);
    } catch (err: any) {
      setError(err.message || "No registered patient account found matching this phone number.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP -> Reveal email & send confirmation email
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = emailOtpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotEmailVerifyOtp({
        phone: phone.trim(),
        role: "user",
        otp_code: cleanOtp,
      });
      setFoundEmail(res.email);
      setFoundName(res.full_name);
      setSuccessMsg("We have sent your account email to your inbox and confirmed your identity!");
      setEmailStep(3);
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP for Forgot Email
  const handleResendEmailOtp = async () => {
    setError(null);
    setResending(true);
    try {
      const res = await api.forgotEmailSendOtp({
        phone: phone.trim(),
        role: "user",
      });
      setSuccessMsg("A fresh verification code has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const handleCopyEmail = () => {
    if (foundEmail) {
      navigator.clipboard.writeText(foundEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseEmailToReset = () => {
    if (foundEmail) {
      setEmail(foundEmail);
      setActiveTab("reset_password");
      setResetStep(1);
      setError(null);
      setSuccessMsg(null);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-gray-950 text-slate-100"
      }`}
    >
      <div className="max-w-md w-full">
        {/* Back Link */}
        <Link
          href="/user/login"
          className={`inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
            isLight
              ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800"
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>

        <div
          className={`rounded-2xl p-8 shadow-2xl border transition-colors ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "glass-panel border-slate-800 text-white"
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 p-2 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Account Recovery</h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Recover access to your MedQurex patient profile
              </p>
            </div>
          </div>

          {/* Recovery Method Tabs */}
          <div className={`grid grid-cols-2 p-1 rounded-xl mb-6 ${isLight ? "bg-slate-100" : "bg-slate-900"}`}>
            <button
              type="button"
              onClick={() => {
                setActiveTab("reset_password");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "reset_password"
                  ? isLight
                    ? "bg-white text-teal-600 shadow-sm"
                    : "bg-teal-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Reset Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("forgot_email");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                activeTab === "forgot_email"
                  ? isLight
                    ? "bg-white text-teal-600 shadow-sm"
                    : "bg-teal-600 text-white shadow-sm"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Forgot Email?
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= TAB 1: RESET PASSWORD (3 STEPS) ================= */}
          {activeTab === "reset_password" && (
            <>
              {/* STEP 1: Enter Email */}
              {resetStep === 1 && (
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                    Enter your registered email address. We will dispatch a 6-digit security code to verify your identity.
                  </p>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="patient@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-teal-500"
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Sending Verification Code..." : "Send Verification Code"}
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: Verify OTP Only */}
              {resetStep === 2 && (
                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                      isLight ? "bg-teal-50/70 border-teal-200 text-teal-800" : "bg-teal-950/30 border-teal-800/60 text-teal-300"
                    }`}
                  >
                    <span className="truncate">
                      Code sent to: <strong className="font-semibold">{email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="text-[11px] underline font-bold ml-2 shrink-0 hover:opacity-80"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      6-Digit Security Code (OTP)
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono tracking-widest text-center text-base outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-teal-500"
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Verifying Code..." : "Verify Code"}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={resending}
                      onClick={handleResendResetOtp}
                      className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline disabled:opacity-50 font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                      <span>{resending ? "Resending code..." : "Didn't receive code? Resend"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Enter New Password */}
              {resetStep === 3 && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div
                    className={`p-3 rounded-xl text-xs border flex items-center gap-2 ${
                      isLight ? "bg-teal-50/70 border-teal-200 text-teal-800" : "bg-teal-950/30 border-teal-800/60 text-teal-300"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Identity verified! Enter your new password below.</span>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-teal-500"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-teal-500"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Updating Password..." : "Update Password"}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          )}

          {/* ================= TAB 2: FORGOT EMAIL (3 STEPS) ================= */}
          {activeTab === "forgot_email" && (
            <div className="space-y-4">
              {/* STEP 1: Enter Phone Number */}
              {emailStep === 1 && (
                <form onSubmit={handleSendEmailOtp} className="space-y-4">
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                    Cannot remember your registered email? Enter your contact phone number. We will send a verification code to the email associated with your account.
                  </p>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Registered Contact Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="+92 300 1234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-teal-500"
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Verifying Phone..." : "Verify Number & Send Code"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP 2: Enter OTP sent to registered email */}
              {emailStep === 2 && (
                <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                  <div
                    className={`p-3 rounded-xl text-xs border ${
                      isLight ? "bg-teal-50/70 border-teal-200 text-teal-800" : "bg-teal-950/30 border-teal-800/60 text-teal-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>Phone: <strong className="font-semibold">{phone}</strong></span>
                      <button
                        type="button"
                        onClick={() => setEmailStep(1)}
                        className="text-[11px] underline font-bold ml-2 shrink-0 hover:opacity-80"
                      >
                        Change
                      </button>
                    </div>
                    {maskedEmail && (
                      <p className="mt-1 text-[11px] text-teal-700 dark:text-teal-400">
                        Code sent to: <strong>{maskedEmail}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      6-Digit Security Code (OTP)
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ""))}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono tracking-widest text-center text-base outline-none border transition ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-500"
                            : "bg-slate-950/70 border-slate-800 text-slate-100 focus:border-teal-500"
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {loading ? "Verifying Code..." : "Verify & Reveal Email"}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={resending}
                      onClick={handleResendEmailOtp}
                      className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline disabled:opacity-50 font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                      <span>{resending ? "Resending code..." : "Didn't receive code? Resend"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Email Revealed & Notice Sent */}
              {emailStep === 3 && foundEmail && (
                <div
                  className={`p-4 rounded-xl border ${
                    isLight ? "bg-teal-50/80 border-teal-200 text-slate-900" : "bg-teal-950/30 border-teal-800 text-slate-100"
                  }`}
                >
                  <div className="p-3 mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>We sent your account email to your inbox!</span>
                  </div>

                  <div className="text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-1">
                    Account Located
                  </div>
                  {foundName && (
                    <div className="text-xs font-medium text-slate-500 mb-2">
                      Registered to: <strong className={isLight ? "text-slate-800" : "text-white"}>{foundName}</strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/70 dark:bg-black/40 border border-teal-500/20">
                    <span className="font-mono text-xs font-bold text-teal-600 select-all">{foundEmail}</span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="p-1 rounded text-slate-400 hover:text-teal-600 transition"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/user/login?email=${encodeURIComponent(foundEmail)}`)}
                      className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition text-center"
                    >
                      Sign In Now
                    </button>
                    <button
                      type="button"
                      onClick={handleUseEmailToReset}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition text-center ${
                        isLight
                          ? "border-teal-300 text-teal-700 bg-white hover:bg-teal-50"
                          : "border-teal-700 text-teal-300 bg-slate-900 hover:bg-slate-800"
                      }`}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation */}
          <div
            className={`mt-6 text-center text-xs border-t pt-4 ${
              isLight ? "border-slate-200 text-slate-500" : "border-slate-800 text-slate-400"
            }`}
          >
            <span>
              Remember your credentials?{" "}
              <Link href="/user/login" className="font-bold text-teal-600 hover:underline">
                Sign In
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
