const express = require('express');
const { Pool } = require('pg');

const app = express();

// подключение к БД
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mydatabase',
    password: '453920',
    port: 5432,
});

// чтобы можно было использовать pool в роутерах
app.locals.pool = pool;

app.use(express.json());


const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});