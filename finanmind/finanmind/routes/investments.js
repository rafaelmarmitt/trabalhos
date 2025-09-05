const express = require('express');
const router = express.Router();
const db = require('../config/database.js');
const authenticateToken = require('../middleware/auth');

// Buscar todos os investimentos do usuário
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const query = `
        SELECT i.*, c.name as category_name 
        FROM transactions i 
        JOIN categories c ON i.category_id = c.id 
        WHERE i.user_id = ? AND i.type = 'investment'
        ORDER BY i.date DESC, i.created_at DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar investimentos:', err);
            return res.status(500).json({ error: 'Erro ao buscar investimentos' });
        }
        res.json(results);
    });
});

// Buscar resumo dos investimentos
router.get('/summary', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const summaryQuery = `
        SELECT 
            COUNT(*) as total_investments,
            SUM(amount) as total_amount,
            c.name as category,
            COUNT(*) as category_count
        FROM transactions i 
        JOIN categories c ON i.category_id = c.id 
        WHERE i.user_id = ? AND i.type = 'investment'
        GROUP BY c.name
        ORDER BY total_amount DESC
    `;
    
    db.query(summaryQuery, [userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar resumo de investimentos:', err);
            return res.status(500).json({ error: 'Erro ao buscar resumo' });
        }
        
        const total = results.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
        const byCategory = results.map(item => ({
            category: item.category,
            amount: parseFloat(item.total_amount),
            count: item.category_count,
            percentage: ((parseFloat(item.total_amount) / total) * 100).toFixed(1)
        }));
        
        res.json({
            total_investments: results.reduce((sum, item) => sum + parseInt(item.category_count), 0),
            total_amount: total,
            by_category: byCategory
        });
    });
});

// Criar novo investimento
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { description, category_id, amount, date } = req.body;

    db.query(
        'INSERT INTO transactions (user_id, category_id, description, amount, type, date) VALUES (?, ?, ?, ?, "investment", ?)',
        [userId, category_id, description, amount, date],
        (err, results) => {
            if (err) {
                console.error('Erro ao criar investimento:', err);
                return res.status(500).json({ error: 'Erro ao criar investimento' });
            }

            // Buscar o investimento criado com informações da categoria
            db.query(`
                SELECT i.*, c.name as category_name 
                FROM transactions i 
                JOIN categories c ON i.category_id = c.id 
                WHERE i.id = ?
            `, [results.insertId], (err, investmentResults) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar investimento criado' });
                }
                res.status(201).json(investmentResults[0]);
            });
        }
    );
});

// Atualizar investimento
router.put('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const investmentId = req.params.id;
    const { description, category_id, amount, date } = req.body;

    db.query(
        'UPDATE transactions SET description = ?, category_id = ?, amount = ?, date = ? WHERE id = ? AND user_id = ? AND type = "investment"',
        [description, category_id, amount, date, investmentId, userId],
        (err, results) => {
            if (err) {
                console.error('Erro ao atualizar investimento:', err);
                return res.status(500).json({ error: 'Erro ao atualizar investimento' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Investimento não encontrado' });
            }

            // Buscar o investimento atualizado
            db.query(`
                SELECT i.*, c.name as category_name 
                FROM transactions i 
                JOIN categories c ON i.category_id = c.id 
                WHERE i.id = ?
            `, [investmentId], (err, investmentResults) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar investimento atualizado' });
                }
                res.json(investmentResults[0]);
            });
        }
    );
});

// Deletar investimento
router.delete('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const investmentId = req.params.id;

    db.query(
        'DELETE FROM transactions WHERE id = ? AND user_id = ? AND type = "investment"',
        [investmentId, userId],
        (err, results) => {
            if (err) {
                console.error('Erro ao deletar investimento:', err);
                return res.status(500).json({ error: 'Erro ao deletar investimento' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Investimento não encontrado' });
            }

            res.json({ message: 'Investimento deletado com sucesso' });
        }
    );
});

module.exports = router;