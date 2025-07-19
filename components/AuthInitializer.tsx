"use client";

import { useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuthStore } from "@/lib/store";

export default function AuthInitializer() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    const supabase = createClientComponentClient();
    setLoading(true);
    supabase.auth.getUser().then(({ data, error }) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });
  }, [setUser, setLoading]);

  return null;
} 