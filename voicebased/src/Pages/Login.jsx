import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import { authService } from "../services/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payloadEmail = email.trim().toLowerCase();

      const res = await authService.login(payloadEmail, password);

      // 🔥 FIX: safe token extraction
      const token = res?.token || res?.data?.token;

      if (!token) throw new Error("Token not received from server");

      localStorage.setItem("token", token);
      window.dispatchEvent(new Event("authChange"));

      alert("Login successful");
      navigate("/");

    } catch (err) {
      const errorMessage = err.message || "Login failed";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2>Login</h2>

        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

        <form onSubmit={handleLogin}>
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
            {loading ? "Loading..." : "Login"}
          </button>
        </form>

        <p className="switch">
          Don't have an account? <Link to="/signup">Signup</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;