"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogIn,
  UserPlus,
  Globe,
  Lock,
  ShieldCheck,
  Brain,
  User,
  Heart,
  Stethoscope,
  Users,
  ShieldAlert,
  ArrowLeftRight,
  Pill,
  FileText,
  Mail,
  Send,
  CheckCircle2,
  Menu,
  X,
  Sparkles
} from "lucide-react";

export const PUBLIC_PAGES = [
  { name: "Home", href: "/", route: "" },
  { name: "About", href: "/about", route: "about" },
  { name: "Features", href: "/features", route: "features" },
  { name: "Contact", href: "/contact", route: "contact" },
];

/* -------------------------------------------------------------
 * 1. HOME VIEW
 * ------------------------------------------------------------- */
function HomeSection() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1>
              Smarter Guidance.<br />
              Safer <span>Decisions.</span>
            </h1>
            <p>
              Access reliable, evidence based drug information instantly, including medication details,<br />
              dosage guidance, drug interactions, allergy information, and safety precautions.
            </p>

            <div className="feature-row">
              <div className="feature">
                <div className="feature-icon">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <b>Evidence Based</b>
                  <small>Sources</small>
                </div>
              </div>

              <div className="feature">
                <div className="feature-icon">
                  <Brain className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <b>Intelligence</b>
                  <small>Analysis</small>
                </div>
              </div>

              <div className="feature">
                <div className="feature-icon">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <b>Secure &amp;</b>
                  <small>Confidential</small>
                </div>
              </div>
            </div>
          </div>

          {/* Original Hero Illustration Artwork */}
          <div className="hero-image-wrapper">
            <img
              className="hero-image"
              src="/images/hero-ai-drug-guidance.png"
              alt="Drug Guidance System Illustration"
            />
          </div>
        </div>
      </section>

      {/* Access Portals Section */}
      <section className="access-section">
        <div className="access-grid">
          {/* Card 1: User / Patient Portal */}
          <article className="access-card">
            <img className="role-icon" src="/images/login-profile-icon.png" alt="User Profile icon" />
            <h3>Patient / User Portal</h3>
            <p className="blue-text">Personal health profile & safety checks</p>
            <div className="card-divider">
              <span></span>
              <span className="mini-symbol">
                <User className="w-3.5 h-3.5 text-slate-400 opacity-60" />
              </span>
              <span></span>
            </div>
            <div className="card-buttons">
              <Link href="/user/login" className="card-btn blue-btn">
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
              <Link href="/user/signup" className="card-btn outline-btn">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </div>
          </article>

          {/* Card 2: Guest User */}
          <article className="access-card">
            <img className="role-icon" src="/images/general-user-icon.png" alt="Guest User icon" />
            <h3>Guest User</h3>
            <p className="teal-text">Explore without creating an account</p>
            <div className="card-divider">
              <span></span>
              <span className="mini-symbol">
                <Globe className="w-3.5 h-3.5 text-slate-400 opacity-60" />
              </span>
              <span></span>
            </div>
            <Link href="/chat/guest" className="wide-card-btn teal-btn">
              <Globe className="w-3.5 h-3.5" />
              <span>Continue as Guest</span>
            </Link>
          </article>

          {/* Card 3: Pharmacist Portal */}
          <article className="access-card">
            <img className="role-icon" src="/images/pharmacist-icon.png" alt="Pharmacist Access icon" />
            <h3>Pharmacist Portal</h3>
            <p className="purple-text">Specialized tools for healthcare professionals</p>
            <div className="card-divider">
              <span></span>
              <span className="mini-symbol">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 opacity-60" />
              </span>
              <span></span>
            </div>
            <div className="card-buttons">
              <Link href="/pharmacist/login" className="card-btn purple-btn">
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
              <Link href="/pharmacist/signup" className="card-btn purple-outline-btn">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </div>
          </article>
        </div>

        {/* Trust Strip */}
        <div className="trust-strip">
          <div className="trust-item">
            <ShieldCheck className="trust-icon" />
            <div>
              <strong>99.9% Uptime</strong>
              <span>Always available</span>
            </div>
          </div>
          <div className="trust-item">
            <Lock className="trust-icon" />
            <div>
              <strong>Security</strong>
              <span>Encrypted queries</span>
            </div>
          </div>
          <div className="trust-item">
            <Brain className="trust-icon" />
            <div>
              <strong>Multi Agent</strong>
              <span>Clinical resources</span>
            </div>
          </div>
          <div className="trust-item">
            <Sparkles className="trust-icon" />
            <div>
              <strong>Fast Results</strong>
              <span>Real-time analysis</span>
            </div>
          </div>
          <div className="trust-item">
            <Heart className="trust-icon" />
            <div>
              <strong>Clinical Standards</strong>
              <span>Evidence-based</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------
 * 2. ABOUT VIEW
 * ------------------------------------------------------------- */
