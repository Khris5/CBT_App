// src/contexts/AuthContext.jsx
import { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

// Create the AuthContext
const AuthContext = createContext();
// Create the AuthProvider component
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Added profile state
  const [loading, setLoading] = useState(true);
  
  console.log('[AuthProvider] Rendering. Current loading state:', loading);

  useEffect(() => {
    console.log('[AuthProvider useEffect] Effect started. Setting loading to true.');
    setLoading(true); // Ensure loading is true at the start of effect

    // Helper function to fetch profile
    const fetchUserProfile = async (currentUser) => {
      console.log('[fetchUserProfile] Called for user:', currentUser?.id);
      if (!currentUser) {
        console.log('[fetchUserProfile] No current user. Setting profile to null.');
        setProfile(null);
        return; // Explicitly return if no user
      }

      try {
        console.log(`[fetchUserProfile] Attempting to query 'profiles' table for id: ${currentUser.id}`);
        const query = supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        console.log(`[fetchUserProfile] Awaiting Supabase query for id: ${currentUser.id}`);
        const { data: profileData, error: profileError } = await query;
        console.log(`[fetchUserProfile] Supabase query awaited for id: ${currentUser.id}. Error:`, profileError, "Data:", profileData);

        if (profileError) {
          console.error(`[fetchUserProfile] Error object present after query for id: ${currentUser.id}. Message:`, profileError.message, "Details:", profileError);
          setProfile(null);
        } else if (profileData) {
          console.log(`[fetchUserProfile] Profile data found for id: ${currentUser.id}:`, profileData);
          setProfile(profileData);
        } else {
          console.log(`[fetchUserProfile] No profile data and no error for id: ${currentUser.id}. Setting profile to null (this case should ideally be an error from .single()).`);
          setProfile(null); // Should be caught by profileError if .single() finds no rows
        }
      } catch (e) {
        console.error(`[fetchUserProfile] EXCEPTION caught for id: ${currentUser.id}. Message:`, e.message, "Stack:", e.stack);
        setProfile(null);
      } finally {
        console.log(`[fetchUserProfile] Execution finished for user: ${currentUser?.id}`);
      }
    };

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      const currentUser = initialSession?.user ?? null;
      setSession(initialSession);
      setUser(currentUser);
      console.log('[AuthProvider getSession then] Fetching profile for user:', currentUser?.id);
      await fetchUserProfile(currentUser); // Fetch profile for initial session
      console.log('[AuthProvider getSession then] Profile fetched for user:', currentUser?.id +'Setting loading to false.');
      setLoading(false); // Set loading to false after session and profile are handled
    }).catch(error => {
      console.error('Error getting initial session:', error.message);
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false); // Still set loading to false on error
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log('[AuthProvider onAuthStateChange] Event received:', _event);
        
        const newUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(newUser);
        console.log('[AuthProvider onAuthStateChange] New user:', newUser?.id);
        await fetchUserProfile(newUser);
        // Ensure loading is false if this is the first auth event establishing a session or no session
        // If getSession already set it to false, this is okay.
        // If getSession is still pending, this might set loading to false prematurely if an auth event fires early.
        // However, the primary setLoading(false) after initial getSession() should take precedence for initial load.
        console.log('[AuthProvider onAuthStateChange] Loading state:', loading);
        if (loading) { // Only set to false if it's currently true
          console.log('[AuthProvider onAuthStateChange] Loading was true. Setting loading to false.');
            setLoading(false);
        }else {
          console.log('[AuthProvider onAuthStateChange] Loading was already false.');
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
      // Set loading to true before initiating sign-in to prevent UI flicker or race conditions
      // setLoading(true); // Optional: if you want loading state during redirect
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) {
        console.error('Error signing in with Google:', error.message);
        // setLoading(false); // Reset loading if error before redirect
      }
      // setLoading(false) will be handled by onAuthStateChange after redirect
    } catch (error) {
      console.error('Exception during Google sign in:', error.message);
      // setLoading(false);
    }
  };

  // Function to sign out
  const signOut = async () => {
    try {
      // setLoading(true); // Optional: if you want loading state during sign out
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        // setLoading(false);
      }
      // setLoading(false) and profile reset will be handled by onAuthStateChange
    } catch (error) {
      console.error('Exception during sign out:', error.message);
      // setLoading(false);
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
