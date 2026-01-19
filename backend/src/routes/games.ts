import express, { Request, Response } from 'express';
import db from '../database';
import { validateNumbers } from '../config/lotteryTypes';
import { BetMatch, Group } from '../types';

const router = express.Router();

// Helper function to recalculate all matches for a group
const recalculateMatches = (groupId: string, callback: (err?: Error) => void) => {
    // Get the latest result
    db.get(
        'SELECT * FROM draw_results WHERE group_id = ? ORDER BY draw_date DESC LIMIT 1',
        [groupId],
        (err, result: any) => {
            if (err) return callback(err);
            if (!result) return callback(); // No result to recalculate

            const resultNumbers = JSON.parse(result.result_numbers);

            // Get all bets for this group
            db.all('SELECT * FROM bets WHERE group_id = ?', [groupId], (err, bets: any[]) => {
                if (err) return callback(err);

                // Calculate matches for all bets
                const matches: BetMatch[] = bets.map(bet => {
                    const betNumbers = JSON.parse(bet.numbers);
                    const matchedNumbers = betNumbers.filter((num: number) => resultNumbers.includes(num));

                    return {
                        bet_id: bet.id,
                        matched_numbers: matchedNumbers,
                        match_count: matchedNumbers.length
                    };
                });

                // Update the result with recalculated matches
                db.run(
                    'UPDATE draw_results SET matches = ? WHERE id = ?',
                    [JSON.stringify(matches), result.id],
                    callback
                );
            });
        }
    );
};

// Register bet numbers for a group
router.post('/:groupId/bets', (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { numbers } = req.body;

    if (!numbers || !Array.isArray(numbers)) {
        return res.status(400).json({ error: 'Números da aposta são obrigatórios' });
    }

    // Get group to validate lottery type
    db.get('SELECT lottery_type FROM groups WHERE id = ?', [groupId], (err, group: Group) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        // Validate numbers
        const validation = validateNumbers(group.lottery_type, numbers);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Store bet
        db.run(
            'INSERT INTO bets (group_id, numbers) VALUES (?, ?)',
            [groupId, JSON.stringify(numbers)],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                const betId = this.lastID;

                // Check if there's already a result for this group
                db.get(
                    'SELECT * FROM draw_results WHERE group_id = ? ORDER BY draw_date DESC LIMIT 1',
                    [groupId],
                    (err, result: any) => {
                        if (err) {
                            console.error('Error checking for existing result:', err);
                            return res.status(201).json({
                                id: betId,
                                group_id: groupId,
                                numbers
                            });
                        }

                        // If result exists, recalculate matches
                        if (result) {
                            const resultNumbers = JSON.parse(result.result_numbers);
                            const matchedNumbers = numbers.filter((num: number) => resultNumbers.includes(num));
                            const newMatch = {
                                bet_id: betId,
                                matched_numbers: matchedNumbers,
                                match_count: matchedNumbers.length
                            };

                            // Get existing matches and add the new one
                            const existingMatches = JSON.parse(result.matches);
                            existingMatches.push(newMatch);

                            // Update the result with new matches
                            db.run(
                                'UPDATE draw_results SET matches = ? WHERE id = ?',
                                [JSON.stringify(existingMatches), result.id],
                                (err) => {
                                    if (err) {
                                        console.error('Error updating matches:', err);
                                    }
                                    res.status(201).json({
                                        id: betId,
                                        group_id: groupId,
                                        numbers,
                                        auto_checked: true,
                                        match_count: matchedNumbers.length
                                    });
                                }
                            );
                        } else {
                            // No result yet, just return the bet
                            res.status(201).json({
                                id: betId,
                                group_id: groupId,
                                numbers
                            });
                        }
                    }
                );
            }
        );
    });
});

