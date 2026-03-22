const express = require("express");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;

// const cors = require('cors');
// app.use(cors()); // разрешить все источники (только для разработки!)

const JWT_SECRET = "access_secret";
// Время жизни токена
const ACCESS_EXPIRES_IN = "15m";

const authMiddleware = require("./authMiddleware");

let products  = [
    {
        id: 'lE6KsB',
        title: 'Хлеб',
        cost: 40,
        category: 'продукты',
        description: 'Свежий, хрустящий хлеб',
        PICTURE_URL: 'https://iceberg31.ru/upload/iblock/a1f/a1fe9c926947696fc9abbc6fa75e83b1.png',
        amount: 52
    },
    {
        id: 'KosFw5',
        title: 'Молоко',
        cost: 80,
        category: 'продукты',
        description: 'Молоко простоквашино',
        PICTURE_URL:
            'https://cdn.lentochka.lenta.com/resample/webp/250x250/photo/80424/catalog-image/b3359e15-00e8-46d3-a300-b2e3bd2fb3fe.png',
        amount: 42
    },
    {id: nanoid(6), title: 'Слон африканский', cost: 160000, category: "животные", description:"Саванный слон характеризуется массивным тяжёлым телом, большой головой на короткой шее, толстыми конечностями, огромными ушами, верхними резцами, превратившимися в бивни, длинным мускулистым хоботом. Согласно «Книге рекордов Гиннесса», это самое крупное наземное млекопитающее. Самым крупным экземпляром из когда-либо зарегистрированных был самец, застреленный в 1955 году в Анголе, его масса составила 10886 кг\n", PICTURE_URL: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Elephant_near_ndutu.jpg/500px-Elephant_near_ndutu.jpg", amount: 1},
    {id: nanoid(6), title: 'Дуб болотный', cost: 60000,  category: "растения", description:"Дуб болотный – стройное благородное дерево из Северной Африки придаст вашему саду оригинальный внешний вид. Достигает высоты до 25 метров, при диаметре ствола 10 – 15 метров. В совсем молодом возрасте его крона имеет узкопирамидальную форму, с течением лет она превращается в пирамидальную. Кора ствола окрашена в насыщенный зеленовато – коричневый цвет. Темп роста стабильный, примерно 20 – 30 сантиметров в год. Ветви одеты в ярко зеленые зубчатые крупные листья.\n", PICTURE_URL: "https://romashkino.ru/upload/iblock/7e6/30d5ec8582d5b64b989cd7d8356c08ed.jpg", amount: 1},
    {id: nanoid(6), title: 'Каучук синтетический маслонаполненный бутадиен-стирольный в пластиковой упаковке', cost: 226460, category: "иное", description:"Каучук синтетический бутадиен-стирольный, получаемый совместной полимеризацией бутадиена со стиролом  в эмульсии, наполненный маслом TDAE\n", PICTURE_URL: "https://shop.sibur.ru/upload/iblock/6c1/8gutizyyrllgd5xndvn2ptsx0uybr3y6.webp", amount: 10},
]

/////////////////////////////////////////////////////
// Swagger
/////////////////////////////////////////////////////

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API AUTH",
            version: "1.0.0",
            description: "Простое API для изучения авторизации"
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: "Local server"
            }
        ]
    },
    apis: [__filename]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/////////////////////////////////////////////////////

app.use(express.json());

/////////////////////////////////////////////////////
// Простая база данных
/////////////////////////////////////////////////////

let users = [];

/////////////////////////////////////////////////////
// Функции
/////////////////////////////////////////////////////

function findUserOr404(email, res) {

    const user = users.find(u => u.email === email);

    if (!user) {
        res.status(404).json({ error: "user not found" });
        return null;
    }

    return user;
}

async function hashPassword(password) {
    const rounds = 10;
    return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

/////////////////////////////////////////////////////
// Logger
/////////////////////////////////////////////////////

app.use((req, res, next) => {

    res.on("finish", () => {

        console.log(
            `[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`
        );

        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            console.log("Body:", req.body);
        }

    });

    next();
});

/////////////////////////////////////////////////////
// REGISTER
/////////////////////////////////////////////////////

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@mail.com
 *               first_name:
 *                 type: string
 *                 example: Ivan
 *               last_name:
 *                 type: string
 *                 example: Petrov
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       201:
 *         description: Пользователь создан
 */
app.post("/api/auth/register", async (req, res) => {

    const { email, first_name, last_name, password } = req.body;

    if (!email || !first_name || !last_name || !password) {
        return res.status(400).json({
            error: "email, first_name, last_name and password are required"
        });
    }

    if (users.some(u => u.email === email)) {
        return res.status(400).json({
            error: "user with this email already exists"
        });
    }

    const newUser = {
        id: nanoid(6),
        email,
        first_name,
        last_name,
        hashedPassword: await hashPassword(password)
    };

    users.push(newUser);

    res.status(201).json(newUser);
});

/////////////////////////////////////////////////////
// LOGIN
/////////////////////////////////////////////////////
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Авторизация пользователя
 *     description: Проверяет email и пароль и возвращает JWT токен
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@mail.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Отсутствуют обязательные поля
 *       401:
 *         description: Неверные учетные данные
 */
