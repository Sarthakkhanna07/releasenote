"use client";

import { useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuthStore } from "@/lib/store";

export default function AuthInitializer() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const user = useAuthStore((state) => state.user);
  const fetchOrganization = useAuthStore((state) => state.fetchOrganization);

  useEffect(() => {
    const supabase = createClientComponentClient();
    setLoading(true);
    supabase.auth.getUser().then(({ data, error }) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });
  }, [setUser, setLoading]);

  useEffect(() => {
    if (user?.id) {
      fetchOrganization(user.id);
    }
  }, [user?.id, fetchOrganization]);

  return null;
} 