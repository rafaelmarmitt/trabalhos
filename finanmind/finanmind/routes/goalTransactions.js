const express = require('express');
const router = express.Router();
const db = require('../config/database.js');
const authenticateToken = require('../middleware/auth');

// Registrar transação para uma meta
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { goal_id, amount, description, date } = req.body;

    // Primeiro atualiza a meta
    db.query(
        'UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?',
        [amount, goal_id, userId],
        (err, results) => {
            if (err) {
                console.error('Erro ao atualizar meta:', err);
                return res.status(500).json({ error: 'Erro ao atualizar meta' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Meta não encontrada' });
            }

            // Agora registra a transação da meta
            db.query(
                'INSERT INTO goal_transactions (user_id, goal_id, amount, description, date) VALUES (?, ?, ?, ?, ?)',
                [userId, goal_id, amount, description, date],
                (err, transactionResults) => {
                    if (err) {
                        console.error('Erro ao registrar transação:', err);
                        return res.status(500).json({ error: 'Erro ao registrar transação' });
                    }

                    // Buscar a meta atualizada
                    db.query('SELECT * FROM goals WHERE id = ?', [goal_id], (err, goalResults) => {
                        if (err) {
                            return res.status(500).json({ error: 'Erro ao buscar meta atualizada' });
                        }
                        
                        res.status(201).json({
                            message: 'Valor adicionado com sucesso',
                            goal: goalResults[0],
                            transaction_id: transactionResults.insertId
                        });
                    });
                }
            );
        }
    );
});

// Buscar transações de uma meta
router.get('/goal/:goal_id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const goalId = req.params.goal_id;

    db.query(
        'SELECT * FROM goal_transactions WHERE user_id = ? AND goal_id = ? ORDER BY date DESC, created_at DESC',
        [userId, goalId],
        (err, results) => {
            if (err) {
                console.error('Erro ao buscar transações:', err);
                return res.status(500).json({ error: 'Erro ao buscar transações' });
            }
            res.json(results);
        }
    );
});

// Gerar relatório de transações de metas
router.get('/report/:goal_id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const goalId = req.params.goal_id;

    db.query(
        `SELECT gt.*, g.title as goal_title 
         FROM goal_transactions gt 
         JOIN goals g ON gt.goal_id = g.id 
         WHERE gt.user_id = ? AND gt.goal_id = ? 
         ORDER BY gt.date DESC, gt.created_at DESC`,
        [userId, goalId],
        (err, results) => {
            if (err) {
                console.error('Erro ao gerar relatório:', err);
                return res.status(500).json({ error: 'Erro ao gerar relatório' });
            }

            // Calcular totais
            const totalAdded = results.reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
            
            res.json({
                transactions: results,
                summary: {
                    total_transactions: results.length,
                    total_amount: totalAdded,
                    average_per_transaction: results.length > 0 ? totalAdded / results.length : 0
                }
            });
        }
    );
});

module.exports = router;