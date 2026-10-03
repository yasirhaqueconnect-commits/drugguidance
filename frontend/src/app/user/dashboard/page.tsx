"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

function DashboardContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/user/chat");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-slate-400 text-xs font-semibold">
      Loading Patient Medical Portal...
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-slate-400 text-xs font-semibold">
        Loading...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
