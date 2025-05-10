// src/pages/SignUp.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import ReCAPTCHA from "react-google-recaptcha";
import "../styles/Signup.css";
import { AUTH_VALIDATION_MESSAGES } from "../constants/validationMessages";

// Sử dụng biến môi trường cho site key hoặc fallback về giá trị cứng
const API_URL = process.env.REACT_APP_API_URL || "https://chess-game-2-2fv5.onrender.com";
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY

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
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error when user starts typing in a field
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
    const emailTrimmed = formData.email.trim();

    // Username: required, alphanumeric/underscore, 3-20 chars
    if (!usernameTrimmed) {
      newErrors.username = AUTH_VALIDATION_MESSAGES.USERNAME.REQUIRED;;
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameTrimmed)) {
      newErrors.username = AUTH_VALIDATION_MESSAGES.USERNAME.FORMAT;
    }

    // Email: required, valid format
     // Using safer regex that prevents catastrophic backtracking
    const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,255}\.[a-zA-Z]{2,}$/;
    if (!emailTrimmed) {
      newErrors.email = AUTH_VALIDATION_MESSAGES.EMAIL.REQUIRED;
    } else if (!emailRegex.test(emailTrimmed)) {
      newErrors.email = AUTH_VALIDATION_MESSAGES.EMAIL.FORMAT;
    }

    // Password: required, min 8 chars
    if (!formData.password) {
      newErrors.password = AUTH_VALIDATION_MESSAGES.PASSWORD.REQUIRED;
    } else if (formData.password.length < 8) {
      newErrors.password = AUTH_VALIDATION_MESSAGES.PASSWORD.MIN_LENGTH;
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = AUTH_VALIDATION_MESSAGES.PASSWORD.MISMATCH;
    }

    // CAPTCHA required for all registrations
    if (!captchaToken) {
      newErrors.captcha = AUTH_VALIDATION_MESSAGES.CAPTCHA.REQUIRED;
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
      const cleanUsername = DOMPurify.sanitize(formData.username.trim());
      const cleanEmail = DOMPurify.sanitize(formData.email.trim());

      // Always include captchaToken for registration
      const payload = {
        username: cleanUsername,
        email: cleanEmail,
        password: formData.password,
        captchaToken: captchaToken
      };

      const response = await axios.post(`${API_URL}/auth/register`, payload);

      if (response.data) {
        setServerMessage({
          type: "success",
          text: "Account created successfully! Redirecting to login..."
        });

        setTimeout(() => {
          navigate("/signin");
        }, 1500);
      }
    } catch (error) {
      console.error("Register error:", error);

      // Reset captcha if server rejects it
      if (error.response?.data?.error?.includes("CAPTCHA")) {
        window.grecaptcha?.reset();
        setCaptchaToken(null);
      }

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
            className={`auth-error ${serverMessage.type === "success" ? "auth-success" : ""}`}
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
              className={`form-control ${errors.username ? "input-error" : ""}`}
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
              className={`form-control ${errors.email ? "input-error" : ""}`}
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
              className={`form-control ${errors.password ? "input-error" : ""}`}
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
              className={`form-control ${errors.confirmPassword ? "input-error" : ""}`}
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

          <div className="form-group captcha-container">
            <ReCAPTCHA
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={handleCaptchaChange}
            />
            {errors.captcha && (
              <span className="form-error" id="captcha-error">
                {errors.captcha}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="signup-button"
            disabled={isLoading || !captchaToken}
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