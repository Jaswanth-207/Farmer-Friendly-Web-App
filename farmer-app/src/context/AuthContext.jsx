import { useState } from "react";
import { AuthContext } from "./contexts";
import { getUserByEmail, getUserById, getUsers, saveUsers } from "../services/storageService";
import { DEMO_PASSWORD } from "../data/seed";

function sanitizeUser(u) {
  if (!u) return null;
  const { password: _password, ...safeUser } = u;
  return safeUser;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("agri_session");
    return stored ? sanitizeUser(getUserById(+stored)) : null;
  });

  function login(email, password) {
    const trimmedEmail = (email || "").trim();
    if (!trimmedEmail || !password) {
      return "Please enter both email and password.";
    }
    const u = getUserByEmail(trimmedEmail);
    if (!u) return "Incorrect email or password.";

    // Support stored per-user password, falling back to DEMO_PASSWORD for legacy seeded records
    const expectedPassword = u.password || DEMO_PASSWORD;
    if (password !== expectedPassword) {
      return "Incorrect email or password.";
    }

    localStorage.setItem("agri_session", String(u.id));
    setUser(sanitizeUser(u));
    return null;
  }

  function logout() {
    localStorage.removeItem("agri_session");
    setUser(null);
  }

  function register(data) {
    const users = getUsers();
    const email = (data.email || "").trim();
    if (!email) return "Email address is required.";
    if (!data.password || data.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return "An account with this email already exists.";
    }

    const nextId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
    const newUser = {
      ...data,
      id: nextId,
      email,
      password: data.password,
    };

    const saved = saveUsers([...users, newUser]);
    if (!saved) {
      return "Unable to save account in browser storage.";
    }

    localStorage.setItem("agri_session", String(newUser.id));
    setUser(sanitizeUser(newUser));
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}
