import React, { useState } from "react";
import axios from "axios";

const Signup = ({ onSignup }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    realName: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Sending signup data:", formData);
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post('http://localhost:3000/api/users/register', formData);
      
      if (response.data.success) {
        alert("Đăng ký thành công!");
        // Store user data in localStorage
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        // Call onSignup callback if provided
        if (onSignup) {
          onSignup(response.data.data);
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError(
        error.response?.data?.message || 
        "Registration failed. Please try again."
      );
      alert("Đăng ký thất bại: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <input type="text" name="realName" placeholder="Real Name" onChange={handleChange} required />
        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
};

export default Signup;
