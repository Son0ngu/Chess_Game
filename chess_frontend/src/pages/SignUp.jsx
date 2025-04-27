// src/pages/SignUp.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios"; // Use axios instead of socket
import "../styles/Signup.css"; 

// API base URL - match your backend port
const API_URL = "http://localhost:5000";

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
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
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      // Call the register API endpoint
      const response = await axios.post(`${API_URL}/auth/register`, formData);
      
      // Handle successful registration
      if (response.data) {
        setServerMessage({ 
          type: "success", 
          text: "Account created successfully! Redirecting to login..." 
        });
        
        // Redirect to sign in page after short delay
        setTimeout(() => {
          navigate("/signin");
        }, 2000);
      }
    } catch (error) {
      console.error("Register error:", error);
      console.error("Response data:", error.response?.data);
      const errorMessage = error.response?.data?.error || "Error creating account. Please try again.";
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
        <h2>Create an Account</h2>
        
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
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              autoComplete="email"
            />
            {errors.email && (
              <span className="error" id="email-error">
                {errors.email}
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
              autoComplete="new-password"
            />
            {errors.password && (
              <span className="error" id="password-error">
                {errors.password}
              </span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span className="error" id="confirm-password-error">
                {errors.confirmPassword}
              </span>
            )}
          </div>
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>
        
        <p className="auth-redirect">
          Already have an account?{" "}
          <Link 
            to="/signin" 
            className="auth-link"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;