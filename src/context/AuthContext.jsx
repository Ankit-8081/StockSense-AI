import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverDown, setServerDown] = useState(false);

  const check = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setServerDown(false);
    try {
      let res;
      try { res = await authAPI.me(); } catch (e) {
        if (e.response) throw e;          // a real answer (e.g. 401): don't retry
        res = await authAPI.me();         // no answer at all: try once more
      }
      setUser(res.data);
    } catch (e) {
      if (e.response) localStorage.removeItem("token");   // token rejected
      else setServerDown(true);                           // server unreachable: keep the login
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    localStorage.setItem("token", res.data.access_token);
    const me = await authAPI.me();
    setUser(me.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, serverDown, retry: check }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
