const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Função para formatar a data para o formato YYYY-MM-DD
const formatDateForSQL = (date) => date.toISOString().slice(0, 10);

// Rota principal para buscar dados dos relatórios
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { period = 'current_month' } = req.query;

    let startDate, endDate;
    const today = new Date();
    
    // Define o intervalo de datas com base no período selecionado
    switch (period) {
        case 'last30':
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            break;
        case 'last_month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'current_year':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
        case 'current_month':
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
    }

    const formattedStartDate = formatDateForSQL(startDate);
    const formattedEndDate = formatDateForSQL(endDate);

    // Múltiplas queries para buscar todos os dados necessários
    const summaryQuery = `
        SELECT 
            COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.date BETWEEN ? AND ?;
    `;

    const incomeExpenseQuery = `
        SELECT 
            DATE_FORMAT(t.date, '%Y-%m') as month,
            COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.date BETWEEN ? AND ?
        GROUP BY month
        ORDER BY month;
    `;

    const expenseDistributionQuery = `
        SELECT c.name as category, COALESCE(SUM(t.amount), 0) as total
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND c.type = 'expense' AND t.date BETWEEN ? AND ?
        GROUP BY category
        HAVING total > 0
        ORDER BY total DESC;
    `;

    // Executa todas as queries em paralelo
    db.query(summaryQuery, [userId, formattedStartDate, formattedEndDate], (err, summaryResults) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor ao buscar resumo.' });

        db.query(incomeExpenseQuery, [userId, formattedStartDate, formattedEndDate], (err, incomeExpenseResults) => {
            if (err) return res.status(500).json({ error: 'Erro no servidor ao buscar histórico.' });

            db.query(expenseDistributionQuery, [userId, formattedStartDate, formattedEndDate], (err, expenseDistributionResults) => {
                if (err) return res.status(500).json({ error: 'Erro no servidor ao buscar distribuição.' });

                const summary = {
                    income: summaryResults[0].income,
                    expense: summaryResults[0].expense,
                    balance: summaryResults[0].income - summaryResults[0].expense
                };

                const incomeExpense = {
                    labels: incomeExpenseResults.map(item => new Date(item.month + '-02').toLocaleString('pt-BR', { month: 'short' })),
                    incomeData: incomeExpenseResults.map(item => item.income),
                    expenseData: incomeExpenseResults.map(item => item.expense)
                };

                const expenseDistribution = {
                    labels: expenseDistributionResults.map(item => item.category),
                    data: expenseDistributionResults.map(item => item.total)
                };

                res.json({
                    summary,
                    incomeExpense,
                    expenseDistribution
                });
            });
        });
    });
});

module.exports = router;
