const express = require('express');
const router = express.Router();
const db = require('../config/database.js');
const authenticateToken = require('../middleware/auth');

// Buscar dados para o dashboard
router.get('/data', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { period = 'current_month' } = req.query;

    // Calcular datas com base no período selecionado
    let startDate, endDate;
    const today = new Date();
    
    switch (period) {
        case 'current_month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'last_month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'last_3_months':
            startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        default:
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    const formatDate = (date) => date.toISOString().split('T')[0];

    // Buscar totais por tipo
    const totalsQuery = `
        SELECT 
            type,
            SUM(amount) as total
        FROM transactions 
        WHERE user_id = ? AND date BETWEEN ? AND ?
        GROUP BY type
    `;

    db.query(totalsQuery, [userId, formatDate(startDate), formatDate(endDate)], (err, totalsResults) => {
        if (err) {
            console.error('Erro ao buscar totais:', err);
            return res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
        }

        let income = 0;
        let expense = 0;
        let investment = 0;

        totalsResults.forEach(row => {
            if (row.type === 'income') income = parseFloat(row.total) || 0;
            if (row.type === 'expense') expense = parseFloat(row.total) || 0;
            if (row.type === 'investment') investment = parseFloat(row.total) || 0;
        });

        const balance = income - expense;

        // Buscar transações recentes
        const transactionsQuery = `
            SELECT t.*, c.name as category_name, c.type as category_type 
            FROM transactions t 
            JOIN categories c ON t.category_id = c.id 
            WHERE t.user_id = ? AND t.date BETWEEN ? AND ?
            ORDER BY t.date DESC, t.created_at DESC 
            LIMIT 10
        `;

        db.query(transactionsQuery, [userId, formatDate(startDate), formatDate(endDate)], (err, transactionsResults) => {
            if (err) {
                console.error('Erro ao buscar transações:', err);
                return res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
            }

            // Buscar despesas por categoria
            const categoriesQuery = `
                SELECT 
                    c.name as category,
                    SUM(t.amount) as total
                FROM transactions t
                JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = ? AND t.type = 'expense' AND t.date BETWEEN ? AND ?
                GROUP BY c.name
                ORDER BY total DESC
            `;

            db.query(categoriesQuery, [userId, formatDate(startDate), formatDate(endDate)], (err, categoriesResults) => {
                if (err) {
                    console.error('Erro ao buscar categorias:', err);
                    return res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
                }

                // Buscar histórico de receitas e despesas dos últimos 6 meses
                const historyQuery = `
                    SELECT 
                        DATE_FORMAT(date, '%Y-%m') as month,
                        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
                    FROM transactions 
                    WHERE user_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    GROUP BY DATE_FORMAT(date, '%Y-%m')
                    ORDER BY month
                `;

                db.query(historyQuery, [userId], (err, historyResults) => {
                    if (err) {
                        console.error('Erro ao buscar histórico:', err);
                        return res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
                    }

                    // Preparar dados para os gráficos
                    const categoryLabels = categoriesResults.map(item => item.category);
                    const categoryData = categoriesResults.map(item => parseFloat(item.total) || 0);

                    const monthLabels = historyResults.map(item => {
                        const [year, month] = item.month.split('-');
                        return new Date(year, month - 1).toLocaleString('pt-BR', { month: 'short' });
                    });
                    const incomeData = historyResults.map(item => parseFloat(item.income) || 0);
                    const expenseData = historyResults.map(item => parseFloat(item.expense) || 0);

                    res.json({
                        summary: {
                            income,
                            expense,
                            investment,
                            balance
                        },
                        transactions: transactionsResults,
                        charts: {
                            categories: {
                                labels: categoryLabels,
                                data: categoryData
                            },
                            incomeExpense: {
                                labels: monthLabels,
                                income: incomeData,
                                expense: expenseData
                            }
                        }
                    });
                });
            });
        });
    });
});

module.exports = router;