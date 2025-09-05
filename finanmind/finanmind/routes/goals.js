const express = require('express');
const router = express.Router();
const db = require('../config/database.js');
const authenticateToken = require('../middleware/auth');

// Buscar todas as metas do usuário
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    db.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, results) => {
        if (err) {
            console.error('Erro ao buscar metas:', err);
            return res.status(500).json({ error: 'Erro ao buscar metas' });
        }
        res.json(results);
    });
});

// Criar nova meta
router.post('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { title, target_amount, current_amount, deadline } = req.body;
    
    db.query(
        'INSERT INTO goals (user_id, title, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?)',
        [userId, title, target_amount, current_amount || 0, deadline],
        (err, results) => {
            if (err) {
                console.error('Erro ao criar meta:', err);
                return res.status(500).json({ error: 'Erro ao criar meta' });
            }
            
            db.query('SELECT * FROM goals WHERE id = ?', [results.insertId], (err, goalResults) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar meta criada' });
                }
                res.status(201).json(goalResults[0]);
            });
        }
    );
});

// Atualizar meta
router.put('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const goalId = req.params.id;
    const { title, target_amount, current_amount, deadline } = req.body;
    
    db.query(
        'UPDATE goals SET title = ?, target_amount = ?, current_amount = ?, deadline = ? WHERE id = ? AND user_id = ?',
        [title, target_amount, current_amount, deadline, goalId, userId],
        (err, results) => {
            if (err) {
                console.error('Erro ao atualizar meta:', err);
                return res.status(500).json({ error: 'Erro ao atualizar meta' });
            }
            
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Meta não encontrada' });
            }
            
            db.query('SELECT * FROM goals WHERE id = ?', [goalId], (err, goalResults) => {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao buscar meta atualizada' });
                }
                res.json(goalResults[0]);
            });
        }
    );
});

// Deletar meta
router.delete('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const goalId = req.params.id;
    
    db.query(
        'DELETE FROM goals WHERE id = ? AND user_id = ?',
        [goalId, userId],
        (err, results) => {
            if (err) {
                console.error('Erro ao deletar meta:', err);
                return res.status(500).json({ error: 'Erro ao deletar meta' });
            }
            
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Meta não encontrada' });
            }
            
            res.json({ message: 'Meta deletada com sucesso' });
        }
    );
});

module.exports = router;