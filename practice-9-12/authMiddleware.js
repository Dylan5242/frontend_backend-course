const jwt = require("jsonwebtoken");
const JWT_SECRET = "access_secret";

// 1. Middleware для проверки аутентификации
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    try {
        // Проверяем токен и декодируем полезную нагрузку (payload)
        const payload = jwt.verify(token, JWT_SECRET);

        // Сохраняем данные пользователя (включая id и role) в объект запроса
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

// 2. Middleware для проверки ролей
// Принимает массив разрешенных ролей, например: roleMiddleware(['admin', 'seller'])
function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        // Проверяем, авторизован ли пользователь и есть ли у него нужная роль
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: Access denied for your role" });
        }
        next();
    };
}

module.exports = {
    authMiddleware,
    roleMiddleware
};