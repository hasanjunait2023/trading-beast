import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Bell, Globe, Shield, Trash2, Save, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' }
];

export default function Settings() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    username: user?.username || '',
    languageCode: user?.languageCode || 'en'
  });
  const [notifications, setNotifications] = useState({
    sessionAlerts: true,
    focusUpdates: true,
    referralUpdates: true,
    paymentUpdates: true,
    marketingEmails: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        username: user.username || '',
        languageCode: user.languageCode || 'en'
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // In a real app, call API to update profile
      // For now, just simulate
      await new Promise(r => setTimeout(r, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    // In a real app, call API to delete account
    // For now, just logout
    logout();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-[var(--color-text-muted)]">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-medium flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </h2>
          {saved && (
            <span className="text-sm text-[var(--color-success)] flex items-center gap-1">
              <Save className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>

        <div className="grid grid-1 md:grid-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input
              type="text"
              className="input"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              className="input"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              placeholder="@username"
            />
          </div>
          <div>
            <label className="label">Language</label>
            <select
              className="input"
              value={profile.languageCode}
              onChange={(e) => setProfile({ ...profile, languageCode: e.target.value })}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Telegram ID</label>
            <input
              type="text"
              className="input"
              value={user?.telegramId || ''}
              readOnly
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Cannot be changed</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Configure which notifications you receive via Telegram and email
        </p>

        <div className="space-y-3">
          {[
            { key: 'sessionAlerts', label: 'Session Start Alerts', desc: 'Get notified when Asian/London/NY sessions begin' },
            { key: 'focusUpdates', label: 'Focus List Updates', desc: 'New focus pairs posted at session open' },
            { key: 'referralUpdates', label: 'Referral Activity', desc: 'When someone uses your referral code' },
            { key: 'paymentUpdates', label: 'Payment Status', desc: 'Payment approved/rejected notifications' },
            { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Product updates, tips, and occasional offers' }
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{label}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifications[key as keyof typeof notifications]}
                  onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                />
                <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-accent)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Security Section */}
      <div className="card">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-[var(--color-text-muted)]">Add an extra layer of security to your account</p>
            </div>
            <button className="btn btn-secondary btn-sm">Enable 2FA</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
            <div>
              <p className="font-medium">Active Sessions</p>
              <p className="text-sm text-[var(--color-text-muted)]">View and manage logged-in devices</p>
            </div>
            <button className="btn btn-secondary btn-sm">View Sessions</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
            <div>
              <p className="font-medium">API Access</p>
              <p className="text-sm text-[var(--color-text-muted)]">Generate API keys for programmatic access</p>
            </div>
            <button className="btn btn-secondary btn-sm" disabled>Elite Only</button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5">
        <h2 className="font-medium mb-4 flex items-center gap-2 text-[var(--color-danger)]">
          <Trash2 className="w-5 h-5" />
          Danger Zone
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          These actions are irreversible. Please proceed with caution.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              Type your Telegram ID to confirm account deletion:
            </p>
            <input
              type="text"
              className="input"
              placeholder={user?.telegramId}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deletePassword !== user?.telegramId}
                className="btn btn-danger flex-1"
              >
                Delete Permanently
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="card">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          About
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Environment</span>
            <span>{import.meta.env?.MODE || 'development'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Data Source</span>
            <span>Yahoo Finance + Finnhub</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Chart Engine</span>
            <span>QuickChart (self-hosted)</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          ⚠️ Session Focus Radar is a market analysis tool. Not investment advice.
          Trading involves risk. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  );
}