// c:\Users\Lenovo\Desktop\Orda_Customer\hooks\useCreateUserProfile.ts
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export const useCreateUserProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAndCreateProfile = async () => {
      setLoading(true);
      try {
        // ✅ Supabase v1: use auth.user()
        const user = supabase.auth.user();

        if (!user) {
          console.log('No user logged in, skipping profile check.');
          setLoading(false);
          return;
        }

        // ✅ Check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profile')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        // ✅ If no profile exists, create one
        if (!existingProfile) {
          console.log(`No profile found for user ${user.id}. Creating one...`);
          const username = user.email?.split('@')[0] || `user_${user.id.substring(0, 6)}`;

          const { error: insertError } = await supabase
            .from('profile')
            .insert({
              id: user.id,
              username: username,
              // You can add other default fields here as needed
            });

          if (insertError) throw insertError;

          console.log(`Profile created successfully for user ${user.id} with username ${username}.`);
        } else {
          console.log(`Profile already exists for user ${user.id}.`);
        }

      } catch (e: any) {
        console.error('Error checking/creating user profile:', e.message);
        setError(e.message || 'Failed to ensure user profile exists.');
      } finally {
        setLoading(false);
      }
    };

    checkAndCreateProfile();
  }, []);

  return { loading, error };
};
