import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";
import { authService } from "../services/api";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payloadEmail = email.trim().toLowerCase();

      const res = await authService.signup(name, payloadEmail, password);

      // 🔥 FIX: safety check (backend sometimes returns data object)
      const token = res?.token || res?.data?.token;

      if (!token) throw new Error("Token not received from server");

      localStorage.setItem("token", token);
      window.dispatchEvent(new Event("authChange"));

      alert("Signup successful");
      navigate("/dashboard");

    } catch (err) {
      const errorMessage = err.message || "Signup failed";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2>Signup</h2>

        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Signup"}
          </button>
        </form>

        <p className="switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;