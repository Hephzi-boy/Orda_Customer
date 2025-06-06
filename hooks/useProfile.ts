// src/hooks/useProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth'; // 👈 make sure this is correct

export const useProfile = () => {
  const { user, isLoading: authLoading } = useAuth(); // 👈 use the user()
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        console.log("No user logged in, skipping profile check.");
        setLoading(false);
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profile') // <-- Changed from 'users' to 'profile'
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("User profile not found.");
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  return { profile, loading, error };
};
