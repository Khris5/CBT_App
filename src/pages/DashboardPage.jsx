import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="container mx-auto p-4 text-text-primary">Loading dashboard...</div>;
  }

  if (!user || !profile) {
    // This should ideally not happen if the route is protected properly
    // and AuthContext ensures profile is loaded for a logged-in user.
    return <div className="container mx-auto p-4 text-text-primary">Could not load user profile. Please try logging in again.</div>;
  }

  return (
    <div className="container mx-auto p-6 bg-background min-h-screen">
      <h1 className="text-4xl font-bold text-text-primary mb-8">User Dashboard</h1>

      {/* User Information Section */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">My Profile</h2>
        <div className="flex items-center space-x-4 mb-4">
          {profile.avatar_url && (
            <img 
              src={profile.avatar_url} 
              alt={`${profile.full_name || 'User'}'s avatar`} 
              className="w-20 h-20 rounded-full object-cover border-2 border-accent"
            />
          )}
          <div>
            <p className="text-xl text-gray-700">
              <strong>Full Name:</strong> {profile.full_name || 'Not set'}
            </p>
            <p className="text-md text-gray-600">
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        </div>
        {/* You can add more profile details here if needed */}
      </div>

      {/* Past Practice Sessions Section */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Past Practice Sessions</h2>
        <div className="text-gray-600">
          <p>No past sessions recorded yet.</p>
          {/* Later, this will be replaced by a list of past sessions */}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
