import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const defaultBaseUrl = "http://localhost:8000/api/v1";
const baseURL = (configuredBaseUrl || defaultBaseUrl).replace(/\/$/, "");

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.detail || error.message || "Network error";
    return Promise.reject(new Error(message));
  }
);
