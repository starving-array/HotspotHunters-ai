// Centralised KSP API client used by the React UI
// Adjust VITE_API_URL in .env (or use the default localhost) as needed
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

async function request(path, { method = "GET", body = null, token = null } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const opts = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  };
  const resp = await fetch(`${BASE_URL}${path}`, opts);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${txt}`);
  }
  return resp.json();
}

export const getHotspotsLive = (token) => request("/hotspots/live", { token });
export const getHotspotBreakdown = (districtId, token) =>
  request(`/hotspots/breakdown/${districtId}`, { token });

export const getAlertsStream = (token) => request("/alerts/stream", { token });

export const searchGeo = (params, token) =>
  request(`/search/geo?${new URLSearchParams(params)}`, { token });

export const searchRadius = (params, token) =>
  request(`/search/radius?${new URLSearchParams(params)}`, { token });

export const searchFulltext = (q, token) =>
  request(`/search/fulltext?q=${encodeURIComponent(q)}`, { token });

export const getTrends = (districtId, token) =>
  request(`/trends/${districtId}`, { token });

export const compareTrends = (districtsCsv, token) =>
  request(`/trends/compare?districts=${districtsCsv}`, { token });

export const getNetwork = (accusedId, token) =>
  request(`/network/${accusedId}`, { token });

export const nlQuery = (query, token) =>
  request("/nl/query", { method: "POST", body: { query }, token });

export const predictHotspot = (params, token) =>
  request("/predict/hotspot", { token, ...params });

export const predictOffender = (offenderId, token) =>
  request(`/predict/offender/${offenderId}`, { token });

export const logAudit = (payload, token) =>
  request("/audit/log", { method: "POST", body: payload, token });

export const getAuditHistory = (officerId, token) =>
  request(`/audit/history/${officerId}`, { token });
