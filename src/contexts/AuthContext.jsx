import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  console.log('[AuthProvider] Rendering. Current loading state:', loading);

  useEffect(() => {
    console.log('[AuthProvider useEffect] Effect started. Setting loading to true.');
    setLoading(true); // Ensure loading is true at the start of effect

    // Helper function to fetch profile with timeout protection
    const fetchUserProfile = async (currentUser) => {
      console.log('[fetchUserProfile] Called for user:', currentUser?.id);
      if (!currentUser) {
        console.log('[fetchUserProfile] No current user. Setting profile to null.');
        setProfile(null);
        return; // Explicitly return if no user
      }

      try {
        console.log(`[fetchUserProfile] Attempting to query 'profiles' table for id: ${currentUser.id}`);
        
        // Create a timeout promise that rejects after 5 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Supabase query timeout after 5 seconds'));
          }, 5000); // 5 second timeout
        });
        
        // Create the Supabase query promise
        const queryPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        console.log(`[fetchUserProfile] Awaiting Supabase query with timeout for id: ${currentUser.id}`);
        
        // Race the query against the timeout
        const { data: profileData, error: profileError } = await Promise.race([
          queryPromise,
          timeoutPromise.then(() => {
            throw new Error('Query timeout');
          })
        ]);

        console.log(`[fetchUserProfile] Supabase query completed for id: ${currentUser.id}. Error:`, profileError, "Data:", profileData);

        if (profileError) {
          console.error(`[fetchUserProfile] Error object present after query for id: ${currentUser.id}. Message:`, profileError.message);
          setProfile(null);
        } else if (profileData) {
          console.log(`[fetchUserProfile] Profile data found for id: ${currentUser.id}:`, profileData);
          setProfile(profileData);
        } else {
          console.log(`[fetchUserProfile] No profile data for id: ${currentUser.id}. Setting profile to null.`);
          setProfile(null);
        }
      } catch (e) {
        console.error(`[fetchUserProfile] EXCEPTION caught for id: ${currentUser.id}. Message:`, e.message);
        // Important: Still set profile to null even on timeout
        setProfile(null);
      } finally {
        console.log(`[fetchUserProfile] Execution finished for user: ${currentUser?.id}`);
      }
    };

    // Check initial session with extra error protection
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      try {
        const currentUser = initialSession?.user ?? null;
        setSession(initialSession);
        setUser(currentUser);
        console.log('[AuthProvider getSession then] Fetching profile for user:', currentUser?.id);
        await fetchUserProfile(currentUser); // Fetch profile for initial session
        console.log('[AuthProvider getSession then] Profile fetched for user:', currentUser?.id +'. Setting loading to false.');
      } catch (error) {
        console.error('[AuthProvider getSession then] Error during profile fetch:', error.message);
      } finally {
        // Always set loading to false, regardless of success or failure
        setLoading(false);
      }
    }).catch(error => {
      console.error('Error getting initial session:', error.message);
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false); // Still set loading to false on error
    });

    // Listen for auth state changes with improved error handling
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log('[AuthProvider onAuthStateChange] Event received:', _event);
        
        try {
          const newUser = newSession?.user ?? null;
          setSession(newSession);
          setUser(newUser);
          console.log('[AuthProvider onAuthStateChange] New user:', newUser?.id);
          
          // Only attempt to fetch profile if there's a user
          if (newUser) {
            await fetchUserProfile(newUser);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error('[AuthProvider onAuthStateChange] Error:', error.message);
          // Don't change user/session state on error, but ensure profile is null
          setProfile(null);
        } finally {
          // Always ensure loading is completed
          console.log('[AuthProvider onAuthStateChange] Setting loading to false regardless of outcome');
          setLoading(false);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Function to sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) {
        console.error('Error signing in with Google:', error.message);
      }
    } catch (error) {
      console.error('Exception during Google sign in:', error.message);
    }
  };

  // Function to sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
      }
    } catch (error) {
      console.error('Exception during sign out:', error.message);
    }
  };

  const value = {
    session,
    user,
    profile, // Added profile to context value
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