function AboutSection() {
  return (
    <div className="w-[min(1500px,calc(100%-48px))] mx-auto px-2 sm:px-4 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="page-hero-title">About</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          <p className="text-base sm:text-[17px] text-[#61738f] leading-[1.5] font-normal">
            <strong className="text-[#102650] font-semibold">Drug Guidance System</strong> is a non prescribing drug information and guidance system designed to assist healthcare professionals, pharmacists, and general users.
          </p>

          <div className="space-y-4 pt-1">
            <div className="p-6 rounded-2xl bg-[#fbfdff] border border-[#dce6f2] shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-bold text-[#102650]">
                  For Healthcare Professionals &amp; Pharmacists
                </h3>
                <p className="text-sm text-[#61738f] leading-relaxed">
                  It works as an assistive co-pilot by providing quick access to drug information, drug–drug interactions, allergy-related information, and alternative medicines.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#fbfdff] border border-[#dce6f2] shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-bold text-[#102650]">
                  For General Users
                </h3>
                <p className="text-sm text-[#61738f] leading-relaxed">
                  It provides easy to understand drug information to support better awareness and informed discussions with healthcare professionals.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Photography */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="w-full rounded-3xl overflow-hidden shadow-xl border border-[#dce6f2] bg-white">
            <img
              src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80"
              alt="Clinical Medical Research"
              className="w-full h-80 sm:h-96 lg:h-[440px] object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 3. FEATURES VIEW
 * ------------------------------------------------------------- */
function FeaturesSection() {
  const featureList = [
    {
      id: "allergies",
      title: "Allergies",
      description: "Check potential allergies related to a drug.",
      icon: ShieldAlert,
      image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=700&q=80",
    },
    {
      id: "interactions",
      title: "Drug Interactions",
      description: "Check possible interactions between medicines.",
      icon: ArrowLeftRight,
      image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=700&q=80",
    },
    {
      id: "alternatives",
      title: "Alternative Medicines",
      description: "Find suitable alternative medicines.",
      icon: Pill,
      image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=700&q=80",
    },
    {
      id: "drug-info",
      title: "Drug Information",
      description: "Get information about the drug, including dosage, side effects, warnings, and other details.",
      icon: FileText,
      image: "/images/drug-information-feature.jpg",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="page-hero-title">Features</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-7">
        {featureList.map((feat) => {
          const Icon = feat.icon;
          return (
            <article
              key={feat.id}
              className="rounded-3xl bg-white border border-[#dce6f2] shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
            >
              <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={feat.image}
                  alt={feat.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex items-end p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                      {feat.title}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex items-center bg-[#fbfdff]">
                <p className="text-sm sm:text-base text-[#61738f] leading-relaxed font-normal">
                  {feat.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 4. CONTACT VIEW
 * ------------------------------------------------------------- */
function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastMailtoUrl, setLastMailtoUrl] = useState<string>("");

  const team = [
    { name: "Mehreen Fatima", email: "fmehreen523@gmail.com" },
    { name: "Hafsah Arain", email: "hafsahlutfullaharain@gmail.com" },
    { name: "Maham Almani", email: "Mahamalmani5@gmail.com" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      return;
    }
    setLoading(true);

    const recipientEmails = team.map((m) => m.email).join(",");
    const subjectText = formData.subject.trim()
      ? `[DrugGuide Contact] ${formData.subject.trim()} - from ${formData.name.trim()}`
      : `[DrugGuide Inquiry] Message from ${formData.name.trim()}`;

    const bodyText = `Dear DrugGuide Support Team,\n\nYou have received a new inquiry from the DrugGuide Contact Portal:\n\nSender Name: ${formData.name.trim()}\nSender Email: ${formData.email.trim()}\nSubject: ${formData.subject.trim() || "General Inquiry"}\n\nMessage:\n${formData.message.trim()}\n\n---\nSent via DrugGuide Medical System Contact Portal`;

    const mailtoLink = `mailto:${recipientEmails}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
    setLastMailtoUrl(mailtoLink);

    setTimeout(() => {
      // Trigger user's mail client (Gmail/Outlook/Default) prefilled with all 3 recipient addresses
      try {
        window.location.href = mailtoLink;
      } catch (err) {
        console.error("Mailto trigger error:", err);
      }
      setLoading(false);
      setSubmitted(true);
    }, 500);
  };

  return (
    <div className="w-[min(1500px,calc(100%-48px))] mx-auto px-2 sm:px-4 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="page-hero-title">Contact</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: System Development */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 sm:p-7 rounded-3xl bg-[#fbfdff] border border-[#dce6f2] shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#102650]">Support Team</h2>
              </div>
            </div>

            <div className="space-y-3">
              {team.map((member, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-[#dce6f2] hover:border-blue-300 hover:bg-blue-50/20 transition-colors space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold text-sm text-[#102650]">{member.name}</span>
                  </div>
                  <a
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium transition break-all"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{member.email}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Message Form */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#fbfdff] border border-[#dce6f2] shadow-sm space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[#102650]">Send a Message</h2>
              <p className="text-xs text-[#61738f] font-medium mt-0.5">
                Have questions or feedback? Fill out the form below to send an email to all 3 support leads simultaneously.
              </p>
            </div>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-center space-y-3.5 animate-fade-in my-auto">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-emerald-900">Message Ready to Send!</h3>
                  <p className="text-xs text-emerald-700 mt-1">
                    Your email has been composed to all 3 team members simultaneously:
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/80 text-left text-xs space-y-1.5 text-slate-700">
                  <div className="font-semibold text-emerald-900 pb-1 border-b border-emerald-100">
                    Recipients (All 3 Team Leads):
                  </div>
                  {team.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{m.name}: <strong className="text-slate-800">{m.email}</strong></span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {lastMailtoUrl && (
                    <a
                      href={lastMailtoUrl}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Open Mail Client / Send Again</span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: "", email: "", subject: "", message: "" });
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition cursor-pointer"
                  >
                    Write New Message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Name<span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your Name*"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dce6f2] text-sm text-[#102650] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Email<span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Email Address*"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dce6f2] text-sm text-[#102650] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Subject (Optional)"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dce6f2] text-sm text-[#102650] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Message<span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write your message here...*"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dce6f2] text-sm text-[#102650] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                  ></textarea>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#102650] hover:bg-[#1e3a8a] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{loading ? "Sending..." : "Send"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const SECTIONS = [
  { key: "home", Component: HomeSection, href: "/" },
  { key: "about", Component: AboutSection, href: "/about" },
  { key: "features", Component: FeaturesSection, href: "/features" },
  { key: "contact", Component: ContactSection, href: "/contact" },
];

/* -------------------------------------------------------------
 * MAIN UNIFIED LANDING PRESENTATION COMPONENT
 * ------------------------------------------------------------- */
export interface LandingPresentationProps {
  initialIndex?: number;
}

export const LandingPresentation: React.FC<LandingPresentationProps> = ({ initialIndex = 0 }) => {
  const pathname = usePathname();
  const router = useRouter();

  // Determine starting index from route pathname
  const getIndexFromPath = (path: string) => {
    if (path === "/about") return 1;
    if (path === "/features") return 2;
    if (path === "/contact") return 3;
    return 0;
  };

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (initialIndex >= 0 && initialIndex < 4) return initialIndex;
    return getIndexFromPath(pathname || "/");
  });

  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward" | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [frozenScrollY, setFrozenScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNavigatingRef = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Sync state if user clicks browser back/forward buttons
  useEffect(() => {
    const routeIndex = getIndexFromPath(pathname || "/");
    if (routeIndex !== currentIndex && !isNavigatingRef.current) {
      setCurrentIndex(routeIndex);
    }
  }, [pathname, currentIndex]);

  const navigateTo = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= SECTIONS.length) return;
    if (newIndex === currentIndex) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    const isForward = newIndex > currentIndex;

    // Capture the current scroll offset so the current page doesn't visually jump before sliding
    const currentScroll = typeof window !== "undefined" ? window.scrollY : 0;
    setFrozenScrollY(currentScroll);

    // Reset window scroll to 0 so TargetComponent is cleanly anchored from its top (e.g. Contact title + Support Team)
    if (typeof window !== "undefined" && window.scrollY !== 0) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }

    setTargetIndex(newIndex);
    setTransitionDirection(isForward ? "forward" : "backward");
    setIsTransitioning(true);

    const targetHref = SECTIONS[newIndex].href;
    const durationMs = 1200;

    // Temporarily lock scroll during animation
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }

    const timer = setTimeout(() => {
      setCurrentIndex(newIndex);
      setTargetIndex(null);
      setTransitionDirection(null);
      setIsTransitioning(false);
      setFrozenScrollY(0);
      isNavigatingRef.current = false;
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
        window.history.pushState(null, "", targetHref);
      }
    }, durationMs);

    return () => {
      clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [currentIndex]);

  // Handle Wheel Scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      if (isNavigatingRef.current) return;

      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const innerHeight = window.innerHeight;
      const isAtBottom = scrollY + innerHeight >= scrollHeight - 45;
      const isAtTop = scrollY <= 45;

      // Scroll Down at bottom -> Advance to next page (Curtain rolls UP to reveal next page)
      if (e.deltaY > 20 && isAtBottom && currentIndex < SECTIONS.length - 1) {
        navigateTo(currentIndex + 1);
      }
      // Scroll Up at top -> Go back to previous page (Curtain rolls DOWN to reveal previous page)
      else if (e.deltaY < -20 && isAtTop && currentIndex > 0) {
        navigateTo(currentIndex - 1);
      }
    };

    // Touch Swipe Handler for Mobile
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartY.current === null || isNavigatingRef.current) return;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const deltaY = touchStartY.current - touchEndY;
      const deltaX = Math.abs((touchStartX.current || 0) - touchEndX);
      touchStartY.current = null;
      touchStartX.current = null;

      // Only respond if vertical swipe is stronger than horizontal
      if (deltaX > Math.abs(deltaY)) return;

      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const innerHeight = window.innerHeight;
      const isAtBottom = scrollY + innerHeight >= scrollHeight - 60;
      const isAtTop = scrollY <= 60;

      // Swipe UP (scroll down) at bottom -> Advance to next page
      if (deltaY > 40 && isAtBottom && currentIndex < SECTIONS.length - 1) {
        navigateTo(currentIndex + 1);
      }
      // Swipe DOWN (scroll up) at top -> Return to previous page smoothly
      else if (deltaY < -40 && isAtTop && currentIndex > 0) {
        navigateTo(currentIndex - 1);
      }
    };

    // Keyboard Arrow / Page Down/Up Navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      if (isNavigatingRef.current) return;

      const scrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const innerHeight = window.innerHeight;
      const isAtBottom = scrollY + innerHeight >= scrollHeight - 20;
      const isAtTop = scrollY <= 20;

      if ((e.key === "PageDown" || (e.key === "ArrowDown" && isAtBottom)) && currentIndex < SECTIONS.length - 1) {
        navigateTo(currentIndex + 1);
      } else if ((e.key === "PageUp" || (e.key === "ArrowUp" && isAtTop)) && currentIndex > 0) {
        navigateTo(currentIndex - 1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, navigateTo]);

  const CurrentComponent = SECTIONS[currentIndex].Component;
  const TargetComponent = targetIndex !== null ? SECTIONS[targetIndex].Component : null;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#102650] overflow-x-hidden relative">
      {/* Multi-Page Navigation Header */}
      <header className="site-header">
        <div className="header-inner">
          {/* Brand Logo & Title */}
          <div
            className="brand cursor-pointer"
            onClick={() => navigateTo(0)}
          >
            <div className="brand-logo">
              <img src="/images/rag-system-logo.png" alt="Drug Guidance System logo" />
            </div>
            <div className="brand-copy">
              <strong>Drug Guidance System</strong>
              <span>Evidence-Based. Patient-Focused.</span>
            </div>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="mobile-menu-btn"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-[#102650]" />
            ) : (
              <Menu className="w-5 h-5 text-[#102650]" />
            )}
          </button>

          {/* Navigation Links */}
          <nav className={`main-nav ${mobileMenuOpen ? "mobile-nav-open" : ""}`}>
            {PUBLIC_PAGES.map((link, idx) => {
              const isActive = (targetIndex !== null ? targetIndex : currentIndex) === idx;
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo(idx);
                  }}
                  className={`bg-transparent border-0 cursor-pointer ${isActive ? "active" : ""}`}
                >
                  {link.name}
                </button>
              );
            })}
          </nav>

          {/* Trust Pill */}
          <div className="trust-pill">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Safe. Reliable. Trusted.</span>
          </div>
        </div>
      </header>

      {/* Main View Transition Container */}
      <main className={`flex-1 relative w-full ${isTransitioning ? "overflow-hidden" : ""} min-h-[calc(100vh-78px)]`}>
        {/* CASE 1: FORWARD TRANSITION (1 -> 2 -> 3 -> 4) */}
        {/* Target is stationary underneath at z-0, current slides UP at z-10 */}
        {isTransitioning && transitionDirection === "forward" && TargetComponent && (
          <div
            className="absolute inset-0 w-full min-h-full bg-white z-0 pointer-events-none"
            style={{ top: 0, left: 0 }}
          >
            <TargetComponent />
          </div>
        )}

        {/* CASE 2: BACKWARD TRANSITION (4 -> 3 -> 2 -> 1) */}
        {/* Target slides DOWN from TOP at z-20 over current page sitting at z-0 */}
        {isTransitioning && transitionDirection === "backward" && TargetComponent && (
          <div
            className="absolute inset-x-0 top-0 w-full bg-white z-20 pointer-events-none slide-down-from-top overflow-hidden"
            style={{
              height: "calc(100vh - 78px)",
              top: 0,
              left: 0,
              willChange: "transform",
            }}
          >
            <TargetComponent />
          </div>
        )}

        {/* ACTIVE / CURRENT VIEW */}
        <div
          key={currentIndex}
          className={`w-full bg-white relative ${
            isTransitioning && transitionDirection === "forward"
              ? "z-10 curtain-slide-up"
              : isTransitioning && transitionDirection === "backward"
              ? "z-0"
              : "z-0 min-h-full"
          }`}
          style={{
            height: isTransitioning ? "calc(100vh - 78px)" : "auto",
            overflow: isTransitioning ? "hidden" : "visible",
            willChange: isTransitioning ? "transform" : "auto",
          }}
        >
          <div
            style={
              isTransitioning && frozenScrollY > 0
                ? { transform: `translate3d(0, -${frozenScrollY}px, 0)` }
                : undefined
            }
          >
            <CurrentComponent />
          </div>
        </div>
      </main>
    </div>
  );
};
