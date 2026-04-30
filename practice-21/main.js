const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createClient } = require("redis");

const app = express();
app.use(express.json());

const PORT = 3000;

// ================= CONFIG =================
const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const USERS_CACHE_TTL = 60;
const PRODUCTS_CACHE_TTL = 600;

// ================= DATA =================
const users = [];
const products = [];
const refreshTokens = new Set();

// ================= REDIS =================
const redisClient = createClient({
    url: "redis://127.0.0.1:6379", //localhost
});

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

async function initRedis() {
    await redisClient.connect();
    console.log("Redis connected");
}

// ================= JWT =================
function generateAccessToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
            role: user.role,
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
            role: user.role,
        },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

// ================= MIDDLEWARE =================
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Invalid auth header" });
    }

    try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        const user = users.find((u) => u.id === payload.sub);

        if (!user || user.blocked) {
            return res.status(401).json({ error: "User blocked or not found" });
        }

        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}

function roleMiddleware(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    };
}

// ================= CACHE =================
function cacheMiddleware(keyBuilder, ttl) {
    return async (req, res, next) => {
        try {
            const key = keyBuilder(req);
            const cached = await redisClient.get(key);

            if (cached) {
                return res.json({
                    source: "cache",
                    data: JSON.parse(cached),
                });
            }

            req.cacheKey = key;
            req.cacheTTL = ttl;
            next();
        } catch (err) {
            console.error("Cache error:", err);
            next();
        }
    };
}

async function saveToCache(key, data, ttl) {
    await redisClient.set(key, JSON.stringify(data), { EX: ttl });
}

// async function invalidateUsersCache(id = null) {
//     await redisClient.del("users:all");
//     if (id) await redisClient.del(`users:${id}`);
// }

async function invalidateProductsCache(id = null) {
    await redisClient.del("products:all");
    if (id) await redisClient.del(`products:${id}`);
}

// ================= AUTH =================
app.post("/api/auth/register", async (req, res) => {
    const { username, password, role } = req.body;

    const exists = users.some((u) => u.username === username);
    if (exists) return res.status(409).json({ error: "User exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
        id: String(users.length + 1),
        username,
        passwordHash,
        role: role || "user",
        blocked: false,
    };

    users.push(user);

    res.json(user);
});

app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    const user = users.find((u) => u.username === username);
    if (!user) return res.status(401).json({ error: "Invalid" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    refreshTokens.add(refreshToken);

    res.json({ accessToken, refreshToken });
});

// ================= USERS =================
app.get(
    "/api/users",
    authMiddleware,
    roleMiddleware(["admin"]),
    cacheMiddleware(() => "users:all", USERS_CACHE_TTL),
    async (req, res) => {
        const data = users.map((u) => ({
            id: u.id,
            username: u.username,
            role: u.role,
            blocked: u.blocked,
        }));

        await saveToCache(req.cacheKey, data, req.cacheTTL);

        res.json({ source: "server", data });
    }
);

app.get(
    "/api/users/:id",
    authMiddleware,
    roleMiddleware(["admin"]),
    cacheMiddleware((req) => `users:${req.params.id}`, USERS_CACHE_TTL),
    async (req, res) => {
        const user = users.find((u) => u.id === req.params.id);

        if (!user) return res.status(404).json({ error: "Not found" });

        const data = {
            id: user.id,
            username: user.username,
            role: user.role,
            blocked: user.blocked,
        };

        await saveToCache(req.cacheKey, data, req.cacheTTL);

        res.json({ source: "server", data });
    }
);

// ================= PRODUCTS =================
app.get(
    "/api/products",
    authMiddleware,
    cacheMiddleware(() => "products:all", PRODUCTS_CACHE_TTL),
    async (req, res) => {
        await saveToCache(req.cacheKey, products, req.cacheTTL);
        res.json({ source: "server", data: products });
    }
);

app.get(
    "/api/products/:id",
    authMiddleware,
    cacheMiddleware((req) => `products:${req.params.id}`, PRODUCTS_CACHE_TTL),
    async (req, res) => {
        const product = products.find((p) => p.id === req.params.id);

        if (!product)
            return res.status(404).json({ error: "Product not found" });

        await saveToCache(req.cacheKey, product, req.cacheTTL);

        res.json({ source: "server", data: product });
    }
);

app.post(
    "/api/products",
    authMiddleware,
    roleMiddleware(["admin", "seller"]),
    async (req, res) => {
        const { name, price, description } = req.body;

        const product = {
            id: String(products.length + 1),
            name,
            price,
            description,
        };

        products.push(product);
        await invalidateProductsCache();

        res.status(201).json(product);
    }
);

app.put(
    "/api/products/:id",
    authMiddleware,
    roleMiddleware(["admin", "seller"]),
    async (req, res) => {
        const product = products.find((p) => p.id === req.params.id);

        if (!product)
            return res.status(404).json({ error: "Product not found" });

        Object.assign(product, req.body);

        await invalidateProductsCache(product.id);

        res.json(product);
    }
);

app.delete(
    "/api/products/:id",
    authMiddleware,
    roleMiddleware(["admin"]),
    async (req, res) => {
        const index = products.findIndex((p) => p.id === req.params.id);

        if (index === -1)
            return res.status(404).json({ error: "Product not found" });

        const deleted = products.splice(index, 1);

        await invalidateProductsCache(req.params.id);

        res.json({ message: "Deleted", product: deleted[0] });
    }
);

// ================= START =================
initRedis().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});