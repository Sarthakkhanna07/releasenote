"use client";

import { useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuthStore } from "@/lib/store";

export default function AuthInitializer() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const user = useAuthStore((state) => state.user);
  const fetchOrganization = useAuthStore((state) => state.fetchOrganization);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClientComponentClient();
    setLoading(true);
    
    supabase.auth.getUser().then(({ data, error: _error }) => {
      if (isMounted) {
        setUser(data?.user ?? null);
        if (data?.user) {
          fetchProfile(data.user.id);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [setUser, setLoading, fetchProfile]);

  useEffect(() => {
    let isMounted = true;
    if (user?.id) {
      fetchOrganization(user.id).finally(() => {
        // Ensure we don't update state if component unmounted
        if (!isMounted) {
          console.log('AuthInitializer: Component unmounted during fetchOrganization');
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, fetchOrganization]);

  return null;
} 