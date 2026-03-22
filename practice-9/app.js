const express = require("express");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;

app.use(express.json());

const cors = require('cors');
app.use(cors()); // разрешить все источники (только для разработки!)


/////////////////////////////////////////////////////
// CONFIG
/////////////////////////////////////////////////////

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const authMiddleware = require("./authMiddleware");

/////////////////////////////////////////////////////
// DATA
/////////////////////////////////////////////////////

let users = [];

let products = [
    {
        id: "lE6KsB",
        title: "Хлеб",
        cost: 40,
        category: "продукты",
        description: "Свежий, хрустящий хлеб",
        PICTURE_URL:
            "https://iceberg31.ru/upload/iblock/a1f/a1fe9c926947696fc9abbc6fa75e83b1.png",
        amount: 52,
    },
];

/////////////////////////////////////////////////////
// UTILS
/////////////////////////////////////////////////////

function findUserOr404(email, res) {
    const user = users.find((u) => u.email === email);

    if (!user) {
        res.status(404).json({ error: "user not found" });
        return null;
    }

    return user;
}

function findProductOr404(id, res) {
    const product = products.find((p) => p.id === id);

    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return null;
    }

    return product;
}

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/////////////////////////////////////////////////////
// TOKENS
/////////////////////////////////////////////////////

function generateTokens(user) {
    const accessToken = jwt.sign(
        {
            sub: user.id,
            email: user.email,
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
        {
            sub: user.id,
        },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
}

/////////////////////////////////////////////////////
// LOGGER
/////////////////////////////////////////////////////

app.use((req, res, next) => {
    res.on("finish", () => {
        console.log(
            `[${new Date().toISOString()}] ${req.method} ${res.statusCode} ${req.path}`
        );
    });
    next();
});

/////////////////////////////////////////////////////
// AUTH
/////////////////////////////////////////////////////

app.post("/api/auth/register", async (req, res) => {
    const { email, first_name, last_name, password } = req.body;

    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({
            error: "email, first_name, last_name, password required",
        });
    }

    if (users.some((u) => u.email === email)) {
        return res.status(400).json({
            error: "user already exists",
        });
    }

    const newUser = {
        id: nanoid(6),
        email,
        first_name,
        last_name,
        hashedPassword: await hashPassword(password),
    };

    users.push(newUser);

    res.status(201).json(newUser);
});

/////////////////////////////////////////////////////
// SET ДЛЯ REFRESH TOKENS
/////////////////////////////////////////////////////

const refreshTokens = new Set();

/////////////////////////////////////////////////////
// LOGIN
/////////////////////////////////////////////////////

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "missing fields" });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: "invalid credentials" });
    }

    const isValid = await verifyPassword(password, user.hashedPassword);
    if (!isValid) {
        return res.status(401).json({ error: "invalid credentials" });
    }

    const payload = { id: user.id, email: user.email };
    const tokens = generateTokens(payload);

    // Сохраняем refresh-токен в множество активных токенов на сервере
    refreshTokens.add(tokens.refreshToken);


    res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
    });
});

/////////////////////////////////////////////////////
// REFRESH
/////////////////////////////////////////////////////

// Множество действующих refresh-токенов
const activeRefreshTokens = new Set();

app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
    }

    // Проверяем, что токен есть среди действующих
    if (!activeRefreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: "Refresh token is not allowed" });
    }

    // Верифицируем подпись и срок действия
    jwt.verify(refreshToken, REFRESH_SECRET, (err, decoded) => {
        if (err) {
            // Если токен невалиден — удаляем из множества действующих
            activeRefreshTokens.delete(refreshToken);
            return res.status(403).json({ error: "Invalid or expired refresh token" });
        }

        // Удаляем старый токен — теперь он недействителен
        activeRefreshTokens.delete(refreshToken);

        // Генерируем новую пару токенов
        const payload = { id: decoded.id, email: decoded.email };
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload);

        // Добавляем новый refresh-токен в множество действующих
        activeRefreshTokens.add(newRefreshToken);

        // Отправляем клиенту новую пару токенов
        res.status(200).json({
            accessToken,
            refreshToken: newRefreshToken
        });
    });
});

/////////////////////////////////////////////////////
// ME
/////////////////////////////////////////////////////

app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = users.find((u) => u.id === req.user.sub);

    if (!user) {
        return res.status(404).json({
            error: "User not found",
        });
    }

    const { hashedPassword, ...safeUser } = user;

    res.json(safeUser);
});

/////////////////////////////////////////////////////
// PRODUCTS
/////////////////////////////////////////////////////

app.post("/api/products", authMiddleware, (req, res) => {
    const { title, cost, category, description, PICTURE_URL, amount } =
        req.body;

    if (!title || isNaN(Number(cost))) {
        return res.status(400).json({ error: "invalid data" });
    }

    const product = {
        id: nanoid(6),
        title,
        cost: Number(cost),
        category,
        description,
        PICTURE_URL,
        amount: Number(amount || 0),
    };

    products.push(product);

    res.status(201).json(product);
});

app.get("/api/products", (req, res) => {
    res.json(products);
});

app.get("/api/products/:id", authMiddleware, (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (!product) return;

    res.json(product);
});

app.patch("/api/products/:id", authMiddleware, (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (!product) return;

    Object.assign(product, req.body);

    res.json(product);
});

app.delete("/api/products/:id", authMiddleware, (req, res) => {
    const exists = products.some((p) => p.id === req.params.id);

    if (!exists) {
        return res.status(404).json({ error: "Product not found" });
    }

    products = products.filter((p) => p.id !== req.params.id);

    res.status(204).send();
});

/////////////////////////////////////////////////////
// 404
/////////////////////////////////////////////////////

app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

/////////////////////////////////////////////////////
// START
/////////////////////////////////////////////////////

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});