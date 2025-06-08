import React, { useState } from 'react';
import { useUserProfile, useUserSearch, getUserDisplayName, getUserAvatarUrl, formatLastActive } from '../../../backups/src/hooks/useUserProfile';

/**
 * Test component to demonstrate the User Profile functionality
 * This shows how to use the new User model and API endpoints
 */
const UserProfileTest = () => {
  const { user, stats, isLoading, error, updateProfile, updatePreferences } = useUserProfile();
  const { searchUsers, searchResults, isSearching } = useUserSearch();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileUpdates, setProfileUpdates] = useState({});

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchUsers({ query: searchQuery });
    }
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    if (Object.keys(profileUpdates).length > 0) {
      updateProfile.mutate(profileUpdates);
      setProfileUpdates({});
    }
  };

  const handlePreferenceChange = (key, value) => {
    const preferences = { [key]: value };
    updatePreferences.mutate(preferences);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading user profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <h3 className="text-red-800 font-medium">Error loading user profile</h3>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">User Profile Test</h1>
      
      {/* Current User Profile */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Current User Profile</h2>
        
        {user && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <img
                src={getUserAvatarUrl(user) || 'https://via.placeholder.com/40'}
                alt="User Avatar"
                className="w-16 h-16 rounded-full bg-gray-200"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName(user))}&background=6366f1&color=ffffff`;
                }}
              />
              <div>
                <h3 className="text-lg font-medium">{getUserDisplayName(user)}</h3>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">
                  Last active: {formatLastActive(user.activity?.lastActiveAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Bio:</span> {user.profile?.bio || 'No bio set'}
              </div>
              <div>
                <span className="font-medium">Timezone:</span> {user.profile?.timezone || 'UTC'}
              </div>
              <div>
                <span className="font-medium">Language:</span> {user.profile?.language || 'en'}
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  {user.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Statistics */}
      {stats && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Activity Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.activity?.sessionsCreated || 0}</div>
              <div className="text-sm text-gray-600">Sessions Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activity?.sessionsJoined || 0}</div>
              <div className="text-sm text-gray-600">Sessions Joined</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.activity?.totalCollaborationTime || 0}</div>
              <div className="text-sm text-gray-600">Minutes Collaborated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.activity?.loginCount || 0}</div>
              <div className="text-sm text-gray-600">Total Logins</div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Update Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Update Profile</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Name</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder={user?.profile?.displayName || 'Enter display name'}
              onChange={(e) => setProfileUpdates({...profileUpdates, 'profile.displayName': e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              rows="3"
              placeholder={user?.profile?.bio || 'Tell us about yourself...'}
              onChange={(e) => setProfileUpdates({...profileUpdates, 'profile.bio': e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Timezone</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              onChange={(e) => setProfileUpdates({...profileUpdates, 'profile.timezone': e.target.value})}
            >
              <option value="">Select timezone</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending || Object.keys(profileUpdates).length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Updating...' : 'Update Profile'}
          </button>
          {updateProfile.isSuccess && (
            <p className="text-green-600 text-sm">Profile updated successfully!</p>
          )}
        </form>
      </div>

      {/* User Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Search Users</h2>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for users by name or email..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {searchResults && searchResults.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Search Results:</h3>
            <div className="space-y-2">
              {searchResults.map((searchUser) => (
                <div key={searchUser.email} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(searchUser.displayName || searchUser.name)}&background=6366f1&color=ffffff`}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full bg-gray-200"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{searchUser.displayName || searchUser.name}</div>
                    <div className="text-sm text-gray-600">{searchUser.email}</div>
                  </div>
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchResults && searchResults.length === 0 && searchQuery && (
          <p className="mt-4 text-gray-600">No users found matching "{searchQuery}"</p>
        )}
      </div>

      {/* Quick Preferences */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Preferences</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Theme</span>
            <select
              value={user?.preferences?.theme || 'dark'}
              onChange={(e) => handlePreferenceChange('theme', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span>Email Notifications</span>
            <input
              type="checkbox"
              checked={user?.preferences?.notifications?.email?.sessionInvites || false}
              onChange={(e) => handlePreferenceChange('notifications.email.sessionInvites', e.target.checked)}
              className="rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Show User Cursors</span>
            <input
              type="checkbox"
              checked={user?.preferences?.collaboration?.showCursors || false}
              onChange={(e) => handlePreferenceChange('collaboration.showCursors', e.target.checked)}
              className="rounded"
            />
          </div>
        </div>
        {updatePreferences.isSuccess && (
          <p className="text-green-600 text-sm mt-2">Preferences updated!</p>
        )}
      </div>
    </div>
  );
};

export default UserProfileTest;