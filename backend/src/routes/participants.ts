import express, { Request, Response } from 'express';
import db from '../database';
import { Participant } from '../types';

const router = express.Router();

// Get all participants
router.get('/', (req: Request, res: Response) => {
    db.all('SELECT * FROM participants ORDER BY name', (err, rows: Participant[]) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get participant by ID
router.get('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.get('SELECT * FROM participants WHERE id = ?', [id], (err, row: Participant) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Participante não encontrado' });
        }
        res.json(row);
    });
});

// Create new participant
router.post('/', (req: Request, res: Response) => {
    const { phone, name } = req.body;

    if (!phone || !name) {
        return res.status(400).json({ error: 'Telefone e nome são obrigatórios' });
    }

    db.run(
        'INSERT INTO participants (phone, name) VALUES (?, ?)',
        [phone, name],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Telefone já cadastrado' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, phone, name });
        }
    );
});

// Update participant
router.put('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { phone, name } = req.body;

    db.run(
        'UPDATE participants SET phone = ?, name = ? WHERE id = ?',
        [phone, name, id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Telefone já cadastrado' });
                }
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Participante não encontrado' });
            }
            res.json({ message: 'Participante atualizado com sucesso' });
        }
    );
});

// Delete participant
router.delete('/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    db.run('DELETE FROM participants WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Participante não encontrado' });
        }
        res.json({ message: 'Participante excluído com sucesso' });
    });
});

export default router;
