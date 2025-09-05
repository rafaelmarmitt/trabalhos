const express = require('express');
const router = express.Router();
const db = require('../config/database.js');
const authenticateToken = require('../middleware/auth');

// Buscar todas as transações do usuário
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { startDate, endDate, type, category } = req.query;

    let query = `
        SELECT t.*, c.name as category_name, c.type as category_type 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id 
        WHERE t.user_id = ?
    `;
    let params = [userId];

    if (startDate && endDate) {
        query += ' AND t.date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    if (type) {
        query += ' AND c.type = ?';
        params.push(type);
    }

    if (category) {
        query += ' AND t.category_id = ?';
        params.push(category);
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Erro ao buscar transações:', err);
            return res.status(500).json({ error: 'Erro ao buscar transações' });
        }
        res.json(results);
    });
});

// Criar nova transação
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { description, category_id, amount, type, date } = req.body;

    db.query(
        'INSERT INTO transactions (user_id, category_id, description, amount, type, date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, category_id, description, amount, type, date],
        (err, results) => {
            if (err) {
                console.error('Erro ao criar transação:', err);
                return res.status(500).json({ error: 'Erro ao criar transação' });
            }

            // Buscar a transação criada com informações da categoria
            db.query(`
                SELECT t.*, c.name as category_name, c.type as category_type 
                FROM transactions t 
                JOIN categories c ON t.category_id = c.id 
                WHERE t.id = ?
            `, [results.insertId], (err, transactionResults) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar transação criada' });
                }
                res.status(201).json(transactionResults[0]);
            });
        }
    );
});

// Atualizar transação
router.put('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const transactionId = req.params.id;
    const { description, category_id, amount, type, date } = req.body;

    db.query(
        'UPDATE transactions SET description = ?, category_id = ?, amount = ?, type = ?, date = ? WHERE id = ? AND user_id = ?',
        [description, category_id, amount, type, date, transactionId, userId],
        (err, results) => {
            if (err) {
                console.error('Erro ao atualizar transação:', err);
                return res.status(500).json({ error: 'Erro ao atualizar transação' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Transação não encontrada' });
            }

            // Buscar a transação atualizada
            db.query(`
                SELECT t.*, c.name as category_name, c.type as category_type 
                FROM transactions t 
                JOIN categories c ON t.category_id = c.id 
                WHERE t.id = ?
            `, [transactionId], (err, transactionResults) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar transação atualizada' });
                }
                res.json(transactionResults[0]);
            });
        }
    );
});

// Deletar transação
router.delete('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const transactionId = req.params.id;

    db.query(
        'DELETE FROM transactions WHERE id = ? AND user_id = ?',
        [transactionId, userId],
        (err, results) => {
            if (err) {
                console.error('Erro ao deletar transação:', err);
                return res.status(500).json({ error: 'Erro ao deletar transação' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Transação não encontrada' });
            }

            res.json({ message: 'Transação deletada com sucesso' });
        }
    );
});

module.exports = router;