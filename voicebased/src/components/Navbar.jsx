import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const syncToken = () => {
      setToken(localStorage.getItem("token"));
    };

    window.addEventListener("storage", syncToken);
    window.addEventListener("authChange", syncToken);
    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("authChange", syncToken);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    navigate("/login");
  };

  return (
    <div className="navbar">
      <div className="logo">VoiceAI</div>

      <div className="right">
        {!token ? (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/signup" className="nav-link signup">Signup</Link>
          </>
        ) : (
          <>
            {/* ✅ HOME ADDED */}
            <Link to="/" className="nav-link">Home</Link>

            {/* ✅ DASHBOARD */}
            <Link to="/dashboard" className="nav-link">Dashboard</Link>

            {/* ❌ LOGOUT */}
            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Navbar;