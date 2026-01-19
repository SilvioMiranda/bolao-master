import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './database';
import { runMigrations } from './migrations';
import participantsRouter from './routes/participants';
import groupsRouter from './routes/groups';
import paymentsRouter from './routes/payments';
import gamesRouter from './routes/games';
import prizesRouter from './routes/prizes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/participants', participantsRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/prizes', prizesRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Bolão API is running' });
});

// Initialize database and start server
initializeDatabase()
    .then(() => runMigrations())
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });

export default app;
