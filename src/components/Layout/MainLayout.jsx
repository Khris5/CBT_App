import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const MainLayout = () => {
  const { user, signOut, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/"); // Redirect to home page after sign out
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold text-accent hover:text-opacity-80"
          >
            CBT App
          </Link>
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-text-primary hover:text-accent">
              Home
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className="text-text-primary hover:text-accent"
              >
                Dashboard
              </Link>
            )}
            {loading ? (
              <span className="text-sm text-gray-500">Loading...</span>
            ) : user ? (
              <button
                onClick={handleSignOut}
                className="bg-accent text-white px-4 py-2 rounded hover:bg-opacity-80 transition duration-150"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="bg-accent text-white px-4 py-2 rounded hover:bg-opacity-80 transition duration-150"
              >
                Log In
              </button>
            )}
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-4">
        <Outlet /> {/* This is where the routed components will render */}
      </main>
      <footer className="bg-gray-100 text-center p-4 mt-8 w-full  ">
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} CBT App. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default MainLayout;
