import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../styles/Signin.css"; // reuse luôn Signin.css

const API_URL = "http://localhost:5000"; // Backend URL

const ResetPassword = () => {
  const { token } = useParams(); // lấy token từ URL
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
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
      const response = await axios.post(`${API_URL}/auth/reset-password/${token}`, { password });

      if (response.data && response.data.message) {
        setServerMessage({ type: "success", text: response.data.message });
        setTimeout(() => navigate("/signin"), 2000); // về trang đăng nhập sau 2s
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      const errorMessage = error.response?.data?.error || "Reset failed. Try again.";
      setServerMessage({ type: "error", text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <h2>Reset Your Password</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>New Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {errors.password && <span className="error">{errors.password}</span>}
        </div>
        <div className="form-group">
          <label>Confirm New Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
        </div>
        {serverMessage.text && (
          <div className={`message ${serverMessage.type}`}>
            {serverMessage.text}
          </div>
        )}
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
