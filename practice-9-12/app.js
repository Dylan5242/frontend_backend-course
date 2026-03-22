const express = require("express");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require('cors');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

/////////////////////////////////////////////////////
// CONFIG
/////////////////////////////////////////////////////

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// здание 11 (роли): Импорт из правильного файла
const { authMiddleware, roleMiddleware } = require("./authMiddleware");

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
        PICTURE_URL: "https://iceberg31.ru/upload/iblock/a1f/a1fe9c926947696fc9abbc6fa75e83b1.png",
        amount: 52,
    },
];

/////////////////////////////////////////////////////
// UTILS
/////////////////////////////////////////////////////

function findProductOr404(id, res) {
    const product = products.find((p) => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return null;
    }
    return product;
}

/////////////////////////////////////////////////////
// TOKENS
/////////////////////////////////////////////////////

function generateTokens(user) {
    const accessToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
    const refreshToken = jwt.sign(
        { sub: user.id, role: user.role },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
    return { accessToken, refreshToken };
}

/////////////////////////////////////////////////////
// AUTH - REGISTER
/////////////////////////////////////////////////////

app.post("/api/auth/register", async (req, res) => {
    const { email, first_name, last_name, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (users.some((u) => u.email === email)) return res.status(400).json({ error: "User exists" });

    const newUser = {
        id: nanoid(6),
        email,
        first_name,
        last_name,
        role: role || "user", // здание 11 (роли): по умолчанию user
        hashedPassword: await bcrypt.hash(password, 10),
    };
    users.push(newUser);
    const { hashedPassword, ...safeUser } = newUser;
    res.status(201).json(safeUser);
});

const refreshTokens = new Set();

/////////////////////////////////////////////////////
// LOGIN
/////////////////////////////////////////////////////

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
        return res.status(401).json({ error: "invalid credentials" });
    }
    const tokens = generateTokens(user);
    refreshTokens.add(tokens.refreshToken);
    res.status(200).json(tokens);
});

/////////////////////////////////////////////////////
// REFRESH
/////////////////////////////////////////////////////

app.post("/api/auth/refresh", (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: "Refresh token is not allowed" });
    }
    try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        refreshTokens.delete(refreshToken);
        const user = users.find(u => u.id === decoded.sub);
        if (!user) return res.status(401).json({ error: "User not found" });
        const tokens = generateTokens(user);
        refreshTokens.add(tokens.refreshToken);
        res.status(200).json(tokens);
    } catch (err) {
        refreshTokens.delete(refreshToken);
        return res.status(403).json({ error: "Invalid refresh token" });
    }
});

/////////////////////////////////////////////////////
// ME
/////////////////////////////////////////////////////

app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = users.find((u) => u.id === req.user.sub);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { hashedPassword, ...safeUser } = user;
    res.json(safeUser);
});

/////////////////////////////////////////////////////
// PRODUCTS
/////////////////////////////////////////////////////

// здание 11 (роли): только продавец и админ могут добавлять товары
app.post("/api/products", authMiddleware, roleMiddleware(["seller", "admin"]), (req, res) => {
    const product = { id: nanoid(6), ...req.body, cost: Number(req.body.cost), amount: Number(req.body.amount || 0) };
    products.push(product);
    res.status(201).json(product);
});

app.get("/api/products", authMiddleware,(req, res) => res.json(products));

// здание 11 (роли): только продавец и админ могут изменять товары
app.patch("/api/products/:id", authMiddleware, roleMiddleware(["seller", "admin"]), (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (product) { Object.assign(product, req.body); res.json(product); }
});

// здание 11 (роли): только админ может удалять товары
app.delete("/api/products/:id", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
    const exists = products.some((p) => p.id === req.params.id);
    if (!exists) return res.status(404).json({ error: "Product not found" });
    products = products.filter((p) => p.id !== req.params.id);
    res.status(204).send();
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));