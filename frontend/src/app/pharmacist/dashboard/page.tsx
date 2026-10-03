"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PharmacistDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pharmacist/chat");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950 text-slate-100 text-xs">
      <p>Redirecting to Pharmacist Clinical Chat...</p>
    </div>
  );
}
