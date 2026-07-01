import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = sessionStorage.getItem("hars_token");
      if (token) {
        try {
          const u = await api.getMe();
          if (!cancelled) setUser(u);
        } catch {
          sessionStorage.removeItem("hars_token");
          sessionStorage.removeItem("hars_session");
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const { access_token, user: u } = await api.login(username, password);
      sessionStorage.setItem("hars_token", access_token);
      sessionStorage.setItem("hars_session", JSON.stringify(u));
      setUser(u);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem("hars_token");
    sessionStorage.removeItem("hars_session");
  }, []);

  const listUsers = useCallback(async () => {
    const users = await api.listUsers();
    return users.map(u => ({
      id: u.id,
      username: u.username,
      nama: u.nama,
      role: u.role,
      reg: u.reg || "",
      status: u.status,
      createdAt: u.created_at,
    }));
  }, []);

  const addUser = useCallback(async ({ username, password, nama, role, reg }) => {
    try {
      await api.createUser({ username, password, nama, role, reg: reg || "" });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const updateUser = useCallback(async (id, fields) => {
    try {
      await api.updateUser(id, fields);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const deleteUser = useCallback(async (id) => {
    await api.deleteUser(id);
    return { ok: true };
  }, []);

  const value = { user, loading, login, logout, listUsers, addUser, updateUser, deleteUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
