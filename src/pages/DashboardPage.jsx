import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaExternalLinkAlt, FaListAlt, FaChartBar } from "react-icons/fa";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth(); // Renamed loading to authLoading to avoid conflict
  const [pastSessions, setPastSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (user && user.id) {
      const fetchSessions = async () => {
        setIsLoadingSessions(true);
        setFetchError(null);
        try {
          const { data, error } = await supabase
            .from("user_sessions")
            .select(
              "id, started_at, category_selection, score_achieved, total_questions_in_session"
            )
            .eq("user_id", user.id)
            .order("started_at", { ascending: false });

          if (error) throw error;
          setPastSessions(data || []);
        } catch (err) {
          console.error("Error fetching past sessions:", err);
          setFetchError(
            "Failed to load past sessions. Please try again later."
          );
        } finally {
          setIsLoadingSessions(false);
        }
      };
      fetchSessions();
    }
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

  // Optional: Summary Statistics
  const totalTestsTaken = pastSessions.length;
  const overallAverageScore = useMemo(() => {
    if (totalTestsTaken === 0) return 0;
    const totalScore = pastSessions.reduce(
      (acc, session) =>
        acc + session.score_achieved / session.total_questions_in_session,
      0
    );
    return Math.round((totalScore / totalTestsTaken) * 100);
  }, [pastSessions, totalTestsTaken]);

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
            <p className="text-xl text-text-primary">
              <strong>Full Name:</strong> {profile.full_name || "Not set"}
            </p>
            <p className="text-md text-gray-700">
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        </div>
        {/*more profile details here if needed */}
      </div>

      {/* Summary Statistics Section (Optional) */}
      {!isLoadingSessions && !fetchError && pastSessions.length > 0 && (
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
                {totalTestsTaken}
              </p>
            </div>
            <div className="bg-gray-100 p-4 rounded-md shadow-sm border border-gray-200">
              <p className="text-sm text-gray-700 font-medium">
                Overall Average Score
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
          {!isLoadingSessions && !fetchError && pastSessions.length === 0 && (
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
                      <p className=" font-bold text-text-primary mt-1">
                        {session.category_selection}
                      </p>
                    </div>
                    <div className=" sm:mt-0 sm:text-right">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
