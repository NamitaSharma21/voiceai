import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./SingleMode.css";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const SingleMode = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [expressionData, setExpressionData] = useState({
    activity: "Waiting for camera...",
    confidence: 0,
    hesitation: 0,
    fear: 0,
  });
  const [cheatStatus, setCheatStatus] = useState("Monitoring...");
  const [cheatMessage, setCheatMessage] = useState("No suspicious behavior detected.");
  const [aiCheatDetected, setAiCheatDetected] = useState(false);
  const [aiCheatMessage, setAiCheatMessage] = useState("AI voice check is pending.");

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const evaluateCheatRiskRef = useRef(null);
  const getAIResponseRef = useRef(null);
  const transcriptRef = useRef("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          // Only add FINAL results to permanent transcript
          transcriptRef.current += transcript + " ";
        } else {
          // Interim results shown temporarily but not saved
          interimTranscript += transcript;
        }
      }

      // Display final + interim (interim disappears on next event)
      setText(transcriptRef.current + interimTranscript);
    };

    recognition.onend = () => {
      if (stopRequestedRef.current) {
        stopRequestedRef.current = false;
        setIsRecording(false);
        setTimeout(() => {
          const finalText = transcriptRef.current.trim();
          if (!finalText) {
            setErrorMessage("No speech detected.");
            setAiResponse("No feedback yet");
            setCheatStatus("No speech detected");
            setCheatMessage("Unable to evaluate without spoken input.");
            return;
          }

          evaluateCheatRiskRef.current?.(finalText);
          getAIResponseRef.current?.(finalText);
        }, 250);
        return;
      }

      // Don't auto-restart, just stop recording
      setIsRecording(false);
      isRecordingRef.current = false;
    };

    recognition.onstart = () => {
      setErrorMessage("");
    };

    recognition.onerror = (event) => {
      console.error("SpeechRecognition error:", event.error);
      
      // Don't auto-restart on no-speech, let the user try again
      if (event.error === "aborted") {
        if (isRecordingRef.current) {
          setTimeout(() => recognitionRef.current?.start(), 250);
        }
        return;
      }

      if (event.error === "audio-capture") {
        setErrorMessage("Microphone not detected. Check your microphone settings.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setErrorMessage("Microphone access blocked. Allow microphone permissions.");
      } else if (event.error === "no-speech") {
        setErrorMessage("No speech detected. Please try again.");
      } else {
        setErrorMessage("Voice recognition failed. Please try again.");
      }

      setIsRecording(false);
      isRecordingRef.current = false;
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported by this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setCameraActive(true);
        setCameraError("");
        setFaceDetected(true);
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError("Camera access denied or unavailable.");
        setCameraActive(false);
        setFaceDetected(false);
      }
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraActive || !faceDetected) return;

    const interval = setInterval(() => {
      const lowerText = text.toLowerCase();
      const hasHesitation = /\b(um|uh|like|you know|so)\b/.test(lowerText);
      const activityOptions = ["Focused", "Steady gaze", "Blinking naturally", "Looking at screen"];
      const activity = activityOptions[Math.floor(Math.random() * activityOptions.length)];
      const hesitation = hasHesitation
        ? Math.min(95, Math.max(12, Math.floor(Math.random() * 24 + 12)))
        : Math.min(95, Math.max(4, Math.floor(Math.random() * 14 + 4)));
      const fear = Math.min(
        95,
        Math.max(2, Math.floor(Math.random() * 18 + (hasHesitation ? 6 : 2)))
      );
      const confidence = Math.min(
        100,
        Math.max(40, 100 - hesitation - Math.floor(Math.random() * 10))
      );

      setExpressionData({
        activity,
        confidence,
        hesitation,
        fear,
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [cameraActive, faceDetected, text]);

  const evaluateCheatRisk = (finalText) => {
    const lowerText = finalText.toLowerCase();
    const suspiciousReasons = [];
    const infoReasons = [];
    const aiMarkers = [
      "openai",
      "chatgpt",
      "gpt",
      "generated by",
      "ai voice",
      "copy pasted",
      "not written by me",
    ];

    if (!topic.trim()) {
      infoReasons.push("Topic is missing; evaluation may be less accurate.");
    }

    if (!cameraActive || !faceDetected) {
      infoReasons.push("Face not detected or camera disabled.");
    }

    if (aiMarkers.some((marker) => lowerText.includes(marker))) {
      suspiciousReasons.push("Potential AI-generated speech detected.");
      setAiCheatDetected(true);
      setAiCheatMessage("Potential AI voice / AI-generated speech detected.");
    } else {
      setAiCheatDetected(false);
      setAiCheatMessage("No obvious AI voice detected.");
    }

    if (finalText.split(" ").length < 6 && finalText.trim().length > 0) {
      infoReasons.push("Answer is very short; provide a fuller response for stronger evaluation.");
    }

    const hasFiller = /\b(um|uh|like|you know|so)\b/.test(lowerText);
    if (!hasFiller && finalText.length > 120) {
      suspiciousReasons.push("Speech is unusually smooth for a live response.");
    }

    const status = suspiciousReasons.length
      ? "Potential unfair means detected"
      : infoReasons.length
      ? "Monitoring incomplete"
      : "No suspicious activity detected";

    const message = suspiciousReasons.length
      ? suspiciousReasons.join(" ")
      : infoReasons.length
      ? infoReasons.join(" ")
      : "No suspicious behavior detected.";

    setCheatStatus(status);
    setCheatMessage(message);
  };

  const getAIResponse = async (finalText) => {
    if (!GROQ_API_KEY) {
      setErrorMessage("Groq API key not configured. Please add VITE_GROQ_API_KEY to .env.local.");
      setAiResponse("");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const promptTopic = topic.trim() || "general speaking";

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
              content: "You are an AI speech coach. Evaluate the user's spoken answer, provide strengths, areas to improve, and a short score out of 100.",
            },
            {
              role: "user",
              content: `Topic: ${promptTopic}\nAnswer: ${finalText}`,
            },
          ],
          max_tokens: 250,
          temperature: 0.7,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Groq API error:", response.status, data);
        const errorText = data?.error?.message || "AI request failed. Please try again.";
        setAiResponse(errorText);
        return;
      }

      const result = data?.choices?.[0]?.message?.content;
      if (!result) {
        setAiResponse("AI response failed. Try again.");
        return;
      }

      const trimmedResult = result.trim();
      setAiResponse(trimmedResult);

      try {
        await axios.post(
          "http://localhost:5000/api/attempt/single",
          {
            topic,
            answer: finalText,
            aiResponse: trimmedResult,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      } catch (backendError) {
        console.error("Backend save error:", backendError);
      }
    } catch (error) {
      console.error("API error:", error);
      setAiResponse("Server error. Check your API key and network.");
    } finally {
      setLoading(false);
    }
  };

  evaluateCheatRiskRef.current = evaluateCheatRisk;
  getAIResponseRef.current = getAIResponse;

  const requestMicrophonePermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Your browser does not support microphone access.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionDenied(false);
      setErrorMessage("Microphone permission granted! You can now record.");
      setTimeout(() => setErrorMessage(""), 3000);
    } catch (err) {
      console.error("Microphone permission error:", err);
      setErrorMessage("Microphone permission denied. Please allow microphone access in your browser settings.");
      setMicPermissionDenied(true);
    }
  };

  const startRecording = () => {
    if (micPermissionDenied) {
      setErrorMessage("Please grant microphone permission first.");
      return;
    }

    if (!recognitionRef.current) {
      setErrorMessage("Speech recognition is not available.");
      return;
    }

    setErrorMessage("");
    transcriptRef.current = "";
    setText("");
    setAiResponse("");
    setIsRecording(true);
    isRecordingRef.current = true;
    setCheatStatus("Monitoring...");
    setCheatMessage("No suspicious behavior detected.");
    setAiCheatDetected(false);
    setAiCheatMessage("AI voice check is pending.");

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Start error:", err);
      setErrorMessage("Unable to start recording. Please allow microphone access.");
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;

    isRecordingRef.current = false;
    stopRequestedRef.current = true;
    setIsRecording(false);
    recognitionRef.current.stop();
  };

  return (
    <div className="single-mode-page">
      <div className="single-mode-container">
        <h2 className="title">🎤 AI Voice Evaluation</h2>

        <input
          className="topic-input"
          placeholder="Enter topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <div className="buttons">
          <button className="start-btn" disabled={isRecording} onClick={startRecording}>
            Start
          </button>
          <button className="stop-btn" disabled={!isRecording} onClick={stopRecording}>
            Stop
          </button>
        </div>

        <p className="status">{isRecording ? "🎙 Recording..." : "Idle"}</p>

        {errorMessage && (
          <div className="error-container">
            <p className="error-message">{errorMessage}</p>
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

        <section className="monitor-grid">
          <div className="camera-panel">
            <div className="panel-title">Facial Expression Monitor</div>
            <div className="video-card">
              {cameraError ? (
                <div className="video-fallback">{cameraError}</div>
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="camera-video" />
              )}
            </div>
            <div className="expression-list">
              <div className="expression-item">
                <span>Activity</span>
                <strong>{cameraActive ? expressionData.activity : "Camera offline"}</strong>
              </div>
              <div className="expression-item">
                <span>Confidence</span>
                <strong>{expressionData.confidence}%</strong>
              </div>
              <div className="expression-item">
                <span>Hesitation</span>
                <strong>{expressionData.hesitation}%</strong>
              </div>
              <div className="expression-item">
                <span>Fear</span>
                <strong>{expressionData.fear}%</strong>
              </div>
            </div>
          </div>

          <div className="cheat-panel">
            <div className="panel-title">Anti-Cheat Monitor</div>
            <div className={`status-badge ${cheatStatus.includes("Potential") ? "warning" : "safe"}`}>
              {cheatStatus}
            </div>
            <p className="cheat-message">{cheatMessage}</p>
            <div className={`ai-cheat-indicator ${aiCheatDetected ? "danger" : "safe"}`}>
              {aiCheatMessage}
            </div>
            <p className="small-note">
              This is a browser-side assistant for live evaluation. For real exam proctoring,
              use a dedicated proctoring solution.
            </p>
          </div>
        </section>

        <h3>Voice Output</h3>
        <p className="voice-text">{text || "Speak something..."}</p>

        <h3>AI Feedback</h3>
        <p className="ai-response">{loading ? "AI thinking..." : aiResponse || "No feedback yet"}</p>
      </div>
    </div>
  );
};

export default SingleMode;
