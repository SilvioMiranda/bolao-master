import express, { Request, Response } from 'express';
import QRCode from 'qrcode';
import db from '../database';
import { Group, GroupParticipant, LotteryType } from '../types';

const router = express.Router();

// Get all groups with summary
router.get('/', (req: Request, res: Response) => {
    const query = `
    SELECT 
      g.*,
      COUNT(DISTINCT gp.participant_id) as participant_count,
      SUM(CASE WHEN gp.paid = 1 THEN 1 ELSE 0 END) as paid_count,
      COUNT(gp.id) as total_participants
    FROM groups g
    LEFT JOIN group_participants gp ON g.id = gp.group_id
    GROUP BY g.id
    ORDER BY g.draw_date DESC
  `;

    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get group by ID with participants
router.get('/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    db.get('SELECT * FROM groups WHERE id = ?', [id], (err, group: Group) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        // Get participants for this group
        const participantsQuery = `
      SELECT 
        gp.*,
        p.name,
        p.phone
      FROM group_participants gp
      JOIN participants p ON gp.participant_id = p.id
      WHERE gp.group_id = ?
      ORDER BY p.name
    `;

        db.all(participantsQuery, [id], (err, participants: any[]) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            // Convert SQLite 0/1 to proper boolean
            const formattedParticipants = participants.map(p => ({
                ...p,
                paid: Boolean(p.paid)
            }));
            res.json({ ...group, participants: formattedParticipants });
        });
    });
});

// Create new group
router.post('/', (req: Request, res: Response) => {
    const { name, lottery_type, draw_date, total_quotas, quota_value, pix_key } = req.body;

    if (!name || !lottery_type || !draw_date || !total_quotas || !quota_value || !pix_key) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (!['mega-sena', 'lotofacil', 'quina', 'lotomania', 'dupla-sena'].includes(lottery_type)) {
        return res.status(400).json({ error: 'Tipo de loteria inválido' });
    }

    db.run(
        'INSERT INTO groups (name, lottery_type, draw_date, total_quotas, quota_value, pix_key) VALUES (?, ?, ?, ?, ?, ?)',
        [name, lottery_type, draw_date, total_quotas, quota_value, pix_key],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
                id: this.lastID,
                name,
                lottery_type,
                draw_date,
                total_quotas,
                quota_value,
                pix_key
            });
        }
    );
});

// Update group
router.put('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, lottery_type, draw_date, total_quotas, quota_value, pix_key } = req.body;

    // Check current allocated quotas
    db.get(
        'SELECT SUM(quota_quantity) as total_allocated FROM group_participants WHERE group_id = ?',
        [id],
        (err, result: any) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const allocated_quotas = result?.total_allocated || 0;

            // Validate that new total_quotas is not less than allocated
            if (total_quotas < allocated_quotas) {
                return res.status(400).json({
                    error: `Não é possível reduzir o total de cotas para ${total_quotas}. Já existem ${allocated_quotas} cotas alocadas.`
                });
            }

            db.run(
                'UPDATE groups SET name = ?, lottery_type = ?, draw_date = ?, total_quotas = ?, quota_value = ?, pix_key = ? WHERE id = ?',
                [name, lottery_type, draw_date, total_quotas, quota_value, pix_key, id],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    if (this.changes === 0) {
                        return res.status(404).json({ error: 'Grupo não encontrado' });
                    }
                    res.json({ message: 'Grupo atualizado com sucesso' });
                }
            );
        }
    );
});

// Delete group
router.delete('/:id', (req: Request, res: Response) => {
    const { id } = req.params;

    db.run('DELETE FROM groups WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }
        res.json({ message: 'Grupo excluído com sucesso' });
    });
});

