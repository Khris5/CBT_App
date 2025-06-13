import { useState, useCallback } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoginPromptModal from "../Modals/LoginPromptModal";
import Spinner from "../Spinner";
import { IoIosLogOut } from "react-icons/io";

const MainLayout = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user, profile, signOut, loading, signInWithGoogle } = useAuth();

  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/"); // Redirect to home page after sign out
  };

  const handleShowLoginModal = useCallback(() => {
    setShowLoginModal(true);
  }, []);

  const handleCloseLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold text-accent hover:text-opacity-80"
          >
            NMC Prep
          </Link>
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <Link to="/" className="text-text-primary hover:text-accent">
                  Home
                </Link>
                <Link
                  to="/dashboard"
                  className="text-text-primary hover:text-accent"
                >
                  <div className="sm:hidden flex items-center space-x-2">
                    <img
                      src={profile?.avatar_url || "/149071.png"}
                      alt={`${profile?.full_name || "User"}'s avatar`}
                      className="w-10 h-10 rounded-full object-cover border-accent border-2 mr-2"
                    />
                    {/* <span className="text-sm font-semibold text-text-primary">
                      {profile?.full_name}
                    </span> */}
                  </div>
                  <span className="sm:inline hidden">Dashboard</span>
                </Link>
              </>
            )}
            {loading ? (
              <Spinner size="h-5 w-5" />
            ) : user ? (
              <>
                <button
                  onClick={handleSignOut}
                  className="hidden sm:inline bg-accent text-white px-4 py-2 rounded hover:bg-opacity-80 transition duration-150"
                >
                  Sign Out
                </button>
                <button
                  onClick={handleSignOut}
                  className="sm:hidden text-2xl text-accent font-bold hover:text-opacity-80 transition duration-150"
                >
                  <IoIosLogOut />
                </button>
              </>
            ) : (
              <button
                onClick={handleShowLoginModal}
                className="bg-accent text-white px-4 py-2 rounded hover:bg-opacity-80 transition duration-150"
              >
                Log In
              </button>
            )}
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-1 sm:p-4">
        <Outlet /> {/* This is where the routed components will render */}
      </main>
      <footer className="bg-gray-100 text-center p-4 mt-8 w-full  ">
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} NMC Prep. All rights reserved.
        </p>
      </footer>

      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={handleCloseLoginModal}
        onSignIn={signInWithGoogle}
      />
    </div>
  );
};

export default MainLayout;
