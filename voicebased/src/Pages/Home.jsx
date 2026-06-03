import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";
import aiImage from "../assets/voice.png"; 

const Home = () => {
  return (
    <div className="page">

      {/* NAVBAR */}
      <nav className="nav">
        <h1>Voice Based AI Learning Assessment Tool</h1>
      </nav>

      {/* MAIN */}
      <main className="content">

        {/* HERO */}
        <section className="hero">
          <div className="hero-content">

            <div className="hero-text">
              <h2>Practice. Speak. Improve.</h2>
              <p>
                An AI-powered platform to test your knowledge by speaking and
                get instant feedback with score.
              </p>
            </div>

            <div className="hero-image">
              <img src={aiImage} alt="AI Learning" />
            </div>

          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how-it-works">
          <h3>How it works</h3>

          <div className="steps">
            <div className="step">
              <span>1</span>
              <p>Enter Topic</p>
            </div>

            <div className="step">
              <span>2</span>
              <p>Start Speaking</p>
            </div>

            <div className="step">
              <span>3</span>
              <p>AI Evaluates</p>
            </div>

            <div className="step">
              <span>4</span>
              <p>Get Feedback</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta">
          <h3>Start Practicing Now</h3>

          <div className="buttons">
            <Link className="btn primary" to="/single">
              🎤 Practice Solo
            </Link>

            <Link className="btn secondary" to="/group">
              👥 Group Mode
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;