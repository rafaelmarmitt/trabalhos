-- Criar banco de dados
CREATE DATABASE finanmind;
USE finanmind;

-- Tabela de usuários
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de categorias
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type ENUM('income', 'expense', 'investment') NOT NULL,
    color VARCHAR(7) DEFAULT '#637381',
    icon VARCHAR(50) DEFAULT 'fas fa-question'
);

-- Inserir categorias padrão
INSERT INTO categories (name, type, color, icon) VALUES
('Salário', 'income', '#36b37e', 'fas fa-money-bill-wave'),
('Freelance', 'income', '#36b37e', 'fas fa-laptop-code'),
('Investimentos', 'income', '#36b37e', 'fas fa-chart-line'),
('Outras receitas', 'income', '#36b37e', 'fas fa-hand-holding-usd'),
('Moradia', 'expense', '#ff5630', 'fas fa-home'),
('Alimentação', 'expense', '#ff5630', 'fas fa-utensils'),
('Transporte', 'expense', '#ff5630', 'fas fa-bus'),
('Saúde', 'expense', '#ff5630', 'fas fa-heartbeat'),
('Lazer', 'expense', '#ff5630', 'fas fa-gamepad'),
('Educação', 'expense', '#ff5630', 'fas fa-graduation-cap'),
('Compras', 'expense', '#ff5630', 'fas fa-shopping-bag'),
('Outras despesas', 'expense', '#ff5630', 'fas fa-wallet'),
('Ações', 'investment', '#7e6cca', 'fas fa-chart-line'),
('Fundos Imobiliários', 'investment', '#7e6cca', 'fas fa-building'),
('Tesouro Direto', 'investment', '#7e6cca', 'fas fa-landmark'),
('Poupança', 'investment', '#7e6cca', 'fas fa-piggy-bank'),
('Criptomoedas', 'investment', '#7e6cca', 'fas fa-coins'),
('Outros investimentos', 'investment', '#7e6cca', 'fas fa-chart-pie');

-- Tabela de transações
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    description VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type ENUM('income', 'expense', 'investment') NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Tabela de metas financeiras
CREATE TABLE goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    target_amount DECIMAL(10, 2) NOT NULL,
    current_amount DECIMAL(10, 2) DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela de orçamentos
CREATE TABLE budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    month date NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE KEY unique_budget (user_id, category_id, month)
);