// src/pages/SignIn.jsx
import React, { useState } from "react"; // Remove useContext from import
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext"; // Make sure to import your auth context
import "../styles/Signin.css";

const API_URL = "https://localhost:5000";

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Get the login function from your auth context
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
    
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    
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
      console.log("Sending login request with:", formData);
      const response = await axios.post(`${API_URL}/auth/login`, formData);
      console.log("Login response received:", response.data); // Add this to debug
      
      // Handle successful login
      if (response.data && response.data.token) {
        // Create user object
        const userData = {
          id: response.data.user.id || response.data.user._id, // Handle both id formats
          username: response.data.user.username,
          email: response.data.user.email,
          elo: response.data.user.elo
        };
        
        console.log("User data for context:", userData);
        
        // Update auth context - directly pass the response data
        login(response.data);
        
        setServerMessage({ 
          type: "success", 
          text: "Login successful! Redirecting to lobby..." 
        });
        
        // Navigate to lobby
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
        
        <form className="signin-form" onSubmit={handleSubmit}>
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
            />
            {errors.username && <div className="form-error">{errors.username}</div>}
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
            />
            {errors.password && <div className="form-error">{errors.password}</div>}
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