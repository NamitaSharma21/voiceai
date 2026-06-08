import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./GroupMode.css";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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

  // MICROPHONE CHECK
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => {
      setError("Microphone permission denied");
    });
  }, []);

  // SPEECH RECOGNITION INIT
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

    recognition.onresult = (event) => {
      const index = indexRef.current;
      if (index === null) return;

      let text = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          text += event.results[i][0].transcript + " ";
        }
      }

      if (text.trim()) {
        transcriptRef.current[index] =
          (transcriptRef.current[index] || "") + text;

        setParticipantInputs([...transcriptRef.current]);
      }
    };

    recognition.onend = () => {
      setActiveIndex(null);
      indexRef.current = null;
    };

    recognition.onerror = () => {
      setError("Voice recognition error");
      setActiveIndex(null);
      indexRef.current = null;
    };

    recognitionRef.current = recognition;
  }, []);

  // INIT PARTICIPANTS
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

  // START RECORDING
  const startRecording = (i) => {
    if (!recognitionRef.current) return;

    if (activeIndex !== null) return;

    setActiveIndex(i);
    indexRef.current = i;

    recognitionRef.current.start();
  };

  // STOP RECORDING
  const stopRecording = () => {
    recognitionRef.current?.stop();
    setActiveIndex(null);
    indexRef.current = null;
  };

  // EVALUATE
  const evaluate = async () => {
    try {
      setLoading(true);

      const text = participantInputs
        .map((t, i) => `Person ${i + 1}: ${t || "No response"}`)
        .join("\n");

      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              {
                role: "system",
                content:
                  "Evaluate each participant separately with score and feedback.",
              },
              {
                role: "user",
                content: `Topic: ${topic}\n\n${text}`,
              },
            ],
          }),
        }
      );

      const data = await res.json();
      const output = data?.choices?.[0]?.message?.content || "";

      const split = output.split(/(?=Person \d+)/g);

      setResults(split);
      setStage("results");

      // backend safe call
      if (BACKEND_URL) {
        await axios.post(`${BACKEND_URL}/api/attempt/group`, {
          topic,
          participants: participantInputs,
          evaluation: split,
        });
      }
    } catch (err) {
      setError("Evaluation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-mode-page">
      <div className="group-mode-panel">

        {/* HEADER */}
        <div className="group-header">
          <p className="eyebrow">GROUP MODE</p>
          <h1>Group Discussion AI Evaluator</h1>
          <p className="group-subtitle">
            Record each participant separately and get AI feedback.
          </p>
        </div>

        {/* SETUP */}
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

        {/* DISCUSSION */}
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
                        activeIndex === i
                          ? stopRecording()
                          : startRecording(i)
                      }
                    >
                      {activeIndex === i ? "Stop" : "Record"}
                    </button>

                    <span>
                      {activeIndex === i
                        ? "Listening..."
                        : "Tap to speak"}
                    </span>
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

        {/* RESULTS */}
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