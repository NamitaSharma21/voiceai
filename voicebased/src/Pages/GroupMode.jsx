import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./GroupMode.css";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const GroupMode = () => {
  const [stage, setStage] = useState("setup");
  const [participantCount, setParticipantCount] = useState(3);
  const [topic, setTopic] = useState("");
  const [participantInputs, setParticipantInputs] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [activeRecording, setActiveRecording] = useState(null);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const recognitionRef = useRef(null);
  const recordingIndexRef = useRef(null);
  const isGroupRecordingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const participantTranscriptsRef = useRef([]);

  useEffect(() => {
    // Request microphone permissions upfront
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        // Stop the stream after getting permission
        stream.getTracks().forEach((track) => track.stop());
        setMicPermissionDenied(false);
      }).catch((err) => {
        console.warn("Microphone permission denied:", err);
        setMicPermissionDenied(true);
      });
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      return;
    }

    setRecognitionSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const index = recordingIndexRef.current;
      if (index === null || index === undefined) {
        return;
      }

      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          // Only add FINAL results
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }

      // Only append final results to prevent duplication
      if (finalTranscript.trim()) {
        participantTranscriptsRef.current[index] = (
          participantTranscriptsRef.current[index] || ""
        ).concat(finalTranscript);

        setParticipantInputs([...participantTranscriptsRef.current]);
      }
    };

    recognition.onend = () => {
      if (stopRequestedRef.current) {
        stopRequestedRef.current = false;
        const index = recordingIndexRef.current;
        const finalTranscript = (participantTranscriptsRef.current[index] || "").trim();

        if (!finalTranscript) {
          setError("No speech detected. Please try again.");
        }

        setActiveRecording(null);
        recordingIndexRef.current = null;
        return;
      }

      // Don't auto-restart, just stop recording
      setActiveRecording(null);
      recordingIndexRef.current = null;
      isGroupRecordingRef.current = false;
    };

    recognition.onstart = () => {
      setError("");
    };

    recognition.onerror = (event) => {
      console.error("SpeechRecognition error:", event.error);
      
      // Don't auto-restart on no-speech, let the user try again
      if (event.error === "aborted") {
        if (isGroupRecordingRef.current) {
          setTimeout(() => recognitionRef.current?.start(), 250);
        }
        return;
      }

      if (event.error === "audio-capture") {
        setError("Microphone not detected. Check your microphone settings.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access blocked. Allow microphone permissions.");
      } else if (event.error === "no-speech") {
        setError("No speech detected. Please try again.");
      } else {
        setError("Voice recognition failed. Please try again.");
      }

      setActiveRecording(null);
      recordingIndexRef.current = null;
      isGroupRecordingRef.current = false;
    };

    recognitionRef.current = recognition;
  }, []);

  const initializeDiscussion = () => {
    const emptyResponses = Array.from({ length: participantCount }, () => "");
    participantTranscriptsRef.current = [...emptyResponses];
    setParticipantInputs(emptyResponses);
    setResults([]);
    setError("");
    setStage("input");
  };

  const handleCountChange = (value) => {
    const count = Number(value);
    if (count >= 2 && count <= 6) {
      setParticipantCount(count);
    }
  };

  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support microphone access.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionDenied(false);
      setError("Microphone permission granted! You can now record.");
      setTimeout(() => setError(""), 3000);
    } catch (err) {
      console.error("Microphone permission error:", err);
      setError("Microphone permission denied. Please allow microphone access in your browser settings.");
      setMicPermissionDenied(true);
    }
  };

  const startRecording = (index) => {
    if (micPermissionDenied) {
      setError("Please grant microphone permission first.");
      return;
    }

    if (!recognitionSupported) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    if (activeRecording !== null) {
      setError("Stop the active recording before starting the next one.");
      return;
    }

    setError("");
    setActiveRecording(index);
    recordingIndexRef.current = index;
    isGroupRecordingRef.current = true;

    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.warn(err);
      setError("Unable to start recording. Please allow microphone access.");
      setActiveRecording(null);
      recordingIndexRef.current = null;
      isGroupRecordingRef.current = false;
    }
  };

  const stopRecording = () => {
    isGroupRecordingRef.current = false;
    stopRequestedRef.current = true;
    recognitionRef.current?.stop();
  };

  const evaluateDiscussion = async () => {
    if (!topic.trim()) {
      setError("Please enter the discussion topic.");
      return;
    }

    if (participantInputs.every((answer) => !answer.trim())) {
      setError("Please add at least one participant response before evaluating.");
      return;
    }

    if (!GROQ_API_KEY) {
      setError("Groq API key is missing. Add VITE_GROQ_API_KEY to .env.local.");
      return;
    }

    setError("");
    setLoading(true);
    setResults([]);

    try {
      const discussionLines = participantInputs
        .map((answer, index) =>
          `Person ${index + 1}: ${answer.trim() || "(no response provided)"}`
        )
        .join("\n\n");

      const systemMessage =
        "You are an AI discussion evaluator. Evaluate each participant's answer separately with strengths, clarity, and a score out of 10.";
      const userMessage = `Topic: ${topic.trim()}\n\n${discussionLines}\n\nPlease provide a short evaluation for each person in the following format:\nPerson 1: ...\nPerson 2: ...`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data?.error?.message || "Failed to evaluate the group.";
        setError(message);
        return;
      }

      const content = data?.choices?.[0]?.message?.content || "";
      const parts = content
        .split(/(?=Person \d+:)/g)
        .map((part) => part.trim())
        .filter(Boolean);

      setResults(parts.length ? parts : [content.trim()]);
      setStage("results");

      await axios.post(
        "http://localhost:5000/api/attempt/group",
        {
          topic,
          participants: participantInputs,
          evaluation: parts.length ? parts : [content.trim()],
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (err) {
      console.error(err);
      setError("Unable to evaluate discussion. Check your network and API key.");
    } finally {
      setLoading(false);
    }
  };

  const resetDiscussion = () => {
    setStage("setup");
    setParticipantInputs([]);
    setResults([]);
    setError("");
    setActiveRecording(null);
    recordingIndexRef.current = null;
  };

  return (
    <div className="group-mode-page">
      <div className="group-mode-panel">
        <div className="group-header">
          <div>
            <p className="eyebrow">Group Discussion Mode</p>
            <h2>Gather ideas from every participant</h2>
          </div>
          <p className="group-subtitle">
            Choose how many people are in the discussion and enter the topic. Then capture each response separately and get AI feedback for every person.
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
                onChange={(e) => handleCountChange(e.target.value)}
              />
            </div>

            <div className="setup-field">
              <label>Discussion topic</label>
              <input
                type="text"
                placeholder="Enter the group discussion topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="setup-actions">
              <button className="group-btn primary" onClick={initializeDiscussion}>
                Start discussion setup
              </button>
            </div>
          </div>
        )}

        {stage === "input" && (
          <>
            <div className="summary-card">
              <p className="summary-label">Topic</p>
              <h3>{topic || "No topic entered yet"}</h3>
              <p className="summary-copy">
                Speak each participant's response one at a time. The number of cards matches the selected group size.
              </p>
            </div>

            {!recognitionSupported && (
              <div className="voice-warning-card">
                <p className="summary-label">Voice input unavailable</p>
                <p className="summary-copy">
                  Your browser does not support speech recognition. Use Chrome or Edge for the best voice input experience.
                </p>
              </div>
            )}

            <div className="participants-grid">
              {participantInputs.map((answer, index) => (
                <div key={index} className="participant-card">
                  <div className="participant-title">Person {index + 1}</div>
                  <div className="participant-actions">
                    <button
                      className={`record-btn ${activeRecording === index ? "recording" : ""}`}
                      onClick={() =>
                        activeRecording === index ? stopRecording() : startRecording(index)
                      }
                    >
                      {activeRecording === index ? "Stop recording" : "Record voice"}
                    </button>
                    <span className="record-status">
                      {activeRecording === index
                        ? "Listening..."
                        : answer
                        ? "Ready to evaluate"
                        : "Tap record to speak"}
                    </span>
                  </div>
                  <textarea
                    value={answer}
                    readOnly
                    placeholder={`Voice transcript for Person ${index + 1} will appear here.`}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="error-container">
                <p className="form-error">{error}</p>
                {micPermissionDenied && (
                  <button 
                    className="permission-btn" 
                    onClick={requestMicrophonePermission}
                  >
                    Grant Microphone Permission
                  </button>
                )}
              </div>
            )}

            <div className="setup-actions two-buttons">
              <button className="group-btn secondary" onClick={resetDiscussion}>
                Change topic or participants
              </button>
              <button className="group-btn primary" onClick={evaluateDiscussion} disabled={loading || activeRecording !== null}>
                {loading ? "Evaluating..." : "Evaluate discussion"}
              </button>
            </div>
          </>
        )}

        {stage === "results" && (
          <>
            <div className="summary-card results-card">
              <p className="summary-label">Discussion results</p>
              <h3>AI evaluation completed</h3>
              <p className="summary-copy">
                Review each participant's feedback, insight summary, and voice/clarity evaluation.
              </p>
            </div>

            <div className="results-grid">
              {results.map((item, index) => (
                <div key={index} className="result-card">
                  <pre>{item}</pre>
                </div>
              ))}
            </div>

            <div className="setup-actions two-buttons">
              <button className="group-btn secondary" onClick={() => setStage("input")}>
                Edit responses
              </button>
              <button className="group-btn primary" onClick={resetDiscussion}>
                New group discussion
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupMode;
