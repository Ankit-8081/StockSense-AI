import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return api.post("/auth/login", form);
  },
  me: () => api.get("/auth/me"),
};

export const stocksAPI = {
  quote: (symbol, market = "NSE") => api.get(`/stocks/quote/${symbol}`, { params: { market } }),
  history: (symbol, market = "NSE", period = "3mo", interval = "1d") =>
    api.get(`/stocks/history/${symbol}`, { params: { market, period, interval } }),
  search: (q) => api.get("/stocks/search", { params: { q } }),
  movers: (market = "NSE") => api.get("/stocks/movers", { params: { market } }),
  status: () => api.get("/stocks/status"),
};

export const newsAPI = {
  stockNews: (symbol, company = "", market = "NSE") => api.get(`/news/${symbol}`, { params: { company, market } }),
  marketNews: (market = "NSE") => api.get(`/news/market/${market}`),
};

export const predictionAPI = {
  predict: (symbol, market = "NSE", type = "delivery") =>
    api.get(`/predict/${symbol}`, { params: { market, type } }),
  history: () => api.get("/predict/history/me"),
};

export const watchlistAPI = {
  get: () => api.get("/watchlist/"),
  add: (symbol, market) => api.post("/watchlist/", { symbol, market }),
  remove: (id) => api.delete(`/watchlist/${id}`),
};

export const alertsAPI = {
  get: () => api.get("/alerts/"),
  create: (data) => api.post("/alerts/", data),
  delete: (id) => api.delete(`/alerts/${id}`),
  check: () => api.get("/alerts/check"),
};

export const keysAPI = {
  get: () => api.get("/keys/"),
  save: (data) => api.put("/keys/", data),
};

export default api;
