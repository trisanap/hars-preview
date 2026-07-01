const BASE = "/api";

function getToken() {
  return sessionStorage.getItem("hars_token");
}

async function request(method, path, body = null) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== null && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const opts = { method, headers };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== null) {
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(`${BASE}${path}`, opts);
  if (resp.status === 401) {
    sessionStorage.removeItem("hars_token");
    sessionStorage.removeItem("hars_session");
    window.location.reload();
    throw new Error("Session expired");
  }
  try {
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || "Request failed");
    return data;
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error("Invalid server response");
    throw e;
  }
}

// ─── Key conversion helpers ────────────────────────────────────────────────
// API uses snake_case; frontend uses camelCase for registration fields.
const SNAKE_OVERRIDES = {
  "nama_pu": "namaPU",
  "penyelia_no_ktp": "penyeliaNoKTP",
  "penyelia_no_sk": "penyeliaNoSK",
};

function snakeToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        SNAKE_OVERRIDES[k] || k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        snakeToCamel(v),
      ])
    );
  }
  return obj;
}

function camelToSnake(obj) {
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (obj && typeof obj === "object" && !(obj instanceof Date) && !(obj instanceof FormData)) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
          .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
          .toLowerCase(),
        camelToSnake(v),
      ])
    );
  }
  return obj;
}

export const api = {
  // Auth
  login: (username, password) =>
    request("POST", "/auth/login", { username, password }),
  getMe: () => request("GET", "/auth/me"),

  // Users
  listUsers: () => request("GET", "/users"),
  createUser: (data) => request("POST", "/users", data),
  updateUser: (id, data) => request("PUT", `/users/${id}`, data),
  deleteUser: (id) => request("DELETE", `/users/${id}`),

  // Registrations (snake_case ↔ camelCase conversion)
  listRegistrations: async () => snakeToCamel(await request("GET", "/registrations")),
  getRegistration: async (id) => snakeToCamel(await request("GET", `/registrations/${id}`)),
  createRegistration: (data) => request("POST", "/registrations", camelToSnake(data)),
  updateRegistration: (id, data) => request("PUT", `/registrations/${id}`, camelToSnake(data)),
  deleteRegistration: (id) => request("DELETE", `/registrations/${id}`),

  // Reports
  getReport: (regId) => request("GET", `/reports/${regId}`),
  saveReport: (regId, data) => request("PUT", `/reports/${regId}`, data),

  // Auditors
  listAuditors: () => request("GET", "/auditors"),
  updateAuditor: (id, data) => request("PUT", `/auditors/${id}`, data),

  // Photos
  uploadPhoto: async (regId, category, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("POST", `/photos/${regId}/${category}`, fd);
  },
  listPhotos: (regId, category) => request("GET", `/photos/${regId}/${category}`),
  deletePhoto: (id) => request("DELETE", `/photos/${id}`),
  updatePhotoMetadata: (id, metadata) =>
    request("PUT", `/photos/${id}/metadata`, { metadata_json: metadata }),

  // App state
  getState: (key) => request("GET", `/state/${key}`),
  setState: (key, value) => request("PUT", `/state/${key}`, { value }),

  // Stats
  getStats: () => request("GET", "/stats"),
};
