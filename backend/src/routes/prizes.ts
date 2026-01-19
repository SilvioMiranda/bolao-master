import express, { Request, Response } from 'express';
import db from '../database';
import { GroupStatus, PrizeDistributionDetail, PrizeCalculationResult } from '../types';

const router = express.Router();

// Update group status
router.patch('/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body as { status: GroupStatus };

    if (!status || !['open', 'closed', 'checked', 'finalized'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }

    // Get current group to validate transition
    db.get('SELECT * FROM groups WHERE id = ?', [id], (err, group: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        const currentStatus = group.status || 'open';

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            'open': ['closed'],
            'closed': ['checked'],
            'checked': ['finalized'],
            'finalized': []
        };

        if (!validTransitions[currentStatus]?.includes(status)) {
            return res.status(400).json({
                error: `Transição inválida de ${currentStatus} para ${status}`
            });
        }

        // Additional validations
        if (status === 'checked') {
            // Check if draw result exists
            db.get('SELECT id FROM draw_results WHERE group_id = ?', [id], (err, result) => {
                if (err || !result) {
                    return res.status(400).json({
                        error: 'Não é possível marcar como conferido sem resultado cadastrado'
                    });
                }
                updateStatus();
            });
        } else if (status === 'finalized') {
            // Check if prize distribution exists
            db.get('SELECT id FROM prize_distributions WHERE group_id = ?', [id], (err, dist) => {
                if (err || !dist) {
                    return res.status(400).json({
                        error: 'Não é possível finalizar sem calcular a distribuição do prêmio'
                    });
                }
                updateStatus();
            });
        } else {
            updateStatus();
        }

        function updateStatus() {
            db.run('UPDATE groups SET status = ? WHERE id = ?', [status, id], function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Status atualizado com sucesso', status });
            });
        }
    });
});

// Update admin fee configuration
router.patch('/:id/admin-fee', (req: Request, res: Response) => {
    const { id } = req.params;
    const { admin_fee_type, admin_fee_value } = req.body;

    if (!admin_fee_type || !['percentage', 'fixed'].includes(admin_fee_type)) {
        return res.status(400).json({ error: 'Tipo de taxa inválido' });
    }

    if (admin_fee_value === undefined || admin_fee_value < 0) {
        return res.status(400).json({ error: 'Valor de taxa inválido' });
    }

    db.run(
        'UPDATE groups SET admin_fee_type = ?, admin_fee_value = ? WHERE id = ?',
        [admin_fee_type, admin_fee_value, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Grupo não encontrado' });
            }
            res.json({
                message: 'Taxa de administração configurada',
                admin_fee_type,
                admin_fee_value
            });
        }
    );
});

// Calculate prize distribution
router.post('/:id/calculate-prize', (req: Request, res: Response) => {
    const { id } = req.params;
    const { prize_amount } = req.body;

    if (!prize_amount || prize_amount <= 0) {
        return res.status(400).json({ error: 'Valor do prêmio inválido' });
    }

    // Get group info
    db.get('SELECT * FROM groups WHERE id = ?', [id], (err, group: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        // Calculate admin fee
        let admin_fee = 0;
        if (group.admin_fee_type === 'percentage') {
            admin_fee = prize_amount * (group.admin_fee_value / 100);
        } else {
            admin_fee = group.admin_fee_value;
        }

        const net_prize = prize_amount - admin_fee;

        // Get all participants and their contributions
        const query = `
            SELECT 
                gp.participant_id,
                gp.individual_value,
                p.name,
                p.phone
            FROM group_participants gp
            JOIN participants p ON gp.participant_id = p.id
            WHERE gp.group_id = ?
        `;

        db.all(query, [id], (err, participants: any[]) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Calculate total collected
            const total_collected = participants.reduce((sum, p) => sum + p.individual_value, 0);

            if (total_collected === 0) {
                return res.status(400).json({ error: 'Nenhum participante no grupo' });
            }

            // Calculate distributions
            const distributions: PrizeDistributionDetail[] = participants.map(p => {
                const quota_fraction = p.individual_value / total_collected;
                const prize_share = net_prize * quota_fraction;

                return {
                    id: 0, // Will be set by database
                    group_id: parseInt(id),
                    participant_id: p.participant_id,
                    quota_fraction,
                    prize_share,
                    paid_out: false,
                    payout_date: null,
                    name: p.name,
                    phone: p.phone,
                    created_at: new Date().toISOString()
                };
            });

            // Delete existing distributions for this group
            db.run('DELETE FROM prize_distributions WHERE group_id = ?', [id], (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Insert new distributions
                const stmt = db.prepare(
                    'INSERT INTO prize_distributions (group_id, participant_id, quota_fraction, prize_share) VALUES (?, ?, ?, ?)'
                );

                distributions.forEach(d => {
                    stmt.run(d.group_id, d.participant_id, d.quota_fraction, d.prize_share);
                });

                stmt.finalize((err) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    // Update group with prize amount and status
                    db.run(
                        'UPDATE groups SET prize_amount = ?, status = ? WHERE id = ?',
                        [prize_amount, 'checked', id],
                        (err) => {
                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }

                            const result: PrizeCalculationResult = {
                                prize_amount,
                                admin_fee,
                                net_prize,
                                distributions
                            };

                            res.json(result);
                        }
                    );
                });
            });
        });
    });
});

