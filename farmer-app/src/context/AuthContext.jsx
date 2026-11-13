import { createContext, useContext, useState, useEffect } from "react";
import { getUserByEmail, getUserById } from "../data/store";
import { DEMO_PASSWORD } from "../data/seed";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("agri_session");
    if (stored) {
      const u = getUserById(+stored);
      setUser(u);
    }
    setLoading(false);
  }, []);

  function login(email, password) {
    const u = getUserByEmail(email);
    if (!u) return "Incorrect email or password.";
    if (password !== DEMO_PASSWORD) return "Incorrect email or password.";
    localStorage.setItem("agri_session", String(u.id));
    setUser(u);
    return null;
  }

  function logout() {
    localStorage.removeItem("agri_session");
    setUser(null);
  }

  function register(data) {
    const users = JSON.parse(localStorage.getItem("agri_users") || "[]");
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return "An account with this email already exists.";
    }
    const newUser = { ...data, id: users.length + 1 };
    users.push(newUser);
    localStorage.setItem("agri_users", JSON.stringify(users));
    localStorage.setItem("agri_session", String(newUser.id));
    setUser(newUser);
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

