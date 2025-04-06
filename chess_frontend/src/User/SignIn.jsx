import React, { useState } from "react";
import axios from "axios";
import { updateSocketAuth } from '../socket/socket';

const Signin = ({ onSignin }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Sending login data:", formData);
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post('http://localhost:3000/api/users/login', formData);
      
      if (response.data.success) {
        alert("Đăng nhập thành công!");
        // Store user data in localStorage
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        // Update socket authentication
        updateSocketAuth();
        
        // Call onSignin callback if provided
        if (onSignin) {
          onSignin(response.data.data);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.response?.data?.message || 
        "Login failed. Please check your credentials."
      );
      alert("Đăng nhập thất bại: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Sign In</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default Signin;
