import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./Pages/Home";
import Signup from "./Pages/Signup";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import SingleMode from "./Pages/SingleMode";
import GroupMode from "./Pages/GroupMode";
import Navbar from "./components/Navbar";

const isLoggedIn = () => {
  return !!localStorage.getItem("token");
};

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* PROTECTED ROUTES */}
        <Route
          path="/dashboard"
          element={
            isLoggedIn() ? <Dashboard /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/single"
          element={
            isLoggedIn() ? <SingleMode /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/group"
          element={
            isLoggedIn() ? <GroupMode /> : <Navigate to="/login" replace />
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;