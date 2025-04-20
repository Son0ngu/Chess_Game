import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Home.css";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Chess Master";
  }, []);

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Chess Master</h1>
        <nav className="home-navbar">
          <div className="nav-logo">Chess Master</div>
          <div className="nav-links">
            <Link to="/signin" className="nav-link">Sign In</Link>
            <Link to="/signup" className="nav-link nav-button">Sign Up</Link>
          </div>
        </nav>
      </header>

      <main className="home-main">
        <section className="intro-section hero-section">
          <div className="hero-content">
            <h2 className="hero-title">Welcome to Chess Master</h2>
            <p className="hero-subtitle">
              Improve your chess skills by playing online against players around the world.
            </p>
            <div className="hero-buttons">
              <button
                onClick={() => navigate("/signin")}
                className="primary-button"
              >
                Get Started
              </button>
              <Link to="/signup" className="secondary-button">
                Create Account
              </Link>
            </div>
          </div>
          <div className="hero-image">
            {/* You can add an image here if you want */}
            {/* <div className="chess-piece-knight"></div> */}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>&copy; {new Date().getFullYear()} Chess Master. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
