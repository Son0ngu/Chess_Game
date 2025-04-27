// src/pages/SignIn.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios"; // Add axios for API calls
import "../styles/Signin.css";

// API base URL - match your backend port
const API_URL = "http://localhost:5000/api";

const SignIn = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing in a field
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setServerMessage({ type: "", text: "" });
    
    try {
      // Call the login API endpoint - use the correct endpoint (/api/users/login)
      const response = await axios.post(`${API_URL}/users/login`, formData);
      
      // Handle successful login
      if (response.data && response.data.token) {
        // Store user data in localStorage
        localStorage.setItem("chessUser", JSON.stringify({
          username: formData.username,
          token: response.data.token,
          id: response.data.user.id,
          elo: response.data.user.elo
        }));
        
        setServerMessage({ 
          type: "success", 
          text: "Login successful! Redirecting..." 
        });
        
        // Redirect to game page after short delay
        setTimeout(() => {
          navigate("/play");
        }, 1500);
      }
    } catch (error) {
      // Handle error
      const errorMessage = error.response?.data?.error || "Login failed. Please try again.";
      setServerMessage({ 
        type: "error", 
        text: errorMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Sign In</h2>
        
        {serverMessage.text && (
          <div 
            className={`message ${serverMessage.type}`}
            role="alert"
            aria-live="assertive"
          >
            {serverMessage.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
              autoComplete="username"
            />
            {errors.username && (
              <span className="error" id="username-error">
                {errors.username}
              </span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              autoComplete="current-password"
            />
            {errors.password && (
              <span className="error" id="password-error">
                {errors.password}
              </span>
            )}
          </div>
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        
        <p className="auth-redirect">
          Don't have an account?{" "}
          <Link 
            to="/signup" 
            className="auth-link"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;