// Get prize distribution for a group
router.get('/:id/distribution', (req: Request, res: Response) => {
    const { id } = req.params;

    const query = `
        SELECT 
            pd.*,
            p.name,
            p.phone
        FROM prize_distributions pd
        JOIN participants p ON pd.participant_id = p.id
        WHERE pd.group_id = ?
        ORDER BY pd.prize_share DESC
    `;

    db.all(query, [id], (err, rows: PrizeDistributionDetail[]) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Generate WhatsApp report
router.get('/:id/whatsapp-report', (req: Request, res: Response) => {
    const { id } = req.params;

    // Get group info
    db.get('SELECT * FROM groups WHERE id = ?', [id], (err, group: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        // Get draw result
        db.get(
            'SELECT * FROM draw_results WHERE group_id = ?',
            [id],
            (err, drawResult: any) => {
                if (err || !drawResult) {
                    return res.status(404).json({ error: 'Resultado não encontrado' });
                }

                const result_numbers = JSON.parse(drawResult.result_numbers);
                const matches = JSON.parse(drawResult.matches || '[]');

                // Get prize distributions
                const distQuery = `
                    SELECT 
                        pd.*,
                        p.name
                    FROM prize_distributions pd
                    JOIN participants p ON pd.participant_id = p.id
                    WHERE pd.group_id = ?
                    ORDER BY pd.prize_share DESC
                `;

                db.all(distQuery, [id], (err, distributions: any[]) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    // Get bets
                    db.all('SELECT * FROM bets WHERE group_id = ?', [id], (err, bets: any[]) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }

                        // Build report
                        const lotteryName = group.lottery_type === 'mega-sena' ? 'Mega-Sena' : 'Lotofácil';
                        const drawDate = new Date(group.draw_date).toLocaleDateString('pt-BR');

                        let report = `🎰 RESULTADO DO BOLÃO - ${group.name}\n\n`;
                        report += `📅 Sorteio: ${drawDate}\n`;
                        report += `🎲 Tipo: ${lotteryName}\n\n`;

                        report += `🏆 NÚMEROS SORTEADOS\n`;
                        report += result_numbers.map((n: number) => `[${n.toString().padStart(2, '0')}]`).join(' ');
                        report += `\n\n`;

                        if (bets.length > 0) {
                            report += `✅ APOSTAS E ACERTOS\n`;
                            bets.forEach((bet, idx) => {
                                const betNumbers = JSON.parse(bet.numbers);
                                const match = matches.find((m: any) => m.bet_id === bet.id);
                                const matchCount = match?.match_count || 0;
                                report += `Aposta #${idx + 1}: ${matchCount} ${matchCount === 1 ? 'acerto' : 'acertos'}\n`;
                            });
                            report += `\n`;
                        }

                        if (group.prize_amount > 0) {
                            const admin_fee = group.admin_fee_type === 'percentage'
                                ? group.prize_amount * (group.admin_fee_value / 100)
                                : group.admin_fee_value;
                            const net_prize = group.prize_amount - admin_fee;

                            report += `💰 PREMIAÇÃO\n`;
                            report += `Valor Total: R$ ${group.prize_amount.toFixed(2)}\n`;
                            if (admin_fee > 0) {
                                const feeLabel = group.admin_fee_type === 'percentage'
                                    ? `${group.admin_fee_value}%`
                                    : `R$ ${group.admin_fee_value.toFixed(2)}`;
                                report += `Taxa Organização: R$ ${admin_fee.toFixed(2)} (${feeLabel})\n`;
                            }
                            report += `Prêmio Líquido: R$ ${net_prize.toFixed(2)}\n\n`;

                            if (distributions.length > 0) {
                                report += `💵 DISTRIBUIÇÃO POR PARTICIPANTE\n`;
                                distributions.forEach(d => {
                                    const percentage = (d.quota_fraction * 100).toFixed(1);
                                    report += `• ${d.name}: R$ ${d.prize_share.toFixed(2)} (${percentage}%)\n`;
                                });
                                report += `\n`;
                            }
                        }

                        report += `✨ Parabéns aos ganhadores!`;

                        res.json({ report });
                    });
                });
            }
        );
    });
});

export default router;
