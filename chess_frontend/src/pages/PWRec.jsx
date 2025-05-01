// src/pages/PasswordRecovery.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom"; // Removed 'useNavigate' as it's not being used
import axios from "axios";
import "../styles/Signin.css"; // Tận dụng luôn CSS từ SignIn

const API_URL = "http://localhost:5000"; // Đổi nếu cần

const PWRec = () => {
  // Removed 'navigate' as it's not being used
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: "", text: "" });

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
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
      console.log("Sending password recovery request with:", email);
      const response = await axios.post(`${API_URL}/auth/recover`, { email });
      console.log("Recovery response received:", response.data);

      if (response.data && response.data.message) {
        setServerMessage({ 
          type: "success", 
          text: response.data.message || "Recovery email sent! Check your inbox." 
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Recovery error:", error);
      const errorMessage = error.response?.data?.error || "Recovery failed. Please try again.";
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
      <h2>Password Recovery</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
        {serverMessage.text && (
          <div className={`message ${serverMessage.type}`}>
            {serverMessage.text}
          </div>
        )}
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Recovery Email"}
        </button>
      </form>
      <Link to="/signin" className="back-to-signin">Back to Sign In</Link>
    </div>
  );
};

export default PWRec;