// Add participant to group
router.post('/:id/participants', (req: Request, res: Response) => {
    const { id } = req.params;
    const { participant_id, quota_quantity, people_per_quota } = req.body;

    if (!participant_id || !quota_quantity || !people_per_quota) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (quota_quantity <= 0 || people_per_quota <= 0) {
        return res.status(400).json({ error: 'Quantidade de cotas e pessoas devem ser maiores que zero' });
    }

    // Get group to calculate individual value and check quota limit
    db.get('SELECT quota_value, total_quotas FROM groups WHERE id = ?', [id], (err, group: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        // Check current total quotas allocated
        db.get(
            'SELECT SUM(quota_quantity) as total_allocated FROM group_participants WHERE group_id = ?',
            [id],
            (err, result: any) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                const current_allocated = result?.total_allocated || 0;
                const new_total = current_allocated + quota_quantity;

                if (new_total > group.total_quotas) {
                    return res.status(400).json({
                        error: `Limite de cotas excedido. Disponível: ${group.total_quotas - current_allocated} cotas. Solicitado: ${quota_quantity} cotas.`
                    });
                }

                const individual_value = (group.quota_value * quota_quantity) / people_per_quota;

                db.run(
                    'INSERT INTO group_participants (group_id, participant_id, quota_quantity, people_per_quota, individual_value) VALUES (?, ?, ?, ?, ?)',
                    [id, participant_id, quota_quantity, people_per_quota, individual_value],
                    function (err) {
                        if (err) {
                            if (err.message.includes('UNIQUE constraint failed')) {
                                return res.status(400).json({ error: 'Participante já está neste grupo' });
                            }
                            return res.status(500).json({ error: err.message });
                        }
                        res.status(201).json({
                            id: this.lastID,
                            group_id: id,
                            participant_id,
                            quota_quantity,
                            people_per_quota,
                            individual_value
                        });
                    }
                );
            }
        );
    });
});

// Update participant quota in group
router.put('/:id/participants/:participantId', (req: Request, res: Response) => {
    const { id, participantId } = req.params;
    const { quota_quantity, people_per_quota } = req.body;

    if (quota_quantity <= 0 || people_per_quota <= 0) {
        return res.status(400).json({ error: 'Quantidade de cotas e pessoas devem ser maiores que zero' });
    }

    // Get group to calculate individual value and check quota limit
    db.get('SELECT quota_value, total_quotas FROM groups WHERE id = ?', [id], (err, group: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        // Get current participant quota
        db.get(
            'SELECT quota_quantity FROM group_participants WHERE group_id = ? AND participant_id = ?',
            [id, participantId],
            (err, currentParticipant: any) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (!currentParticipant) {
                    return res.status(404).json({ error: 'Participante não encontrado neste grupo' });
                }

                // Check total quotas allocated (excluding current participant)
                db.get(
                    'SELECT SUM(quota_quantity) as total_allocated FROM group_participants WHERE group_id = ? AND participant_id != ?',
                    [id, participantId],
                    (err, result: any) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }

                        const other_allocated = result?.total_allocated || 0;
                        const new_total = other_allocated + quota_quantity;

                        if (new_total > group.total_quotas) {
                            return res.status(400).json({
                                error: `Limite de cotas excedido. Disponível: ${group.total_quotas - other_allocated} cotas. Solicitado: ${quota_quantity} cotas.`
                            });
                        }

                        const individual_value = (group.quota_value * quota_quantity) / people_per_quota;

                        db.run(
                            'UPDATE group_participants SET quota_quantity = ?, people_per_quota = ?, individual_value = ? WHERE group_id = ? AND participant_id = ?',
                            [quota_quantity, people_per_quota, individual_value, id, participantId],
                            function (err) {
                                if (err) {
                                    return res.status(500).json({ error: err.message });
                                }
                                res.json({ message: 'Cota atualizada com sucesso' });
                            }
                        );
                    }
                );
            }
        );
    });
});

// Remove participant from group
router.delete('/:id/participants/:participantId', (req: Request, res: Response) => {
    const { id, participantId } = req.params;

    db.run(
        'DELETE FROM group_participants WHERE group_id = ? AND participant_id = ?',
        [id, participantId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Participante não encontrado neste grupo' });
            }
            res.json({ message: 'Participante removido do grupo' });
        }
    );
});

// Generate PIX QR Code for group
router.get('/:id/qrcode', async (req: Request, res: Response) => {
    const { id } = req.params;

    db.get('SELECT pix_key, name, quota_value FROM groups WHERE id = ?', [id], async (err, group: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        try {
            // Generate PIX payload (simplified - for production use proper PIX format)
            const pixPayload = group.pix_key;
            const qrCodeDataURL = await QRCode.toDataURL(pixPayload);

            res.json({
                qrcode: qrCodeDataURL,
                pix_key: group.pix_key,
                amount: group.quota_value
            });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao gerar QR Code' });
        }
    });
});

export default router;
