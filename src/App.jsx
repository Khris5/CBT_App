import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import MainLayout from "./components/Layout/MainLayout";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import ReviewScreen from "./components/ReviewScreen";
import PracticeSession from "./components/PracticeSession";
import ResultsScreen from "./components/ResultsScreen";

// A wrapper for protected routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-text-primary text-lg">Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    // User not authenticated, redirect to home page (which is public)
    return <Navigate to="/" replace />;
  }

  return children; // User is authenticated, render the child component (DashboardPage)
};

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {" "}
        {/* MainLayout provides header/nav and renders child routes via <Outlet /> */}
        <Route index path="/" element={<HomePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/review/:sessionId"
          element={
            <ProtectedRoute>
              <ReviewScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/:sessionId"
          element={
            <ProtectedRoute>
              <PracticeSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results/:sessionId"
          element={
            <ProtectedRoute>
              <ResultsScreen />
            </ProtectedRoute>
          }
        />
        {/* Fallback route for any unmatched paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
