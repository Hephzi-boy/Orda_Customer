// c:\Users\Lenovo\Desktop\Orda_Customer\hooks\useAuth.ts
import { supabase } from '@/lib/supabase'; // Adjust path if necessary
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially

  useEffect(() => {
    // ✅ Supabase v1: get session and user
    const session = supabase.auth.session();
    setUser(session?.user ?? null);
    setIsLoading(false);

    // ✅ Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  return { user, isLoading };
}
