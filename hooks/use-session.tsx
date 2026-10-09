"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FORBIDDEN_EVENT, SESSION_EXPIRED_EVENT, apiFetch } from "@/lib/api-client";
import type { MePermission } from "@/lib/types";

export interface Me {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  gender: 0 | 1;
  dob: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

interface SessionValue {
  me: Me | null;
  permissions: MePermission[];
  loading: boolean;
  can: (code: string) => boolean;
  displayNameOf: (name: string) => string;
  refetch: () => Promise<void>;
  refetchPermissions: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [permissions, setPermissions] = useState<MePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const profile = await apiFetch<Me>("/api/auth/me");
      if (mounted.current) setMe(profile);
    } catch {
      if (mounted.current) setMe(null);
    }
  }, []);

  const refetchPermissions = useCallback(async () => {
    try {
      const list = await apiFetch<MePermission[]>("/api/auth/me/permissions");
      if (mounted.current) setPermissions(list);
    } catch {
      if (mounted.current) setPermissions([]);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const run = async () => {
      await refetch();
      await refetchPermissions();
      if (mounted.current) setLoading(false);
    };
    void run();

    const onFocus = () => {
      void refetchPermissions();
    };
    const onForbidden = () => {
      void refetchPermissions();
    };
    const onSessionExpired = () => {
      router.replace("/login");
    };

    // Làm mới quyền khi quay lại tab (§3.3) và khi nhận 403 bất ngờ.
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener(FORBIDDEN_EVENT, onForbidden);
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);

    return () => {
      mounted.current = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener(FORBIDDEN_EVENT, onForbidden);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    };
  }, [refetch, refetchPermissions, router]);

  const can = useCallback(
    (code: string) => permissions.some((p) => p.name === code && p.hasPermission),
    [permissions],
  );

  const displayNameOf = useCallback(
    (name: string) => permissions.find((p) => p.name === name)?.displayName ?? name,
    [permissions],
  );

  const value = useMemo<SessionValue>(
    () => ({ me, permissions, loading, can, displayNameOf, refetch, refetchPermissions }),
    [me, permissions, loading, can, displayNameOf, refetch, refetchPermissions],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession phải dùng trong SessionProvider");
  return ctx;
}
