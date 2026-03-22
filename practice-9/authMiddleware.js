const jwt = require("jsonwebtoken");

const JWT_SECRET = "access_secret";

function authMiddleware(req, res, next) {

    const header = req.headers.authorization || "";

    // ожидаем формат: Bearer token
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            error: "Missing or invalid Authorization header"
        });
    }

    try {

        const payload = jwt.verify(token, JWT_SECRET);

        // сохраняем данные пользователя
        req.user = payload;

        next();

    } catch (err) {

        return res.status(401).json({
            error: "Invalid or expired token"
        });

    }

}

module.exports = authMiddleware;