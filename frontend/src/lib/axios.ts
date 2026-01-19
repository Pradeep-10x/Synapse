import axios from "axios";

// Vite uses import.meta.env for environment variables
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                await api.post("/user/refresh-token");
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, user needs to login again
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);
