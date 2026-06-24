"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Role = "회장" | "총무" | "일반" | null;

interface RoleContextType {
  role: Role;
  isAdmin: boolean;
  login: (role: Role) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType>({
  role: null, isAdmin: false, login: () => {}, logout: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("golf-role") as Role | null;
    if (saved) setRole(saved);
    setReady(true);
  }, []);

  const login = (r: Role) => {
    setRole(r);
    if (r) sessionStorage.setItem("golf-role", r);
  };

  const logout = () => {
    setRole(null);
    sessionStorage.removeItem("golf-role");
  };

  const isAdmin = role === "회장" || role === "총무";

  if (!ready) return null;

  return (
    <RoleContext.Provider value={{ role, isAdmin, login, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);
