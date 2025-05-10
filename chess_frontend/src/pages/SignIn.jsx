// src/pages/SignIn.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import ReCAPTCHA from "react-google-recaptcha";
import { useAuth } from "../context/AuthContext";
import "../styles/Signin.css";
import { AUTH_VALIDATION_MESSAGES } from "../constants/validationMessages";

const API_URL = process.env.REACT_APP_API_URL || "https://chess-game-2-2fv5.onrender.com";
// Use environment variable or fallback to test key
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test key

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
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    // Clear captcha error if it exists
    if (errors.captcha) {
      setErrors({ ...errors, captcha: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const usernameTrimmed = formData.username.trim();

    // Username validation
    if (!usernameTrimmed) {
      newErrors.username = AUTH_VALIDATION_MESSAGES.USERNAME.REQUIRED;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = AUTH_VALIDATION_MESSAGES.PASSWORD.REQUIRED;
    }

    // CAPTCHA validation
    if (requireCaptcha && !captchaToken) {
      newErrors.captcha = AUTH_VALIDATION_MESSAGES.CAPTCHA.REQUIRED;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanUsername = DOMPurify.sanitize(formData.username.trim());

    if (!validateForm()) return;

    setIsLoading(true);
    setServerMessage({ type: "", text: "" });

    try {
      const payload = {
        username: cleanUsername,
        password: formData.password
      };

      // Add captcha token if required
      if (requireCaptcha) {
        payload.captchaToken = captchaToken;
      }

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

      // If server requires CAPTCHA after failed attempts
      if (error.response?.data?.requireCaptcha) {
        setRequireCaptcha(true);

        // Reset captcha if it was already displayed
        if (captchaToken) {
          window.grecaptcha?.reset();
          setCaptchaToken(null);
        }
      }

      // Reset captcha if the error is related to captcha validation
      if (requireCaptcha && error.response?.data?.error?.includes("CAPTCHA")) {
        window.grecaptcha?.reset();
        setCaptchaToken(null);
      }

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
          <div
            className={`auth-error ${serverMessage.type === "success" ? "auth-success" : ""}`}
            role="alert"
            aria-live="assertive"
          >
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
              className={`form-control ${errors.username ? "input-error" : ""}`}
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
              className={`form-control ${errors.password ? "input-error" : ""}`}
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

          {requireCaptcha && (
            <div className="form-group captcha-container">
              <ReCAPTCHA
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
              />
              {errors.captcha && (
                <div className="form-error" id="captcha-error">
                  {errors.captcha}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="signin-button"
            disabled={isLoading || (requireCaptcha && !captchaToken)}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="signin-options">
          <Link to="/forgot-password">Forgot Password?</Link>
          <span className="divider">•</span>
          <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;