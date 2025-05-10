import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/Signin.css";

const API_URL = process.env.REACT_APP_API_URL || "https://chess-game-2-2fv5.onrender.com";

const PWRec = () => {
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
      const response = await axios.post(`${API_URL}/auth/recover`, { email });

      if (response.data && response.data.message) {
        setServerMessage({ 
          type: "success", 
          text: response.data.message || "Recovery email sent! Check your inbox." 
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
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
    <div className="pwrec-container">
      <h2>Password Recovery</h2>
      <form className="pwrec-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
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