app.post("/api/auth/login", async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "email and password are required"
        });
    }

    const user = findUserOr404(email, res);
    if (!user) return;

    const isAuthenticated = await verifyPassword(password, user.hashedPassword);

    if (!isAuthenticated) {
        return res.status(401).json({
            error: "Invalid credentials"
        });
    }

    // создание JWT
    const accessToken = jwt.sign(
        {
            sub: user.id,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: ACCESS_EXPIRES_IN
        }
    );

    const refreshToken = jwt.sign(
        {
            sub: user.id
        },
        REFRESH_SECRET,
        {
            expiresIn: REFRESH_EXPIRES_IN
        }
    );

    res.json({
        accessToken,
        refreshToken
    });

});

// fix функция ищет продукт
function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: "Product not found" }); // fix текст ошибки
        return null;
    }
    return product;
}

/////////////////////////////////////////////////////////
// POST /api/products
/////////////////////////////////////////////////////////


/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               cost:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               PICTURE_URL:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Товар создан
 *       400:
 *         description: Ошибка валидации
 */
app.post("/api/products",(req, res) => {

    const { title, cost, category, description, PICTURE_URL, amount } = req.body;

    // add валидация обязательных полей
    if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
    }

    if (cost === undefined || isNaN(Number(cost))) {
        return res.status(400).json({ error: "Valid cost is required" });
    }

    if (!category || typeof category !== "string") {
        return res.status(400).json({ error: "Category is required" });
    }

    if (!description || typeof description !== "string") {
        return res.status(400).json({ error: "Description is required" });
    }

    if (!PICTURE_URL || typeof PICTURE_URL !== "string") {
        return res.status(400).json({ error: "PICTURE_URL is required" });
    }

    if (amount === undefined || isNaN(Number(amount))) {
        return res.status(400).json({ error: "Valid amount is required" });
    }

    const newProduct = {
        id: nanoid(6),
        title: title.trim(),
        cost: Number(cost),
        category: category.trim(),
        description: description.trim(),
        PICTURE_URL: PICTURE_URL.trim(),
        amount: Number(amount),
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

/////////////////////////////////////////////////////////
// GET /api/products
/////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags:
 *       - Products
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   cost:
 *                     type: number
 *                   category:
 *                     type: string
 *                   description:
 *                     type: string
 *                   PICTURE_URL:
 *                     type: string
 *                   amount:
 *                     type: number
 */

app.get("/api/products", authMiddleware,(req, res) => {
    res.json(products);
});

/////////////////////////////////////////////////////////
// GET /api/products/:id
/////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Найденный товар
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 cost:
 *                   type: number
 *                 category:
 *                   type: string
 *                 description:
 *                   type: string
 *                 PICTURE_URL:
 *                   type: string
 *                 amount:
 *                   type: number
 *       404:
 *         description: Товар не найден
 */

app.get("/api/products/:id", (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (!product) return;
    res.json(product);
});

/////////////////////////////////////////////////////////
// PATCH /api/products/:id
/////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить товар по ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               cost:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               PICTURE_URL:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Товар успешно обновлён
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Товар не найден
 */

app.patch("/api/products/:id", authMiddleware,(req, res) => {

    const product = findProductOr404(req.params.id, res);
    if (!product) return;

    const { title, cost, category, description, PICTURE_URL, amount } = req.body;

    // add запрет пустого PATCH
    if (
        title === undefined &&
        cost === undefined &&
        category === undefined &&
        description === undefined &&
        PICTURE_URL === undefined &&
        amount === undefined
    ) {
        return res.status(400).json({ error: "Nothing to update" });
    }

    // add обновление с валидацией
    if (title !== undefined) {
        if (typeof title !== "string" || !title.trim())
            return res.status(400).json({ error: "Invalid title" });
        product.title = title.trim();
    }

    if (cost !== undefined) {
        if (isNaN(Number(cost)))
            return res.status(400).json({ error: "Invalid cost" });
        product.cost = Number(cost);
    }

    if (category !== undefined) {
        if (typeof category !== "string")
            return res.status(400).json({ error: "Invalid category" });
        product.category = category.trim();
    }

    if (description !== undefined) {
        if (typeof description !== "string")
            return res.status(400).json({ error: "Invalid description" });
        product.description = description.trim();
    }

    if (PICTURE_URL !== undefined) {
        if (typeof PICTURE_URL !== "string")
            return res.status(400).json({ error: "Invalid PICTURE_URL" });
        product.PICTURE_URL = PICTURE_URL.trim();
    }

    if (amount !== undefined) {
        if (isNaN(Number(amount)))
            return res.status(400).json({ error: "Invalid amount" });
        product.amount = Number(amount);
    }

    res.json(product);
});

/////////////////////////////////////////////////////////
// DELETE /api/products/:id
/////////////////////////////////////////////////////////

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар по ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар успешно удалён
 *       404:
 *         description: Товар не найден
 */

app.delete("/api/products/:id", authMiddleware,(req, res) => {

    const exists = products.some(p => p.id === req.params.id);
    if (!exists)
        return res.status(404).json({ error: "Product not found" });

    products = products.filter(p => p.id !== req.params.id);

    res.status(204).send();
});


/////////////////////////////////////////////////////
// START SERVER
/////////////////////////////////////////////////////

app.listen(port, () => {

    console.log(`Server running on http://localhost:${port}`);
    console.log(`Swagger docs: http://localhost:${port}/api-docs`);

});

app.get("/api/auth/me", authMiddleware, (req, res) => {

    const user = users.find(u => u.id === req.user.sub);

    if (!user) {
        return res.status(404).json({
            error: "User not found"
        });
    }

    const { hashedPassword, ...safeUser } = user;

    res.json(safeUser);
});


// 404 для всех остальных маршрутов
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});