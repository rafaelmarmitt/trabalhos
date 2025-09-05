const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

// --- Rota para buscar dados do perfil do usuário ---
router.get('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    db.query('SELECT id, name, email FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.json(results[0]);
    });
});

// --- Rota para atualizar o perfil do usuário (nome e email) ---
router.put('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }

    db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId], (err, results) => {
        if (err) {
            // Verifica se o erro é de entrada duplicada (email já existe)
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Este email já está em uso.' });
            }
            return res.status(500).json({ error: 'Erro no servidor ao atualizar o perfil.' });
        }
        res.json({ message: 'Perfil atualizado com sucesso!' });
    });
});

// --- Rota para alterar a senha ---
router.put('/password', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    db.query('SELECT password_hash FROM users WHERE id = ?', [userId], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor.' });

        const user = results[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isMatch) {
            return res.status(400).json({ error: 'Senha atual incorreta.' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedNewPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao atualizar a senha.' });
            res.json({ message: 'Senha alterada com sucesso!' });
        });
    });
});

// --- Rota para excluir a conta do usuário ---
router.delete('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    // É uma boa prática usar transações para garantir que todos os dados sejam removidos
    db.beginTransaction(err => {
        if (err) { return res.status(500).json({ error: 'Erro no servidor.' }); }

        // Deleta dados de tabelas relacionadas primeiro
        db.query('DELETE FROM transactions WHERE user_id = ?', [userId], (err) => {
            if (err) { return db.rollback(() => { res.status(500).json({ error: 'Erro ao excluir transações.' }); }); }
            
            db.query('DELETE FROM goals WHERE user_id = ?', [userId], (err) => {
                if (err) { return db.rollback(() => { res.status(500).json({ error: 'Erro ao excluir metas.' }); }); }
                
                // Por fim, deleta o usuário
                db.query('DELETE FROM users WHERE id = ?', [userId], (err, results) => {
                    if (err) { return db.rollback(() => { res.status(500).json({ error: 'Erro ao excluir usuário.' }); }); }

                    db.commit(err => {
                        if (err) { return db.rollback(() => { res.status(500).json({ error: 'Erro ao confirmar a exclusão.' }); }); }
                        res.json({ message: 'Conta excluída com sucesso.' });
                    });
                });
            });
        });
    });
});

module.exports = router;
