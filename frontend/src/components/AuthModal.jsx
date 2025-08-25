import React, { useState } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';

const AuthInput = ({ type, placeholder, value, onChange }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="w-full p-3 bg-zinc-800 text-white rounded-md focus:outline-none"
  />
);

const AuthButton = ({ children, onClick, loading }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className={`w-full bg-zinc-700 text-white py-3 rounded-md mt-4 hover:bg-zinc-600 ${
      loading ? 'opacity-50 cursor-not-allowed' : ''
    }`}
  >
    {loading ? 'Processing...' : children}
  </button>
);

const GoogleButton = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white py-3 rounded-md hover:bg-zinc-700"
  >
    <img
      src="https://www.svgrepo.com/show/475656/google-color.svg"
      alt="Google"
      className="w-5 h-5"
    />
    Continue with Google
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-black p-8 rounded-md w-full max-w-md relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-white text-2xl font-semibold text-center mb-2">
          {isSignIn ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-zinc-400 text-center mb-6">
          {isSignIn 
            ? "Let's continue your learning journey."
            : "Let's get your learning journey started."}
        </p>

        <GoogleButton onClick={handleGoogleSignIn} />

        <div className="flex items-center my-4">
          <hr className="flex-grow border-zinc-700" />
          <span className="text-zinc-500 mx-2 text-sm">or continue with</span>
          <hr className="flex-grow border-zinc-700" />
        </div>

        {(error || authError) && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 mb-4">
            <p className="text-red-500 text-sm">{error || authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <AuthInput
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative mt-4">
            <AuthInput
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isSignIn && (
            <div className="text-right mt-2">
              <button className="text-sm text-zinc-400 hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          <AuthButton onClick={handleSubmit} loading={loading}>
            {isSignIn ? 'Sign In' : 'Sign Up'}
          </AuthButton>
        </form>

        <p className="text-center text-zinc-400 mt-6 text-sm">
          {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={switchMode}
            className="underline cursor-pointer"
          >
            {isSignIn ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal; 