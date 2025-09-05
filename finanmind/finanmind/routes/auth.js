const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../config/database.js');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';

// Registrar novo usuário
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verificar se o usuário já existe
        db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Erro no servidor' });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: 'Usuário já existe' });
            }

            // Criptografar a senha
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Inserir novo usuário
            db.query(
                'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
                [name, email, hashedPassword],
                (err, results) => {
                    if (err) {
                        return res.status(500).json({ error: 'Erro ao criar usuário' });
                    }

                    // Gerar token JWT
                    const token = jwt.sign(
                        { userId: results.insertId, email },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    res.status(201).json({
                        message: 'Usuário criado com sucesso',
                        token,
                        user: { id: results.insertId, name, email }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Login de usuário
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Buscar usuário pelo email
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor' });
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }

        const user = results[0];

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login realizado com sucesso',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
    });
});

module.exports = router;