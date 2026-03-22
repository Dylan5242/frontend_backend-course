import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
});

// Функция для обновления токенов (используется в интерцепторе)
const refreshTokens = async (refreshToken) => {
    const response = await axios.post("http://localhost:3000/api/auth/refresh", { refreshToken });
    return response.data; // ожидается { accessToken, refreshToken }
};

// Интерцептор запроса: добавляет accessToken в заголовок
apiClient.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Интерцептор ответа: обрабатывает 401 и обновляет токены
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        // Если ошибка 401 и запрос ещё не повторялся
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                // Нет refresh токена – очищаем хранилище и отклоняем
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                return Promise.reject(error);
            }
            try {
                // Пытаемся обновить токены
                const { accessToken, refreshToken: newRefreshToken } = await refreshTokens(refreshToken);
                // Сохраняем новые токены
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                // Повторяем исходный запрос с новым access токеном
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Если обновление не удалось – очищаем и отклоняем
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const api = {
    // ========== AUTH ==========
    register: async (userData) => {
        const res = await apiClient.post("/auth/register", userData);
        return res.data;
    },
    login: async (credentials) => {
        const res = await apiClient.post("/auth/login", credentials);
        const { accessToken, refreshToken } = res.data;
        // Сохраняем токены в localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        return res.data;
    },
    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },
    getMe: async () => {
        const res = await apiClient.get("/auth/me");
        return res.data;
    },

    // ========== PRODUCTS ==========
    getProducts: async () => {
        const res = await apiClient.get("/products");
        return res.data;
    },
    createProduct: async (product) => {
        const res = await apiClient.post("/products", product);
        return res.data;
    },
    deleteProduct: async (id) => {
        await apiClient.delete(`/products/${id}`);
    },
    updateProduct: async (id, product) => {
        const res = await apiClient.patch(`/products/${id}`, product);
        return res.data;
    }


};