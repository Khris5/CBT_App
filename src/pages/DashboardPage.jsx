import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FaExternalLinkAlt,
  FaListAlt,
  FaChartBar,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [pastSessions, setPastSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const SESSIONS_PER_PAGE = 10;

  // Calculate total pages
  const totalPages = Math.ceil(totalSessions / SESSIONS_PER_PAGE);

  const fetchSessions = async (page = 1) => {
    if (!user?.id) return;

    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      setIsLoadingSessions(true);
    } else {
      setIsLoadingPage(true);
    }

    setFetchError(null);

    try {
      // Calculate offset for pagination
      const offset = (page - 1) * SESSIONS_PER_PAGE;

      // Fetch sessions with pagination
      const { data, error, count } = await supabase
        .from("user_sessions")
        .select(
          "id, started_at, category_selection, score_achieved, total_questions_in_session",
          { count: "exact" }
        )
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .range(offset, offset + SESSIONS_PER_PAGE - 1);

      if (error) throw error;

      setPastSessions(data || []);
      setTotalSessions(count || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching past sessions:", err);
      setFetchError("Failed to load past sessions. Please try again later.");
    } finally {
      setIsLoadingSessions(false);
      setIsLoadingPage(false);
    }
  };

  useEffect(() => {
    fetchSessions(1);
  }, [user]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const calculatePercentage = (score, total) => {
    if (total === 0) return "0%";
    return `${Math.round((score / total) * 100)}%`;
  };

  const handleSessionClick = (sessionId) => {
    navigate(`/review/${sessionId}`);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      fetchSessions(newPage);
    }
  };

  // Calculate overall statistics (based on all sessions, not just current page)
  const overallAverageScore = useMemo(() => {
    if (pastSessions.length === 0) return 0;
    const totalScore = pastSessions.reduce(
      (acc, session) =>
        acc + session.score_achieved / session.total_questions_in_session,
      0
    );
    return Math.round((totalScore / pastSessions.length) * 100);
  }, [pastSessions]);

  // Pagination component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600">
          Showing{" "}
          {Math.min((currentPage - 1) * SESSIONS_PER_PAGE + 1, totalSessions)}{" "}
          to {Math.min(currentPage * SESSIONS_PER_PAGE, totalSessions)} of{" "}
          {totalSessions} sessions
        </div>

        <div className="flex items-center space-x-2">
          {/* Previous button */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-md ${
              currentPage === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-accent hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            <FaChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = index + 1;
              } else if (currentPage <= 3) {
                pageNumber = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + index;
              } else {
                pageNumber = currentPage - 2 + index;
              }

              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    currentPage === pageNumber
                      ? "bg-accent text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md ${
              currentPage === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-accent hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            <FaChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background text-text-primary">
        <Spinner size="h-16 w-16" />
        <p className="text-xl mt-4">Loading dashboard...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <ErrorMessage message="Could not load user profile. Please try logging out and logging in again." />
        <button
          onClick={() => navigate("/login")}
          className="mt-6 bg-accent hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-background min-h-screen">
      <h1 className="text-3xl font-semibold sm:text-4xl sm:font-bold text-text-primary mb-8">
        User Dashboard
      </h1>

      {/* User Information Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          My Profile
        </h2>
        <div className="flex items-center space-x-4 mb-4">
          {profile.avatar_url && (
            <img
              src={profile.avatar_url || "/149071.png"}
              alt={`${profile.full_name || "User"}'s avatar`}
              className="w-20 h-20 rounded-full object-cover border-2 border-accent"
            />
          )}
          <div>
            <p className="sm:text-lg text-text-primary">
              <strong>Full Name:</strong> {profile.full_name || "Not set"}
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics Section */}
      {!isLoadingSessions && !fetchError && totalSessions > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-text-primary mb-4 flex items-center">
            <FaChartBar className="mr-3 text-accent" /> Session Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-orange-50 p-4 rounded-md shadow-sm border border-orange-200">
              <p className="text-sm text-accent font-medium">
                Total Tests Taken
              </p>
              <p className="text-2xl font-bold text-accent-dark">
                {totalSessions}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-md shadow-sm border border-gray-200">
              <p className="text-sm text-gray-700 font-medium">
                Current Page Average Score
              </p>
              <p className="text-2xl font-bold text-text-primary">
                {overallAverageScore}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Past Practice Sessions Section */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">
          Past Practice Sessions
        </h2>
        <div className="text-text-primary">
          {isLoadingSessions && (
            <div className="flex flex-col items-center justify-center py-10">
              <Spinner size="h-10 w-10" />
              <p className="text-gray-600 mt-3">Loading past sessions...</p>
            </div>
          )}
          {fetchError && (
            <div className="flex flex-col items-center justify-center py-10">
              <ErrorMessage message={fetchError} />
            </div>
          )}
          {!isLoadingSessions && !fetchError && totalSessions === 0 && (
            <div className="flex flex-col items-center justify-center text-gray-600 py-10 bg-gray-100 p-6 rounded-lg border border-gray-200">
              <FaListAlt className="h-12 w-12 mb-3 text-gray-400" />
              <p className="text-xl font-medium text-text-primary">
                No past practice sessions found.
              </p>
              <p className="text-sm text-gray-700">
                Start a new session to see your progress here!
              </p>
            </div>
          )}
          {!isLoadingSessions && !fetchError && pastSessions.length > 0 && (
            <>
              {/* Loading overlay for page changes */}
              <div className="relative">
                {isLoadingPage && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                    <Spinner size="h-8 w-8" />
                  </div>
                )}

                <div className="space-y-4">
                  {pastSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSessionClick(session.id)}
                      className="bg-gray-100 hover:bg-gray-200 p-2 sm:p-4 rounded-lg shadow-sm border border-gray-300 cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-[1.01]"
                    >
                      <div className="flex flex-row justify-between items-start sm:items-center">
                        <div>
                          <p className="text-sm font-semibold text-accent">
                            {formatDate(session.started_at)}
                          </p>
                          <p className="font-bold text-text-primary mt-1">
                            {session.category_selection}
                          </p>
                        </div>
                        <div className="sm:mt-0 sm:text-right">
                          <p className="text-md font-semibold text-text-primary">
                            Score: {session.score_achieved}/
                            {session.total_questions_in_session}
                            <span
                              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                (session.score_achieved /
                                  session.total_questions_in_session) *
                                  100 >=
                                70
                                  ? "bg-green-100 text-green-700"
                                  : (session.score_achieved /
                                      session.total_questions_in_session) *
                                      100 >=
                                    50
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {calculatePercentage(
                                session.score_achieved,
                                session.total_questions_in_session
                              )}
                            </span>
                          </p>
                          <p className="text-xs text-accent hover:text-orange-600 mt-1 flex items-center justify-end">
                            View Review{" "}
                            <FaExternalLinkAlt className="ml-1 h-3 w-3" />
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination Controls */}
              <PaginationControls />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
