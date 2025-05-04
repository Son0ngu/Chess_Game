// src/pages/SignUp.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../styles/Signup.css";

const API_URL = "https://localhost:5000";

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
    const usernameTrimmed = formData.username.trim();
    const emailTrimmed = formData.email.trim();

    // Username: required, alphanumeric/underscore, 3-20 chars
    if (!usernameTrimmed) {
      newErrors.username = "Username is required";
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameTrimmed)) {
      newErrors.username = "Username must be 3-20 alphanumeric characters";
    }

    // Email: required, valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(emailTrimmed)) {
      newErrors.email = "Please enter a valid email";
    }

    // Password: required, min 6 chars
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Always trim username and email before sending
    const payload = {
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword
    };

    if (!validateForm()) return;

    setIsLoading(true);
    setServerMessage({ type: "", text: "" });

    try {
      const response = await axios.post(`${API_URL}/auth/register`, payload);

      if (response.data) {
        setServerMessage({
          type: "success",
          text: "Account created successfully! Redirecting to login..."
        });

        setTimeout(() => {
          navigate("/signin");
        }, 2000);
      }
    } catch (error) {
      console.error("Register error:", error);
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
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <h2 className="signup-title">Create an Account</h2>
          <p className="signup-subtitle">Join us to play chess online</p>
        </div>

        {serverMessage.text && (
          <div
            className={`auth-error`}
            role="alert"
            aria-live="assertive"
          >
            {serverMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="signup-form" noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
              autoComplete="username"
            />
            {errors.username && (
              <span className="form-error" id="username-error">
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
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              autoComplete="email"
            />
            {errors.email && (
              <span className="form-error" id="email-error">
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
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              autoComplete="new-password"
            />
            {errors.password && (
              <span className="form-error" id="password-error">
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
              className="form-control"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span className="form-error" id="confirm-password-error">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="signup-button"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="signup-options">
          Already have an account?{" "}
          <Link to="/signin">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;