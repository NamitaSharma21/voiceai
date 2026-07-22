import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import "./SingleMode.css";

const API_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const SingleMode = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [focusStatus, setFocusStatus] = useState("Focused");

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const stopRequestedRef = useRef(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const getAIResponse = useCallback(async (finalText) => {
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/attempts/single`,
        {
          topic,
          answer: finalText,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = (response.data?.aiResponse || response.data?.attempt?.feedback || "No response").trim();
      setAiResponse(result);
    } catch (error) {
      console.error(error);
      setAiResponse("AI/Server error");
    }

    setLoading(false);
  }, [topic]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const latestFinalText = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript?.trim())
        .filter(Boolean)
        .slice(-1)[0];

      if (!latestFinalText) {
        return;
      }

      finalTranscriptRef.current = finalTranscriptRef.current
        ? `${finalTranscriptRef.current} ${latestFinalText}`.trim()
        : latestFinalText;

      setText(finalTranscriptRef.current);
    };

    recognition.onerror = (e) => {
      console.error(e);
      setErrorMessage(`Mic error: ${e.error}`);
      setIsRecording(false);
      stopRequestedRef.current = false;
    };

    recognition.onend = () => {
      if (stopRequestedRef.current) {
        const finalText = finalTranscriptRef.current.trim();
        stopRequestedRef.current = false;
        setIsRecording(false);

        if (!finalText) {
          setErrorMessage("No speech detected. Please speak a little louder and try again.");
          setText("Speak something...");
          return;
        }

        setErrorMessage("");
        void getAIResponse(finalText);
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
  }, [getAIResponse]);

  useEffect(() => {
    const handleFocus = () => {
      const isFocused = document.visibilityState === "visible" && document.hasFocus();
      setFocusStatus(isFocused ? "Focused" : "Attention needed");
    };

    handleFocus();
    document.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleFocus);
    };
  }, []);

  const attachCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = null;
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("autoplay", "");
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        await video.play().catch(() => {});
      }

      setCameraReady(true);
      setCameraError("");
    } catch (err) {
      console.error(err);
      setCameraError("Camera access denied. Please allow camera and microphone.");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        await attachCamera();
      } catch {
        if (isMounted) {
          setCameraError("Camera access failed.");
        }
      }
    };

    void startCamera();

    return () => {
      isMounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [attachCamera]);

  const startRecording = async () => {
    setErrorMessage("");
    setAiResponse("");
    finalTranscriptRef.current = "";
    setText("");
    stopRequestedRef.current = false;

    if (!streamRef.current && navigator.mediaDevices?.getUserMedia) {
      await attachCamera();
    }

    try {
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch {
      setErrorMessage("Start failed. Try again.");
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current || !isRecording) return;

    stopRequestedRef.current = true;
    recognitionRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div className="single-mode-page">
      <div className="single-mode-container">
        <h2 className="title">🎤 AI Voice Evaluation</h2>

        <input
          className="topic-input"
          value={topic}
          placeholder="Enter topic"
          onChange={(e) => setTopic(e.target.value)}
        />

        <div className="buttons">
          <button className="start-btn" onClick={startRecording} disabled={isRecording}>
            Start
          </button>

          <button className="stop-btn" onClick={stopRecording} disabled={!isRecording}>
            Stop
          </button>
        </div>

        <p className="status">{isRecording ? "Listening..." : "Idle"}</p>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="monitor-grid">
          <div className="camera-panel">
            <div className={`status-badge ${focusStatus === "Focused" ? "safe" : "warning"}`}>
              {focusStatus}
            </div>

            <div className="video-card">
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                muted
                playsInline
                style={{ display: cameraReady ? "block" : "none" }}
              />

              {!cameraReady && (
                <div className="video-fallback">
                  {cameraError || "Connecting to camera..."}
                </div>
              )}
            </div>

            <div className="expression-list">
              <div className="expression-item">
                <span>Camera</span>
                <strong>{cameraReady ? "Live" : "Pending"}</strong>
              </div>
              <div className="expression-item">
                <span>Window focus</span>
                <strong>{focusStatus}</strong>
              </div>
              <div className="expression-item">
                <span>Speech</span>
                <strong>{isRecording ? "Listening" : "Ready"}</strong>
              </div>
            </div>
          </div>

          <div className="cheat-panel">
            <h3 className="panel-title">Anti-cheating monitor</h3>
            <p className="cheat-message">
              Keep your face visible and stay on the page while answering. The camera remains live so the session can detect tab switching or a diverted focus.
            </p>
            <div className={`ai-cheat-indicator ${focusStatus === "Focused" ? "" : "danger"}`}>
              {focusStatus === "Focused"
                ? "No tab-switch warning detected."
                : "Tab switch or window blur detected. Please return to the test."}
            </div>
            <p className="small-note">
              Your speech is captured continuously and evaluated once you stop speaking.
            </p>
          </div>
        </div>

        <div className="voice-text">{text || "Speak something..."}</div>

        <div className="ai-response">
          {loading ? "AI thinking..." : aiResponse || "No feedback yet"}
        </div>
      </div>
    </div>
  );
};

export default SingleMode;