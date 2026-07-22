import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./GM.css";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const GroupMode = () => {
  const [stage, setStage] = useState("setup");
  const [participantCount, setParticipantCount] = useState(3);
  const [topic, setTopic] = useState("");
  const [participantInputs, setParticipantInputs] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeIndex, setActiveIndex] = useState(null);

  const recognitionRef = useRef(null);
  const indexRef = useRef(null);
  const transcriptRef = useRef([]);
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => {
      setError("Microphone permission denied");
    });
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const index = indexRef.current;
      if (index === null) return;

      const latestFinalText = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript?.trim())
        .filter(Boolean)
        .slice(-1)[0];

      if (!latestFinalText) {
        return;
      }

      transcriptRef.current[index] = transcriptRef.current[index]
        ? `${transcriptRef.current[index]} ${latestFinalText}`.trim()
        : latestFinalText;

      setParticipantInputs([...transcriptRef.current]);
    };

    recognition.onend = () => {
      stopRequestedRef.current = false;
      setActiveIndex(null);
      indexRef.current = null;
    };

    recognition.onerror = (e) => {
      console.error(e);
      setError(`Voice recognition error: ${e.error || "unknown"}`);
      stopRequestedRef.current = false;
      setActiveIndex(null);
      indexRef.current = null;
    };

    recognitionRef.current = recognition;
  }, []);

  const initialize = () => {
    if (!topic.trim()) {
      setError("Enter topic first");
      return;
    }

    const arr = Array.from({ length: participantCount }, () => "");
    transcriptRef.current = arr;

    setParticipantInputs(arr);
    setResults([]);
    setError("");
    setStage("discussion");
  };

  const startRecording = (i) => {
    if (!recognitionRef.current) return;
    if (activeIndex !== null) return;

    setActiveIndex(i);
    indexRef.current = i;
    stopRequestedRef.current = false;
    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (!recognitionRef.current || activeIndex === null) return;

    stopRequestedRef.current = true;
    recognitionRef.current.stop();
  };

  const evaluate = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        `${BACKEND_URL}/api/attempts/group`,
        {
          topic,
          participants: participantInputs,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const output = response.data?.aiResponse || response.data?.attempt?.feedback || "";
      const normalized = output.replace(/\r/g, "");
      const split = normalized
        .split(/\n(?=Person\s+\d+)/i)
        .map((part) => part.trim())
        .filter(Boolean);

      setResults(split.length > 1 ? split : [normalized]);
      setStage("results");
    } catch (err) {
      console.error(err);
      setError("Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-mode-page">
      <div className="group-mode-panel">
        <div className="group-header">
          <p className="eyebrow">GROUP MODE</p>
          <h1>Group Discussion AI Evaluator</h1>
          <p className="group-subtitle">
            Record each participant separately and get AI feedback.
          </p>
        </div>

        {stage === "setup" && (
          <div className="setup-card">
            <div className="setup-field">
              <label>Number of participants</label>
              <input
                type="number"
                min="2"
                max="6"
                value={participantCount}
                onChange={(e) =>
                  setParticipantCount(Number(e.target.value))
                }
              />
            </div>

            <div className="setup-field">
              <label>Topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="setup-actions">
              <button className="group-btn primary" onClick={initialize}>
                Start
              </button>
            </div>

            {error && <p className="form-error">{error}</p>}
          </div>
        )}

        {stage === "discussion" && (
          <>
            <div className="topic-banner">
              <p>TOPIC</p>
              <h2>{topic}</h2>
            </div>

            <div className="participants-grid">
              {participantInputs.map((t, i) => (
                <div key={i} className="participant-card">
                  <h3>Person {i + 1}</h3>

                  <div className="participant-top">
                    <button
                      className={`record-btn ${
                        activeIndex === i ? "recording" : ""
                      }`}
                      onClick={() =>
                        activeIndex === i ? stopRecording() : startRecording(i)
                      }
                    >
                      {activeIndex === i ? "Stop" : "Record"}
                    </button>

                    <span>{activeIndex === i ? "Listening..." : "Tap to speak"}</span>
                  </div>

                  <textarea value={t} readOnly />
                </div>
              ))}
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="setup-actions bottom-actions">
              <button className="group-btn secondary" onClick={() => setStage("setup")}>
                Back
              </button>

              <button
                className="group-btn primary"
                onClick={evaluate}
                disabled={loading}
              >
                {loading ? "Evaluating..." : "Evaluate"}
              </button>
            </div>
          </>
        )}

        {stage === "results" && (
          <>
            <div className="results-grid">
              {results.map((r, i) => (
                <div key={i} className="result-card">
                  <pre>{r}</pre>
                </div>
              ))}
            </div>

            <div className="setup-actions">
              <button className="group-btn primary" onClick={() => setStage("setup")}>
                New Session
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupMode;