const express = require('express');
const app = express();
const port = 3000;
let tovars = [
    {id: 1, title: 'кирпич'
        , cost: 16},
    {id: 2, title: 'окно'
        , cost: 0.18},
    {id: 3, title: 'булка сдобная, с маком'
        , cost: 200},
]
// Middleware для парсинга JSON
app.use(express.json());
// Главная страница
app.get('/'
    , (req, res) => {
        res.send('Главная страница');
    });
// CRUD
app.post('/tovars'
    , (req, res) => {
        const { title, cost } = req.body;
        const newTovar = {
            id: Date.now(),
            title,
            cost
        };
        tovars.push(newTovar);
        res.status(201).json(newTovar);
    });
app.get('/tovars'
    , (req, res) => {
        res.send(JSON.stringify(tovars));
    });
app.get('/tovars/:id'
    , (req, res) => {
        let tovar = tovars.find(u => u.id == req.params.id);
        res.send(JSON.stringify(tovar));
    });
app.patch('/tovars/:id'
    , (req, res) => {
        // Таким образом в примере реализованы все CRUD (Create, Read, Update, Delete)
        // операции.
        const tovar = tovars.find(u => u.id == req.params.id);
        const { title, cost } = req.body;
        if (title !== undefined) tovar.title = title;
        if (cost !== undefined) tovar.cost = cost;
        res.json(tovar);
    });
app.delete('/tovars/:id'
    , (req, res) => {
        tovars = tovars.filter(u => u.id != req.params.id);
        res.send('Ok');
    });
// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
