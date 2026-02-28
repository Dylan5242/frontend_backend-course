const express = require('express');
const { nanoid } = require('nanoid');
const app = express();
const port = 3000;

const cors = require('cors');

// app.use(cors({
//     origin: 'http://localhost:5173', // разрешаем фронту делать запросы
//     methods: ['GET','POST','PATCH','DELETE'],
//     allowedHeaders: ['Content-Type']
// }));

app.use(cors()); // разрешить все источники (только для разработки!)

let products  = [
    {id: nanoid(6), title: 'Слон африканский', cost: 160000, category: "животные", description:"Саванный слон характеризуется массивным тяжёлым телом, большой головой на короткой шее, толстыми конечностями, огромными ушами, верхними резцами, превратившимися в бивни, длинным мускулистым хоботом. Согласно «Книге рекордов Гиннесса», это самое крупное наземное млекопитающее. Самым крупным экземпляром из когда-либо зарегистрированных был самец, застреленный в 1955 году в Анголе, его масса составила 10886 кг\n", PICTURE_URL: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Elephant_near_ndutu.jpg/500px-Elephant_near_ndutu.jpg", amount: 1},
    {id: nanoid(6), title: 'Дуб болотный', cost: 60000,  category: "растения", description:"Дуб болотный – стройное благородное дерево из Северной Африки придаст вашему саду оригинальный внешний вид. Достигает высоты до 25 метров, при диаметре ствола 10 – 15 метров. В совсем молодом возрасте его крона имеет узкопирамидальную форму, с течением лет она превращается в пирамидальную. Кора ствола окрашена в насыщенный зеленовато – коричневый цвет. Темп роста стабильный, примерно 20 – 30 сантиметров в год. Ветви одеты в ярко зеленые зубчатые крупные листья.\n", PICTURE_URL: "https://romashkino.ru/upload/iblock/7e6/30d5ec8582d5b64b989cd7d8356c08ed.jpg", amount: 1},
    {id: nanoid(6), title: 'Каучук синтетический маслонаполненный бутадиен-стирольный в пластиковой упаковке', cost: 226460, category: "иное", description:"Каучук синтетический бутадиен-стирольный, получаемый совместной полимеризацией бутадиена со стиролом  в эмульсии, наполненный маслом TDAE\n", PICTURE_URL: "https://shop.sibur.ru/upload/iblock/6c1/8gutizyyrllgd5xndvn2ptsx0uybr3y6.webp", amount: 10},
]

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для логирования запросов
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (['POST','PUT','PATCH'].includes(req.method)) {
            console.log('Body:', req.body);
        }
    });
    next();
});

// fix функция теперь ищет продукт
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
app.post("/api/products", (req, res) => {

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
app.get("/api/products", (req, res) => {
    res.json(products);
});

/////////////////////////////////////////////////////////
// GET /api/products/:id
/////////////////////////////////////////////////////////
app.get("/api/products/:id", (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (!product) return;
    res.json(product);
});

/////////////////////////////////////////////////////////
// PATCH /api/products/:id
/////////////////////////////////////////////////////////
app.patch("/api/products/:id", (req, res) => {

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
app.delete("/api/products/:id", (req, res) => {

    const exists = products.some(p => p.id === req.params.id);
    if (!exists)
        return res.status(404).json({ error: "Product not found" });

    products = products.filter(p => p.id !== req.params.id);

    res.status(204).send();
});

// 404 для всех остальных маршрутов
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// add обработчик необработанных Promise-ошибок
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});