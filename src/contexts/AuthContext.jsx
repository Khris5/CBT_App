import { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log(
    "[AuthProvider] Current state - loading:",
    loading,
    "user:",
    user?.id
  );

  useEffect(() => {
    console.log("[AuthProvider] Setting up auth listener...");

    // Get initial session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[AuthProvider] Initial session loaded:", !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth changes - following Supabase best practices
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "[AuthProvider] Auth event:",
        event,
        "Session exists:",
        !!session
      );

      // Handle each event type according to Supabase docs
      switch (event) {
        case "INITIAL_SESSION":
          // This fires right after client construction with initial session from storage
          console.log("[AuthProvider] INITIAL_SESSION event");
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          break;

        case "SIGNED_IN":
          // Fires on sign in and when refocusing tabs
          // Check if this is actually a new user to avoid unnecessary updates
          console.log("[AuthProvider] SIGNED_IN event");
          setSession(session);
          setUser(session?.user ?? null);

          // Defer profile fetching to avoid blocking the callback
          if (session?.user) {
            setTimeout(() => {
              fetchUserProfile(session.user);
            }, 0);
          }
          break;

        case "SIGNED_OUT":
          // User signed out - clean up all state
          console.log("[AuthProvider] SIGNED_OUT event - cleaning up state");
          setSession(null);
          setUser(null);
          setProfile(null);
          break;

        case "TOKEN_REFRESHED":
          // New tokens fetched - update session in memory
          console.log("[AuthProvider] TOKEN_REFRESHED event");
          setSession(session);
          setUser(session?.user ?? null);
          break;

        case "USER_UPDATED":
          // User profile updated via updateUser()
          console.log("[AuthProvider] USER_UPDATED event");
          setSession(session);
          setUser(session?.user ?? null);

          // Defer profile refetch to get updated data
          if (session?.user) {
            setTimeout(() => {
              fetchUserProfile(session.user);
            }, 0);
          }
          break;

        case "PASSWORD_RECOVERY":
          // User landed on password recovery page
          console.log("[AuthProvider] PASSWORD_RECOVERY event");
          setSession(session);
          setUser(session?.user ?? null);
          break;

        default:
          console.log("[AuthProvider] Unknown auth event:", event);
          break;
      }
    });

    return () => {
      console.log("[AuthProvider] Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  // Profile fetching function - deferred to avoid blocking auth callbacks
  const fetchUserProfile = async (currentUser) => {
    if (!currentUser?.id) {
      console.log("[fetchUserProfile] No user provided");
      setProfile(null);
      return;
    }

    try {
      console.log(
        "[fetchUserProfile] Fetching profile for user:",
        currentUser.id
      );

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        console.error("[fetchUserProfile] Error:", error);
        setProfile(null);
        return;
      }

      console.log("[fetchUserProfile] Profile loaded:", !!data);
      setProfile(data);
    } catch (error) {
      console.error("[fetchUserProfile] Exception:", error);
      setProfile(null);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      console.log("[signInWithGoogle] Initiating Google OAuth...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        console.error("[signInWithGoogle] OAuth error:", error);
        throw error;
      }

      console.log("[signInWithGoogle] OAuth initiated");
      return data;
    } catch (error) {
      console.error("[signInWithGoogle] Failed:", error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log("[signOut] Signing out...");

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("[signOut] Error:", error);
        throw error;
      }

      console.log("[signOut] Success");
      // State will be cleaned up by the SIGNED_OUT event
    } catch (error) {
      console.error("[signOut] Failed:", error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
