import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { 
  User, 
  Globe, 
  CreditCard, 
  Users, 
  Database, 
  X,
  ChevronDown,
  Moon,
  Sun,
  Settings,
  Copy,
  Info
} from 'lucide-react';
import PreferencesSettings from './PreferencesSettings';

// Add CSS keyframes for animations
const animationKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideInFromBottom {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.1s ease-out forwards;
  }
  
  .animate-slideInFromBottom {
    animation: slideInFromBottom 0.15s ease-out forwards;
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animationKeyframes;
  document.head.appendChild(style);
}

const SettingsModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState('account');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');
  const [chatModel, setChatModel] = useState('Gemini 2.5 Flash');
  const [showReferralInfo, setShowReferralInfo] = useState(false);
  
  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Check current theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const copyReferralLink = () => {
    const referralLink = `https://eduextract.com/ref/${user?.uid || 'user'}`;
    navigator.clipboard.writeText(referralLink);
    // You could add a toast notification here
  };

  // Name editing functions
  const handleEditName = () => {
    setIsEditingName(true);
    setEditedName(user?.displayName || '');
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    
    setIsUpdatingName(true);
    try {
      // Update Firebase Auth profile
      await updateProfile({ displayName: editedName.trim() });
      
      // Update database
      const token = await user.getIdToken();
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editedName.trim(),
          email: user.email
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user in database');
      }
      
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      // You could add a toast notification here
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(user?.displayName || '');
  };

  if (!isOpen) return null;

  const settingsTabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'user-prefs', label: 'User Preferences', icon: Settings },
    { id: 'personalization', label: 'Personalization', icon: Globe },
    { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'data', label: 'Data Controls', icon: Database }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden border border-gray-200 dark:border-[#fafafa1a] animate-slideInFromBottom"
      >
        {/* Left Sidebar */}
        <div className="w-64 bg-gray-50 dark:bg-[#1E1E1E] p-6 border-r border-gray-200 dark:border-[#fafafa1a]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-[#fafafa1a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          <nav className="space-y-2">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-white dark:bg-[#171717] text-gray-900 dark:text-white shadow-sm ' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#fafafa1a]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account</h3>

                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                      {isEditingName ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveName();
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-[#fafafa1a] rounded-lg bg-white dark:bg-[#171717] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your name"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveName}
                            disabled={isUpdatingName || !editedName.trim()}
                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isUpdatingName ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isUpdatingName}
                            className="px-3 py-2 bg-gray-200 dark:bg-[#fafafa1a] text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-[#fafafa2a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-900 dark:text-white">{user?.displayName || 'User'}</p>
                      )}
                    </div>
                    {!isEditingName && (
                      <button 
                        onClick={handleEditName}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-[#fafafa1a] rounded transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                      <p className="text-gray-900 dark:text-white">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Created</label>
                      <p className="text-gray-900 dark:text-white">March 30, 2025</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Streaks</label>
                        <p className="text-gray-900 dark:text-white">1</p>
                      </div>
                      <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Count</label>
                        <p className="text-gray-900 dark:text-white">9</p>
                      </div>
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  {/* Referral Section */}
                  <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">15% Off - Referral Link</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Invite friends, get 15% off for 1 month per referral</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowReferralInfo(!showReferralInfo)}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                      >
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        onClick={copyReferralLink}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'user-prefs' && (
            <div className="space-y-6">
              <PreferencesSettings embedded />
            </div>
          )}

          {activeTab === 'personalization' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Personalization</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-900 dark:text-white">{language}</span>
                        <div className="flex">
                          <span className="text-lg">🇺🇸</span>
                          <span className="text-lg">🇬🇧</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-900 dark:text-white">{isDarkMode ? 'Dark' : 'Light'}</span>
                        {isDarkMode ? (
                          <Moon className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-[#fafafa1a] rounded"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Chat Model</label>
                      <p className="text-gray-900 dark:text-white mt-1">{chatModel}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Plan & Billing</h3>
                <p className="text-gray-600 dark:text-gray-400">Manage your subscription and billing information.</p>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Members</h3>
                <p className="text-gray-600 dark:text-gray-400">Manage team members and permissions.</p>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Data Controls</h3>
                <p className="text-gray-600 dark:text-gray-400">Control your data and privacy settings.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
