const express = require('express');
const router = express.Router();


// Создание пользователя
router.post('/', async (req, res) => {
    const pool = req.app.locals.pool;
    const { first_name, last_name, age } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, age, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             RETURNING *`,
            [first_name, last_name, age]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// получение пользователей
router.get('/', async (req, res) => {
    const pool = req.app.locals.pool;

    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// получение конкретного пользователя
router.get('/:id', async (req, res) => {
    const pool = req.app.locals.pool;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// UPDATE
router.patch('/:id', async (req, res) => {
    const pool = req.app.locals.pool;
    const { first_name, last_name, age } = req.body;

    try {
        const result = await pool.query(
            `UPDATE users
             SET first_name = $1,
                 last_name = $2,
                 age = $3,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [first_name, last_name, age, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// DELETE
router.delete('/:id', async (req, res) => {
    const pool = req.app.locals.pool;

    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;