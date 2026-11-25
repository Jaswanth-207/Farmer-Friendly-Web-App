import { useState } from "react";
import { AuthContext } from "./contexts";
import { getUserByEmail, getUserById } from "../services/storageService";
import { DEMO_PASSWORD } from "../data/seed";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("agri_session");
    return stored ? getUserById(+stored) : null;
  });

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
    if (users.find((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
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
    <AuthContext.Provider value={{ user, login, logout, register, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}
