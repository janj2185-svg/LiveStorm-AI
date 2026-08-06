"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";

import { AccessDenied } from "./AccessDenied";
import { LoadingState } from "./DataState";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "anonymous") {
    return <LoadingState label="Checking your session…" />;
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
