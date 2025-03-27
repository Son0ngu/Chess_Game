import React, { useState } from "react";
import socket from "../socket/socket";

const Signin = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Sending login data:", formData);

    socket.emit("signin", formData, (response) => {
      if (response.status === "ok") {
        alert("Đăng nhập thành công!");
      } else {
        alert("Đăng nhập thất bại: " + response.message);
      }
    });
  };

  return (
    <div>
      <h2>Sign In</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
};

export default Signin;
