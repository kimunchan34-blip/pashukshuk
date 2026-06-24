"use client";

import { type ReactNode } from "react";
import { useRole } from "@/contexts/RoleContext";
import { LoginScreen } from "@/components/layout/LoginScreen";

export function AppShell({ children }: { children: ReactNode }) {
  const { role } = useRole();
  if (!role) return <LoginScreen />;
  return <>{children}</>;
}
