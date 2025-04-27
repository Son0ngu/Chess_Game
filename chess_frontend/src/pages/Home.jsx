import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Home.css";
// Có thể import thêm các biểu tượng nếu cần
// import { FaChessKnight, FaTrophy, FaUsers, FaChartLine } from "react-icons/fa";

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
        {/* Hero Section - Improved */}
        <section className="intro-section hero-section">
          <div className="hero-content">
            <h2 className="hero-title">Welcome to Chess Master</h2>
            <p className="hero-subtitle">
              Improve your chess skills by playing online against players around the world.
              Master strategies, compete in tournaments, and climb the global rankings.
            </p>
            <div className="hero-buttons">
              <button
                onClick={() => navigate("/play")}
                className="primary-button"
              >
                Play Now
              </button>
              <Link to="/signup" className="secondary-button">
                Create Account
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="chess-piece-knight"></div>
          </div>
        </section>

        {/* Features Section */}
        <h2 className="section-title">Why Choose Chess Master?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">♞</div>
            <h3>Play Anytime</h3>
            <p>Challenge players from around the world 24/7 on any device.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">♖</div>
            <h3>Improve Skills</h3>
            <p>Learn strategies and analyze your games with powerful tools.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">♛</div>
            <h3>Global Rankings</h3>
            <p>Compete against the best and rise through our leaderboards.</p>
          </div>
        </div>

        {/* CTA Section */}
        <section className="cta-section">
          <h2>Ready to Test Your Skills?</h2>
          <p>Join thousands of players already enjoying Chess Master. Sign up now and start playing instantly!</p>
          <div className="cta-buttons">
            <Link to="/signup" className="cta-button signup">Sign Up Free</Link>
            <Link to="/signin" className="cta-button signin">Sign In</Link>
          </div>
        </section>

        {/* How to Play Section */}
        <h2 className="section-title">How to Get Started</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create Account</h3>
            <p>Sign up for free in seconds with email or social media.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Find Opponents</h3>
            <p>Match with players of similar skill level automatically.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Play & Improve</h3>
            <p>Enjoy games and watch your rating improve over time.</p>
          </div>
        </div>

        {/* Sign-in Callout */}
        <div className="signin-callout">
          <p>Already have an account? <strong><Link to="/signin">Sign in</Link></strong> to continue where you left off.</p>
        </div>
      </main>

      <footer className="home-footer">
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/contact">Contact Us</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Chess Master. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