// Register draw results and auto-check matches
router.post('/:groupId/results', (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { result_numbers } = req.body;

    if (!result_numbers || !Array.isArray(result_numbers)) {
        return res.status(400).json({ error: 'Números do resultado são obrigatórios' });
    }

    // Get group to validate lottery type
    db.get('SELECT lottery_type FROM groups WHERE id = ?', [groupId], (err, group: Group) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        // Validate numbers
        const validation = validateNumbers(group.lottery_type, result_numbers);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Get all bets for this group
        db.all('SELECT * FROM bets WHERE group_id = ?', [groupId], (err, bets: any[]) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Calculate matches
            const matches: BetMatch[] = bets.map(bet => {
                const betNumbers = JSON.parse(bet.numbers);
                const matchedNumbers = betNumbers.filter((num: number) => result_numbers.includes(num));

                return {
                    bet_id: bet.id,
                    matched_numbers: matchedNumbers,
                    match_count: matchedNumbers.length
                };
            });

            // Store result with matches
            db.run(
                'INSERT INTO draw_results (group_id, result_numbers, matches) VALUES (?, ?, ?)',
                [groupId, JSON.stringify(result_numbers), JSON.stringify(matches)],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.status(201).json({
                        id: this.lastID,
                        group_id: groupId,
                        result_numbers,
                        matches
                    });
                }
            );
        });
    });
});

// Get all bets for a group
router.get('/:groupId/bets', (req: Request, res: Response) => {
    const { groupId } = req.params;

    db.all('SELECT * FROM bets WHERE group_id = ? ORDER BY created_at DESC', [groupId], (err, bets: any[]) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const betsWithNumbers = bets.map(bet => ({
            ...bet,
            numbers: JSON.parse(bet.numbers)
        }));

        res.json(betsWithNumbers);
    });
});

// Update a bet
router.put('/:groupId/bets/:betId', (req: Request, res: Response) => {
    const { groupId, betId } = req.params;
    const { numbers } = req.body;

    if (!numbers || !Array.isArray(numbers)) {
        return res.status(400).json({ error: 'Números da aposta são obrigatórios' });
    }

    // Get group to validate lottery type
    db.get('SELECT lottery_type FROM groups WHERE id = ?', [groupId], (err, group: Group) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!group) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }

        // Validate numbers
        const validation = validateNumbers(group.lottery_type, numbers);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Update bet
        db.run(
            'UPDATE bets SET numbers = ? WHERE id = ? AND group_id = ?',
            [JSON.stringify(numbers), betId, groupId],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Aposta não encontrada' });
                }

                // Recalculate matches if result exists
                recalculateMatches(groupId, (err) => {
                    if (err) {
                        console.error('Error recalculating matches:', err);
                    }
                    res.json({ message: 'Aposta atualizada com sucesso', id: betId, numbers });
                });
            }
        );
    });
});

// Delete a bet
router.delete('/:groupId/bets/:betId', (req: Request, res: Response) => {
    const { groupId, betId } = req.params;

    db.run('DELETE FROM bets WHERE id = ? AND group_id = ?', [betId, groupId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Aposta não encontrada' });
        }

        // Recalculate matches if result exists
        recalculateMatches(groupId, (err) => {
            if (err) {
                console.error('Error recalculating matches:', err);
            }
            res.json({ message: 'Aposta excluída com sucesso' });
        });
    });
});

// Get match results for a group
router.get('/:groupId/check', (req: Request, res: Response) => {
    const { groupId } = req.params;

    const query = `
    SELECT 
      dr.*,
      g.lottery_type,
      g.name as group_name
    FROM draw_results dr
    JOIN groups g ON dr.group_id = g.id
    WHERE dr.group_id = ?
    ORDER BY dr.draw_date DESC
    LIMIT 1
  `;

    db.get(query, [groupId], (err, result: any) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!result) {
            return res.status(404).json({ error: 'Nenhum resultado encontrado para este grupo' });
        }

        // Get all bets for context
        db.all('SELECT * FROM bets WHERE group_id = ?', [groupId], (err, bets: any[]) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const betsWithNumbers = bets.map(bet => ({
                ...bet,
                numbers: JSON.parse(bet.numbers)
            }));

            res.json({
                ...result,
                result_numbers: JSON.parse(result.result_numbers),
                matches: JSON.parse(result.matches),
                bets: betsWithNumbers
            });
        });
    });
});

export default router;
