import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authService = {
  signup: (name, email, password) =>
    api.post("/api/auth/signup", { name, email, password }).then(res => res.data),

  login: (email, password) =>
    api.post("/api/auth/login", { email, password }).then(res => res.data),
};