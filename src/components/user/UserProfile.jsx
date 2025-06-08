import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUserProfile, getUserDisplayName, formatLastActive } from '@/hooks/useUserProfile';
import { Loader2, Save, User, Settings, Activity, Users } from 'lucide-react';

export function UserProfile() {
  const { user, stats, isLoading, updateProfile, updatePreferences } = useUserProfile();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({});
  const [preferencesForm, setPreferencesForm] = useState({});

  // Initialize forms when user data loads
  React.useEffect(() => {
    if (user) {
      setProfileForm({
        displayName: user.profile?.displayName || '',
        bio: user.profile?.bio || '',
        timezone: user.profile?.timezone || 'UTC',
        language: user.profile?.language || 'en'
      });
      
      setPreferencesForm({
        theme: user.preferences?.theme || 'dark',
        notifications: user.preferences?.notifications || {},
        editor: user.preferences?.editor || {},
        collaboration: user.preferences?.collaboration || {}
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        'profile.displayName': profileForm.displayName,
        'profile.bio': profileForm.bio,
        'profile.timezone': profileForm.timezone,
        'profile.language': profileForm.language
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    try {
      await updatePreferences.mutateAsync(preferencesForm);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Unable to load user profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          {getUserDisplayName(user).charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{getUserDisplayName(user)}</h1>
          <p className="text-gray-500">{user.email}</p>
          <p className="text-sm text-gray-400">
            Last active: {formatLastActive(user.activity?.lastActiveAt)}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats?.activity?.sessionsCreated || 0}</div>
            <div className="text-sm text-gray-500">Sessions Created</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats?.activity?.sessionsJoined || 0}</div>
            <div className="text-sm text-gray-500">Sessions Joined</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Math.round((stats?.activity?.totalCollaborationTime || 0) / 60)}h
            </div>
            <div className="text-sm text-gray-500">Collaboration Time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{user.activity?.loginCount || 0}</div>
            <div className="text-sm text-gray-500">Total Logins</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'preferences', label: 'Preferences', icon: Settings },
          { id: 'activity', label: 'Activity', icon: Activity },
          { id: 'collaborators', label: 'Collaborators', icon: Users }
        ].map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? 'default' : 'ghost'}
            onClick={() => setActiveTab(id)}
            className="flex-1"
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profileForm.displayName || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  placeholder="Your display name"
                />
              </div>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Tell others about yourself..."
                  maxLength={500}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={profileForm.timezone || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                    placeholder="UTC"
                  />
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    value={profileForm.language || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, language: e.target.value })}
                    placeholder="en"
                  />
                </div>
              </div>
              
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePreferencesSubmit} className="space-y-6">
              {/* Theme Preferences */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Theme</h3>
                <div className="flex space-x-2">
                  {['light', 'dark', 'system'].map(theme => (
                    <Button
                      key={theme}
                      type="button"
                      variant={preferencesForm.theme === theme ? 'default' : 'outline'}
                      onClick={() => setPreferencesForm({
                        ...preferencesForm,
                        theme
                      })}
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Notification Preferences */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Session Invites</Label>
                      <p className="text-sm text-gray-500">Receive notifications when invited to sessions</p>
                    </div>
                    <Switch
                      checked={preferencesForm.notifications?.email?.sessionInvites ?? true}
                      onCheckedChange={(checked) => setPreferencesForm({
                        ...preferencesForm,
                        notifications: {
                          ...preferencesForm.notifications,
                          email: {
                            ...preferencesForm.notifications?.email,
                            sessionInvites: checked
                          }
                        }
                      })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Real-time Updates</Label>
                      <p className="text-sm text-gray-500">Get notified of live collaboration activity</p>
                    </div>
                    <Switch
                      checked={preferencesForm.notifications?.push?.realTimeUpdates ?? true}
                      onCheckedChange={(checked) => setPreferencesForm({
                        ...preferencesForm,
                        notifications: {
                          ...preferencesForm.notifications,
                          push: {
                            ...preferencesForm.notifications?.push,
                            realTimeUpdates: checked
                          }
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Editor Preferences */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Editor</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Input
                      id="fontSize"
                      type="number"
                      min="10"
                      max="24"
                      value={preferencesForm.editor?.fontSize || 14}
                      onChange={(e) => setPreferencesForm({
                        ...preferencesForm,
                        editor: {
                          ...preferencesForm.editor,
                          fontSize: parseInt(e.target.value)
                        }
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tabSize">Tab Size</Label>
                    <Input
                      id="tabSize"
                      type="number"
                      min="1"
                      max="8"
                      value={preferencesForm.editor?.tabSize || 2}
                      onChange={(e) => setPreferencesForm({
                        ...preferencesForm,
                        editor: {
                          ...preferencesForm.editor,
                          tabSize: parseInt(e.target.value)
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
              
              <Button type="submit" disabled={updatePreferences.isPending}>
                {updatePreferences.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Preferences
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Favorite Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {user.activity?.favoriteLanguages?.map(lang => (
                    <Badge key={lang} variant="secondary">{lang}</Badge>
                  )) || <span className="text-gray-500">No languages recorded yet</span>}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Account Created</h3>
                <p className="text-gray-600">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Account Status</h3>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'collaborators' && (
        <Card>
          <CardHeader>
            <CardTitle>Frequent Collaborators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.relationships?.topCollaborators?.length > 0 ? (
                stats.relationships.topCollaborators.map(collab => (
                  <div key={collab.email} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <p className="font-medium">{collab.email.split('@')[0]}</p>
                      <p className="text-sm text-gray-500">{collab.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{collab.collaborationCount} sessions</p>
                      <p className="text-xs text-gray-500">
                        Last: {formatLastActive(collab.lastCollaborated)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No collaborators yet. Start inviting people to your sessions!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
