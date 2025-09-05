const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

// --- Rota para BUSCAR todas as categorias ---
// CORREÇÃO: Removido o filtro por user_id para corresponder ao banco de dados.
router.get('/', authenticateToken, (req, res) => {
    const { type } = req.query;
    
    let query = 'SELECT * FROM categories';
    let params = [];
    
    if (type) {
        query += ' WHERE type = ?';
        params.push(type);
    }
    
    query += ' ORDER BY name';
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Erro ao buscar categorias:", err);
            return res.status(500).json({ error: 'Erro ao buscar categorias' });
        }
        res.json(results);
    });
});

// --- Rota para CRIAR uma nova categoria ---
// CORREÇÃO: Removido o user_id do INSERT.
router.post('/', authenticateToken, (req, res) => {
    const { name, type } = req.body;

    if (!name || !type) {
        return res.status(400).json({ error: 'Nome e tipo são obrigatórios.' });
    }

    db.query('INSERT INTO categories (name, type) VALUES (?, ?)', [name, type], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao criar a categoria.' });
        }
        res.status(201).json({ id: results.insertId, name, type });
    });
});

// --- Rota para DELETAR uma categoria ---
// CORREÇÃO: Removido o filtro por user_id do DELETE.
router.delete('/:id', authenticateToken, (req, res) => {
    const categoryId = req.params.id;

    // CUIDADO: Antes de deletar, idealmente você deveria reatribuir ou deletar as transações que usam esta categoria.
    db.query('DELETE FROM categories WHERE id = ?', [categoryId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao deletar a categoria.' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria não encontrada.' });
        }
        res.status(204).send(); // 204 No Content - sucesso sem corpo de resposta
    });
});

module.exports = router;
