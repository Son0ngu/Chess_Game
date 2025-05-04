// src/pages/SignIn.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../styles/Signin.css";

const API_URL = "https://localhost:5000";

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
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

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const usernameTrimmed = formData.username.trim();

    // Username: required, alphanumeric/underscore, 3-20 chars
    if (!usernameTrimmed) {
      newErrors.username = "Username is required";
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameTrimmed)) {
      newErrors.username = "Username must be 3-20 alphanumeric characters";
    }

    // Password: required
    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Always trim username before sending
    const payload = {
      username: formData.username.trim(),
      password: formData.password
    };

    if (!validateForm()) return;

    setIsLoading(true);
    setServerMessage({ type: "", text: "" });

    try {
      const response = await axios.post(`${API_URL}/auth/login`, payload);

      if (response.data && response.data.token) {
        // Update auth context
        login(response.data);

        setServerMessage({
          type: "success",
          text: "Login successful! Redirecting to lobby..."
        });

        navigate("/lobby");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Login error:", error);

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
    <div className="signin-container">
      <div className="signin-card">
        <div className="signin-header">
          <h2 className="signin-title">Sign In</h2>
          <p className="signin-subtitle">Enter your credentials to access your account</p>
        </div>

        {serverMessage.text && (
          <div className={`auth-${serverMessage.type}`}>
            {serverMessage.text}
          </div>
        )}

        <form className="signin-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              disabled={isLoading}
              autoComplete="username"
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
            />
            {errors.username && (
              <div className="form-error" id="username-error">
                {errors.username}
              </div>
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
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && (
              <div className="form-error" id="password-error">
                {errors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="signin-button"
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="signin-options">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;