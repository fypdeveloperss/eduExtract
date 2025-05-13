import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const AuthInput = ({ type, placeholder, value, onChange }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="w-full p-3 bg-zinc-800 text-white rounded-md focus:outline-none"
  />
);

const AuthButton = ({ children }) => (
  <button className="w-full bg-zinc-700 text-white py-3 rounded-md mt-4 hover:bg-zinc-600">
    {children}
  </button>
);

const GoogleButton = ({ children }) => (
  <button className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white py-3 rounded-md hover:bg-zinc-700">
    <img
      src="https://www.svgrepo.com/show/475656/google-color.svg"
      alt="Google"
      className="w-5 h-5"
    />
    {children}
  </button>
);

export const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Link to="/" className="absolute top-6 left-6 text-white font-bold text-2xl">
              EduExtract
            </Link>
      <div className="bg-black p-8 rounded-md w-full max-w-md">
        <h2 className="text-white text-2xl font-semibold text-center mb-2">
          Create an account
        </h2>
        <p className="text-zinc-400 text-center mb-6">
          Let's get you learning journey started.
        </p>

        <GoogleButton>Sign up with Google</GoogleButton>

        <div className="flex items-center my-4">
          <hr className="flex-grow border-zinc-700" />
          <span className="text-zinc-500 mx-2 text-sm">or continue with</span>
          <hr className="flex-grow border-zinc-700" />
        </div>

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
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 cursor-pointer">
            👁️
          </span>
        </div>

        <div className="text-right mt-2 text-sm text-zinc-400 hover:underline cursor-pointer">
          Forgot password?
        </div>

        <AuthButton>Sign Up</AuthButton>

        <p className="text-center text-zinc-400 mt-6 text-sm">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="underline cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
