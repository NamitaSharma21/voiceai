import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./SingleMode.css";

const API_URL = import.meta.env.VITE_API_URL;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const SingleMode = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false; // ✅ IMPORTANT FIX
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + " ";
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText;
        setText(finalTranscriptRef.current.trim());
      }
    };

    recognition.onerror = (e) => {
      console.log(e);
      setErrorMessage("Mic error: " + e.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startRecording = () => {
    setErrorMessage("");
    setAiResponse("");
    finalTranscriptRef.current = "";
    setText("");

    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setErrorMessage("Start failed. Try again.");
    }
  };

  const stopRecording = async () => {
    recognitionRef.current.stop();
    setIsRecording(false);

    const finalText = finalTranscriptRef.current.trim();
    if (!finalText) {
      setErrorMessage("No speech detected.");
      return;
    }

    await getAIResponse(finalText);
  };

  const getAIResponse = async (finalText) => {
    setLoading(true);

    try {
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
                  "You are a speech evaluator. Give feedback + score out of 100.",
              },
              {
                role: "user",
                content: `Topic: ${topic}\nAnswer: ${finalText}`,
              },
            ],
            max_tokens: 200,
          }),
        }
      );

      const data = await res.json();
      const result = data?.choices?.[0]?.message?.content;

      setAiResponse(result || "No response");

      // ✅ BACKEND FIX (NO localhost)
      await axios.post(
        `${API_URL}/api/attempt/single`,
        {
          topic,
          answer: finalText,
          aiResponse: result,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (err) {
      setAiResponse("AI/Server error");
    }

    setLoading(false);
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

        <div className="voice-text">
          {text || "Speak something..."}
        </div>

        <div className="ai-response">
          {loading ? "AI thinking..." : aiResponse || "No feedback yet"}
        </div>

      </div>
    </div>
  );
};

export default SingleMode;