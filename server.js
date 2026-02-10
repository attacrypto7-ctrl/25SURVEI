const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./db/connect');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'survei25-secret-key-2025',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/surveys', require('./routes/surveys'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/results', require('./routes/results'));

// SPA fallback — serve index.html for non-API, non-file routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/vote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'vote.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Start server only if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Survei 25 running at http://localhost:${PORT}`);
        console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
    });
}

module.exports = app;
