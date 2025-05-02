import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Home.css";
import heroImage from "../components/son.jpg";

const Home = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    document.title = "Chess Master";
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="home-container">
      {/* Header with logo and buttons */}
      <header className="site-header">
        <div className="logo">Chess Master</div>
        <div className="nav-buttons">
          {isAuthenticated ? (
            <>
              <span className="welcome-user">Welcome, {user?.username}</span>
              <button onClick={handleLogout} className="sign-in">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/pwrecovery" className="recover-password-link">Recover Password</Link>
              <Link to="/signin" className="sign-in">Sign In</Link>
              <Link to="/signup" className="sign-up">Sign Up</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero section with welcome text and image */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to Chess Master</h1>
          <p className="hero-subtitle">
            Improve your chess skills by playing online against players around the world. 
            Master strategies, compete in tournaments, and climb the global rankings.
          </p>
          <div className="hero-buttons">
            <Link to={isAuthenticated ? "/lobby" : "/play"} className="primary-btn hero-btn">
              Play Now
            </Link>
            <Link to="/getting-started" className="secondary-btn hero-btn">
              Getting Started
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <img src={heroImage} alt="Chess visualization" />
        </div>
      </section>

      {/* Features section */}
      <section className="features-section">
        <h2 className="section-title">Why Choose Chess Master?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">♟️</div>
            <h3 className="feature-title">Play Anytime</h3>
            <p className="feature-description">Challenge players from around the world 24/7 on any device.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">♖</div>
            <h3 className="feature-title">Improve Skills</h3>
            <p className="feature-description">Learn strategies and improve your game with provided tools.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">♛</div>
            <h3 className="feature-title">Global Rankings</h3>
            <p className="feature-description">Compete against the best and rise through our leaderboards.</p>
          </div>
        </div>
      </section>

      {/* Call to action section */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to Test Your Skills?</h2>
        <p className="cta-description">Join thousands of players already enjoying Chess Master. Sign up now and start playing instantly!</p>
        <div className="cta-buttons">
          <Link to="/signup" className="cta-btn">Sign Up Free</Link>
          <Link to="/signin" className="cta-btn secondary">Sign In</Link>
        </div>
      </section>

      {/* Getting started steps */}
      <section className="steps-section">
        <h2 className="section-title">How to Get Started</h2>
        <div className="steps-container features-grid">
          <div className="feature-card step-card">
            <div className="step-number">1</div>
            <h3 className="feature-title">Create Account</h3>
            <p className="feature-description">Sign up for free in seconds with email or social.</p>
          </div>
          <div className="feature-card step-card">
            <div className="step-number">2</div>
            <h3 className="feature-title">Find Opponents</h3>
            <p className="feature-description">Match with players of similar skill level.</p>
          </div>
          <div className="feature-card step-card">
            <div className="step-number">3</div>
            <h3 className="feature-title">Play & Improve</h3>
            <p className="feature-description">Enjoy games and track your rating over time.</p>
          </div>
        </div>
      </section>

      {/* Account call to action */}
      <div className="signin-callout">
        <p>Already have an account? <Link to="/signin">To continue where you left off.</Link></p>
      </div>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/contact">Contact Us</Link>
        </div>
        <p className="copyright">&copy; {new Date().getFullYear()} Chess Master. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
