import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Home.css"; 

const Home = () => {
  const navigate = useNavigate();

  // Set document title when component mounts
  useEffect(() => {
    document.title = "Chess Master - Play Chess Online";
    return () => {
      document.title = "Chess Master"; // Reset on unmount
    };
  }, []);

  return (
    <div className="home-container">
      <nav className="home-navbar" aria-label="Main navigation">
        <div className="nav-logo">Chess Master</div>
        <div className="nav-links">
          <Link to="/signin" className="nav-link">Sign In</Link>
          <Link to="/signup" className="nav-button">Sign Up</Link>
        </div>
      </nav>
      
      <main>
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Welcome to Chess Master</h1>
            <p className="hero-subtitle">
              Play chess online, improve your skills, and challenge players from around the world
            </p>
            <div className="hero-buttons">
              <button 
                className="primary-button"
                onClick={() => navigate("/signin")}
                aria-label="Sign in to play chess"
              >
                Sign In to Play
              </button>
              
              <button 
                className="secondary-button"
                onClick={() => navigate("/signup")}
                aria-label="Create an account"
              >
                Create Account
              </button>
            </div>
          </div>
          <div className="hero-image" aria-hidden="true">
            <div className="chess-piece-knight"></div>
          </div>
        </section>

        <div className="signin-callout">
          <p>
            <strong>Note:</strong> You must be signed in to play chess. Create a free account or sign in 
            to start playing and save your game progress.
          </p>
        </div>

        <section className="features-section">
          <h2 className="section-title">Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">♟️</div>
              <h3>Play Anytime</h3>
              <p>Play chess on any device with our responsive design</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">🏆</div>
              <h3>Compete Online</h3>
              <p>Challenge friends or random players to exciting matches</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">📊</div>
              <h3>Track Progress</h3>
              <p>View your game history and improve your strategy</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" aria-hidden="true">📱</div>
              <h3>Mobile Friendly</h3>
              <p>Play on the go with our mobile-optimized interface</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <h2>Ready to play?</h2>
          <p>Sign up now to save your games and track your progress</p>
          <div className="cta-buttons">
            <Link to="/signup" className="cta-button signup">Sign Up</Link>
            <Link to="/signin" className="cta-button signin">Sign In</Link>
          </div>
        </section>

        <section className="how-to-play-section">
          <h2 className="section-title">How to Play</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-number" aria-hidden="true">1</div>
              <h3>Create an Account</h3>
              <p>Sign up to save your games and track your progress</p>
            </div>
            <div className="step">
              <div className="step-number" aria-hidden="true">2</div>
              <h3>Start a Game</h3>
              <p>Choose to play against a friend or the computer</p>
            </div>
            <div className="step">
              <div className="step-number" aria-hidden="true">3</div>
              <h3>Make Your Moves</h3>
              <p>Play using drag and drop or click to select and move pieces</p>
            </div>
          </div>
        </section>

        <section className="testimonials-section">
          <h2 className="section-title">What Players Say</h2>
          <div className="testimonials-container">
            <div className="testimonial">
              <p>"The best chess app I've used. Clean interface and smooth gameplay!"</p>
              <div className="testimonial-author">- Alex P.</div>
            </div>
            <div className="testimonial">
              <p>"I love the ability to replay my moves and learn from my mistakes."</p>
              <div className="testimonial-author">- Sarah M.</div>
            </div>
            <div className="testimonial">
              <p>"Great for both beginners and experienced players. Highly recommended!"</p>
              <div className="testimonial-author">- Michael K.</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>&copy; {new Date().getFullYear()} Chess Master. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/contact">Contact Us</Link>
        </div>
      </footer>
    </div>
  );
};

export default Home;