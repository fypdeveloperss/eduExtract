import React, { useState } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import './AuthModal.css';

const AuthInput = ({ type, placeholder, value, onChange, icon: Icon, showPassword, togglePassword }) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Icon className="h-5 w-5 text-[#4B5563] dark:text-[#9CA3AF] transition-all duration-200 group-focus-within:text-[#171717] dark:group-focus-within:text-[#fafafa] group-focus-within:scale-110" />
    </div>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full pl-10 pr-10 py-3 bg-[#FFFFFF] dark:bg-[#171717] border border-neutral-300 dark:border-[#2E2E2E] rounded-lg text-[#171717cc] dark:text-[#fafafacc] placeholder-[#171717cc] dark:placeholder-[#fafafacc] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#fafafa] focus:border-transparent transition-all duration-300 hover:border-neutral-400 dark:hover:border-[#4B5563] focus:scale-[1.02] focus:shadow-lg"
    />
    {type === 'password' && (
      <button
        type="button"
        onClick={togglePassword}
        className="absolute inset-y-0 right-0 pr-3 flex items-center transition-all duration-200 hover:scale-110"
      >
        {showPassword ? (
          <EyeOff className="h-5 w-5 text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#171717] dark:hover:text-[#fafafa] transition-all duration-200" />
        ) : (
          <Eye className="h-5 w-5 text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#171717] dark:hover:text-[#fafafa] transition-all duration-200" />
        )}
      </button>
    )}
  </div>
);

const AuthButton = ({ children, onClick, loading, variant = 'primary' }) => {
  const baseClasses = "w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 group";
  const variants = {
    primary: "bg-[#171717] dark:bg-[#fafafa] text-[#fafafa] dark:text-[#171717] shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:bg-[#2E2E2E] dark:hover:bg-[#E5E7EB] hover:scale-[1.02] active:scale-[0.98]",
    secondary: "bg-[#F3F4F6] dark:bg-[#2E2E2E] hover:bg-[#E5E7EB] dark:hover:bg-[#1E1E1E] text-[#171717cc] dark:text-[#fafafacc] hover:scale-[1.02] active:scale-[0.98]",
    outline: "border-2 border-[#171717] dark:border-[#fafafa] text-[#171717] dark:text-[#fafafa] hover:bg-[#171717] dark:hover:bg-[#fafafa] hover:text-[#fafafa] dark:hover:text-[#171717] hover:scale-[1.02] active:scale-[0.98]"
  };
  
  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className={`${baseClasses} ${variants[variant]} ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span className="animate-pulse">Processing...</span>
        </>
      ) : (
        <>
          <span className="group-hover:translate-x-1 transition-transform duration-200">{children}</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
        </>
      )}
    </button>
  );
};

const GoogleButton = ({ onClick, loading }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className="w-full flex items-center justify-center gap-3 bg-[#FFFFFF] dark:bg-[#171717] border border-neutral-300 dark:border-[#2E2E2E] text-[#171717cc] dark:text-[#fafafacc] py-3 px-4 rounded-lg font-medium hover:bg-[#F3F4F6] dark:hover:bg-[#2E2E2E] transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group"
  >
    <img
      src="https://www.svgrepo.com/show/475656/google-color.svg"
      alt="Google"
      className="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
    />
    <span className="group-hover:translate-x-1 transition-transform duration-200">Continue with Google</span>
  </button>
);

const AuthModal = () => {
  const { 
    showAuthModal, 
    toggleAuthModal, 
    login, 
    signup, 
    loginWithGoogle,
    error: authError,
    modalMode,
    setModalMode
  } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isSignIn = modalMode === 'signin';

  if (!showAuthModal) return null;

  const validateForm = () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isSignIn) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setModalMode(isSignIn ? 'signup' : 'signin');
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleClose = () => {
    toggleAuthModal(false);
    setEmail('');
    setPassword('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-[#FFFFFF] dark:bg-[#171717] rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden border border-neutral-200 dark:border-[#2E2E2E] animate-slideUp">
        {/* Header with neutral theme */}
        <div className="bg-[#F3F4F6] dark:bg-[#2E2E2E] p-6 text-[#171717cc] dark:text-[#fafafacc] relative animate-slideDown">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#171717] dark:hover:text-[#fafafa] transition-all duration-200 hover:scale-110 hover:rotate-90 hover:bg-white/10 dark:hover:bg-black/10 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3 mb-2 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <div className="p-2 bg-white dark:bg-[#171717] rounded-lg border border-neutral-200 dark:border-[#2E2E2E] animate-pulse-slow">
              <Sparkles className="h-6 w-6 text-[#4B5563] dark:text-[#9CA3AF] animate-bounce-slow" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#171717] dark:text-[#fafafa] animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
                {isSignIn ? 'Welcome back!' : 'Join EduExtract'}
              </h2>
              <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                {isSignIn 
                  ? "Continue your learning journey"
                  : "Start your educational adventure"}
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <GoogleButton onClick={handleGoogleSignIn} loading={loading} />
          </div>

          <div className="flex items-center my-6 animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
            <hr className="flex-grow border-neutral-300 dark:border-[#2E2E2E] animate-expand" />
            <span className="text-[#4B5563] dark:text-[#9CA3AF] mx-3 text-sm font-medium">or</span>
            <hr className="flex-grow border-neutral-300 dark:border-[#2E2E2E] animate-expand" />
          </div>

          {(error || authError) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 animate-shake">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error || authError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            <div className="animate-fadeInUp" style={{ animationDelay: '0.45s' }}>
              <AuthInput
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
              />
            </div>
            
            <div className="animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
              <AuthInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                showPassword={showPassword}
                togglePassword={() => setShowPassword(!showPassword)}
              />
            </div>

            {isSignIn && (
              <div className="text-right animate-fadeInUp" style={{ animationDelay: '0.55s' }}>
                <button 
                  type="button"
                  className="text-sm text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#171717] dark:hover:text-[#fafafa] font-medium transition-all duration-200 hover:scale-105"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div className="animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
              <AuthButton onClick={handleSubmit} loading={loading}>
                {isSignIn ? 'Sign In' : 'Create Account'}
              </AuthButton>
            </div>
          </form>

          <div className="mt-6 text-center animate-fadeInUp" style={{ animationDelay: '0.65s' }}>
            <p className="text-[#4B5563] dark:text-[#9CA3AF] text-sm">
              {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={switchMode}
                className="text-[#171717] dark:text-[#fafafa] hover:text-[#4B5563] dark:hover:text-[#9CA3AF] font-semibold transition-all duration-200 hover:scale-105 hover:underline"
              >
                {isSignIn ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F3F4F6] dark:bg-[#1E1E1E] px-6 py-4 rounded-b-2xl animate-fadeInUp" style={{ animationDelay: '0.7s' }}>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] text-center animate-fadeIn">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 