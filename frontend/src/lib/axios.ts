import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
    // Fail loud in production builds where the API URL wasn't configured.
    console.error("VITE_API_URL is not set — falling back to localhost. Set it in your environment.");
}

export const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Auth uses httpOnly cookies, so the access token is never handled in JS.
// The interceptor only transparently refreshes the session on a 401 and
// replays the original request. Concurrent 401s wait on a single refresh.
let isRefreshing = false;
let failedQueue: Array<{
    resolve: () => void;
    reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve();
    });
    failedQueue = [];
};

const AUTH_ENDPOINTS = ["/user/login", "/user/register", "/user/refresh-token"];

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Never try to refresh for the auth endpoints themselves.
        const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) =>
            originalRequest?.url?.includes(endpoint)
        );

        if (
            error.response?.status !== 401 ||
            isAuthEndpoint ||
            originalRequest?._retry
        ) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            // Queue until the in-flight refresh resolves, then replay.
            return new Promise<void>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => api(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await api.post("/user/refresh-token");
            processQueue(null);
            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError);
            localStorage.removeItem("token");
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);
