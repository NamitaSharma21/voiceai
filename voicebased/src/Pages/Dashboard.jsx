import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const [singleAttempts, setSingleAttempts] = useState([]);
  const [groupAttempts, setGroupAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [singleRes, groupRes] = await Promise.all([
          axios.get("http://localhost:5000/api/attempt/single", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5000/api/attempt/group", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setSingleAttempts(singleRes.data || []);
        setGroupAttempts(groupRes.data || []);
      } catch (err) {
        console.log("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const totalSingle = singleAttempts.length;
  const totalGroup = groupAttempts.length;

  const avgSingleScore = () => {
    if (!singleAttempts.length) return 0;

    let sum = 0;
    singleAttempts.forEach((a) => {
      const match = a.aiResponse?.match(/(\d{1,3})/); // simple score extract
      if (match) sum += Number(match[1]);
    });

    return (sum / singleAttempts.length).toFixed(1);
  };

  return (
    <div className="dashboard-container">

      {/* HEADER */}
      <div className="dashboard-header">
        <h1>📊 Your Dashboard</h1>
        <p>Track your speaking progress & AI evaluations</p>
      </div>

      {/* MODE SELECTION */}
      <div className="mode-selection">
        <h2>Start Practicing</h2>
        <div className="mode-buttons">
          <Link to="/single" className="mode-btn solo">
            🎤 Practice Solo
          </Link>
          <Link to="/group" className="mode-btn group">
            👥 Group Mode
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading data...</p>
      ) : (
        <>
          {/* STATS CARDS */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <h2>{totalSingle}</h2>
              <p>Single Attempts</p>
            </div>

            <div className="stat-card purple">
              <h2>{totalGroup}</h2>
              <p>Group Attempts</p>
            </div>

            <div className="stat-card green">
              <h2>{avgSingleScore()}%</h2>
              <p>Avg Score (Single)</p>
            </div>
          </div>

          {/* TWO PANELS */}
          <div className="dashboard-grid">

            {/* SINGLE HISTORY */}
            <div className="panel">
              <h3>🎤 Single Mode History</h3>

              {singleAttempts.length === 0 ? (
                <p>No attempts yet</p>
              ) : (
                singleAttempts.slice(0, 5).map((item, i) => (
                  <div key={i} className="card">
                    <p><b>Topic:</b> {item.topic}</p>
                    <p className="text">
                      {item.answer?.slice(0, 80)}...
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* GROUP HISTORY */}
            <div className="panel">
              <h3>👥 Group Mode History</h3>

              {groupAttempts.length === 0 ? (
                <p>No group attempts yet</p>
              ) : (
                groupAttempts.slice(0, 5).map((item, i) => (
                  <div key={i} className="card">
                    <p><b>Topic:</b> {item.topic}</p>
                    <p className="text">
                      Participants: {item.participants?.length || 0}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;