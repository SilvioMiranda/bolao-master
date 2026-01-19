import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import db from '../database';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens (JPEG, PNG) e PDF são permitidos'));
        }
    }
});

// Mark quota as paid
router.post('/mark-paid', (req: Request, res: Response) => {
    const { group_id, participant_id, paid } = req.body;

    console.log('BACKEND mark-paid:', { group_id, participant_id, paid });

    if (group_id === undefined || participant_id === undefined || paid === undefined) {
        return res.status(400).json({ error: 'group_id, participant_id e paid são obrigatórios' });
    }

    const payment_date = paid ? new Date().toISOString() : null;

    console.log('SQL params:', [paid ? 1 : 0, payment_date, group_id, participant_id]);

    db.run(
        'UPDATE group_participants SET paid = ?, payment_date = ? WHERE group_id = ? AND participant_id = ?',
        [paid ? 1 : 0, payment_date, group_id, participant_id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Participante não encontrado neste grupo' });
            }
            res.json({ message: 'Status de pagamento atualizado com sucesso' });
        }
    );
});

// Upload payment receipt
router.post('/upload-receipt', upload.single('receipt'), (req: Request, res: Response) => {
    const { group_id, participant_id } = req.body;

    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    if (!group_id || !participant_id) {
        return res.status(400).json({ error: 'group_id e participant_id são obrigatórios' });
    }

    const receipt_path = req.file.filename;

    db.run(
        'UPDATE group_participants SET receipt_path = ?, paid = 1, payment_date = ? WHERE group_id = ? AND participant_id = ?',
        [receipt_path, new Date().toISOString(), group_id, participant_id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Participante não encontrado neste grupo' });
            }
            res.json({
                message: 'Comprovante enviado com sucesso',
                receipt_path
            });
        }
    );
});

// Get payment status for a group
router.get('/group/:groupId', (req: Request, res: Response) => {
    const { groupId } = req.params;

    const query = `
    SELECT 
      gp.*,
      p.name,
      p.phone
    FROM group_participants gp
    JOIN participants p ON gp.participant_id = p.id
    WHERE gp.group_id = ?
    ORDER BY p.name ASC
  `;

    db.all(query, [groupId], (err, rows: any[]) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Convert SQLite 0/1 to proper boolean
        const formattedRows = rows.map(row => ({
            ...row,
            paid: Boolean(row.paid)
        }));
        res.json(formattedRows);
    });
});

export default router;
