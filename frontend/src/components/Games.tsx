import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGroup, createBet, createDrawResult, getGameResults, getBets, updateBet, deleteBet } from '../services/api';
import { Group, DrawResult, Bet } from '../types';

const LOTTERY_CONFIG: Record<string, { name: string; count: number; min: number; max: number }> = {
    'mega-sena': { name: 'Mega-Sena', count: 6, min: 1, max: 60 },
    'lotofacil': { name: 'Lotofácil', count: 15, min: 1, max: 25 },
    'quina': { name: 'Quina', count: 5, min: 1, max: 80 },
    'lotomania': { name: 'Lotomania', count: 50, min: 0, max: 99 },
    'dupla-sena': { name: 'Dupla Sena', count: 6, min: 1, max: 50 }
};

export default function Games() {
    const { id } = useParams<{ id: string }>();
    const [group, setGroup] = useState<Group | null>(null);
    const [results, setResults] = useState<DrawResult | null>(null);
    const [bets, setBets] = useState<Bet[]>([]);
    const [loading, setLoading] = useState(true);
    const [betNumbers, setBetNumbers] = useState<string>('');
    const [resultNumbers, setResultNumbers] = useState<string>('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingBet, setEditingBet] = useState<Bet | null>(null);
    const [editBetNumbers, setEditBetNumbers] = useState<string>('');

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        try {
            const groupRes = await getGroup(parseInt(id!));
            setGroup(groupRes.data);

            // Load bets
            try {
                const betsRes = await getBets(parseInt(id!));
                console.log('Apostas carregadas:', betsRes.data);
                setBets(betsRes.data);
            } catch (error: any) {
                console.error('Erro ao carregar apostas:', error);
                setBets([]); // Set empty array on error
            }

            // Load results
            try {
                const resultsRes = await getGameResults(parseInt(id!));
                setResults(resultsRes.data);
            } catch (error: any) {
                if (error.response?.status !== 404) {
                    console.error('Erro ao carregar resultados:', error);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados do grupo');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitBet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!group) return;

        const numbers = betNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        const config = LOTTERY_CONFIG[group.lottery_type];

        if (numbers.length !== config.count) {
            alert(`${config.name} requer exatamente ${config.count} números`);
            return;
        }

        if (numbers.some(n => n < config.min || n > config.max)) {
            alert(`Números devem estar entre ${config.min} e ${config.max}`);
            return;
        }

        try {
            await createBet(parseInt(id!), numbers);
            setBetNumbers('');
            // Reload data to show the new bet
            await loadData();
            alert('Aposta cadastrada com sucesso!');
        } catch (error: any) {
            console.error('Erro ao cadastrar aposta:', error);
            alert(error.response?.data?.error || 'Erro ao cadastrar aposta');
        }
    };

    const handleSubmitResult = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!group) return;

        const numbers = resultNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        const config = LOTTERY_CONFIG[group.lottery_type];

        if (numbers.length !== config.count) {
            alert(`${config.name} requer exatamente ${config.count} números`);
            return;
        }

        if (numbers.some(n => n < config.min || n > config.max)) {
            alert(`Números devem estar entre ${config.min} e ${config.max}`);
            return;
        }

        try {
            await createDrawResult(parseInt(id!), numbers);
            setResultNumbers('');
            alert('Resultado cadastrado e conferência realizada!');
            loadData();
        } catch (error: any) {
            console.error('Erro ao cadastrar resultado:', error);
            alert(error.response?.data?.error || 'Erro ao cadastrar resultado');
        }
    };

    const handleEditBet = (bet: Bet) => {
        setEditingBet(bet);
        setEditBetNumbers(bet.numbers.join(', '));
        setShowEditModal(true);
    };

    const handleUpdateBet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!group || !editingBet) return;

        const numbers = editBetNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        const config = LOTTERY_CONFIG[group.lottery_type];

        if (numbers.length !== config.count) {
            alert(`${config.name} requer exatamente ${config.count} números`);
            return;
        }

        if (numbers.some(n => n < config.min || n > config.max)) {
            alert(`Números devem estar entre ${config.min} e ${config.max}`);
            return;
        }

        try {
            await updateBet(parseInt(id!), editingBet.id, numbers);
            setShowEditModal(false);
            setEditingBet(null);
            setEditBetNumbers('');
            alert('Aposta atualizada com sucesso!');
            loadData();
        } catch (error: any) {
            console.error('Erro ao atualizar aposta:', error);
            alert(error.response?.data?.error || 'Erro ao atualizar aposta');
        }
    };

    const handleDeleteBet = async (betId: number) => {
        if (!confirm('Tem certeza que deseja excluir esta aposta?')) return;

        try {
            await deleteBet(parseInt(id!), betId);
            alert('Aposta excluída com sucesso!');
            loadData();
        } catch (error: any) {
            console.error('Erro ao excluir aposta:', error);
            alert(error.response?.data?.error || 'Erro ao excluir aposta');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!group) {
        return <div className="text-center text-muted">Grupo não encontrado</div>;
    }

    const config = LOTTERY_CONFIG[group.lottery_type];

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Link to={`/groups/${id}`} className="text-muted" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
                    ← Voltar para Detalhes do Grupo
                </Link>
                <h1 style={{ marginTop: 'var(--spacing-sm)' }}>Conferência de Jogos</h1>
                <p className="text-muted">{group.name} - {config.name}</p>
            </div>

            <div className="grid grid-2 mb-4">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">🎲 Cadastrar Aposta</h3>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmitBet}>
                            <div className="form-group">
                                <label className="form-label">
                                    Números da Aposta ({config.count} números de {config.min} a {config.max})
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={betNumbers}
                                    onChange={(e) => setBetNumbers(e.target.value)}
                                    placeholder="Ex: 1, 5, 12, 23, 34, 45"
                                    required
                                />
                                <small className="text-muted">
                                    Separe os números por vírgula
                                </small>
                            </div>
                            <button type="submit" className="btn btn-primary">
                                Cadastrar Aposta
                            </button>
                        </form>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">🎯 Cadastrar Resultado</h3>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmitResult}>
                            <div className="form-group">
                                <label className="form-label">
                                    Números Sorteados ({config.count} números)
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={resultNumbers}
                                    onChange={(e) => setResultNumbers(e.target.value)}
                                    placeholder="Ex: 3, 8, 15, 27, 41, 52"
                                    required
                                />
                                <small className="text-muted">
                                    Separe os números por vírgula
                                </small>
                            </div>
                            <button type="submit" className="btn btn-success">
                                Cadastrar e Conferir
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Apostas Cadastradas - Sempre visível */}
            {bets.length > 0 && (
                <div className="card mb-4">
                    <div className="card-header">
                        <h3 className="card-title">📋 Apostas Cadastradas ({bets.length})</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Aposta #</th>
                                    <th>Números</th>
                                    <th>Data</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bets.map((bet, idx) => (
                                    <tr key={bet.id}>
                                        <td>#{idx + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {bet.numbers.map((num, numIdx) => (
                                                    <span
                                                        key={numIdx}
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '4px 8px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            background: 'var(--bg-tertiary)',
                                                            color: 'var(--text-primary)',
                                                            fontSize: '0.875rem',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        {num}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>{new Date(bet.created_at).toLocaleString('pt-BR')}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleEditBet(bet)}
                                                >
                                                    ✏️ Editar
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDeleteBet(bet.id)}
                                                >
                                                    🗑️ Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {results && (
                <>
                    <div className="card mb-4">
                        <div className="card-header">
                            <h3 className="card-title">🏆 Resultado do Sorteio</h3>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                {results.result_numbers.map((num, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.25rem',
                                            fontWeight: '700',
                                            color: 'white',
                                            boxShadow: '0 4px 12px hsla(262, 83%, 58%, 0.3)'
                                        }}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                            <p className="text-muted mt-3" style={{ fontSize: '0.875rem' }}>
                                Sorteio realizado em: {new Date(results.draw_date).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">📊 Conferência de Apostas</h3>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Aposta #</th>
                                        <th>Números Apostados</th>
                                        <th>Acertos</th>
                                        <th>Números Acertados</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!results.bets || results.bets.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center text-muted">
                                                Nenhuma aposta cadastrada
                                            </td>
                                        </tr>
                                    ) : (
                                        results.bets.map((bet, idx) => {
                                            const match = results.matches.find(m => m.bet_id === bet.id);
                                            const matchCount = match?.match_count || 0;

                                            return (
                                                <tr key={bet.id}>
                                                    <td>#{idx + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                            {bet.numbers.map((num, numIdx) => {
                                                                const isMatch = match?.matched_numbers.includes(num);
                                                                return (
                                                                    <span
                                                                        key={numIdx}
                                                                        style={{
                                                                            display: 'inline-block',
                                                                            padding: '4px 8px',
                                                                            borderRadius: 'var(--radius-sm)',
                                                                            background: isMatch ? 'var(--success)' : 'var(--bg-tertiary)',
                                                                            color: isMatch ? 'white' : 'var(--text-primary)',
                                                                            fontSize: '0.875rem',
                                                                            fontWeight: '600'
                                                                        }}
                                                                    >
                                                                        {num}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`badge ${matchCount >= 4 ? 'badge-success' :
                                                                matchCount >= 2 ? 'badge-warning' :
                                                                    'badge-danger'
                                                                }`}
                                                            style={{ fontSize: '1rem' }}
                                                        >
                                                            {matchCount} {matchCount === 1 ? 'acerto' : 'acertos'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {match && match.matched_numbers.length > 0 ? (
                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                {match.matched_numbers.map((num, numIdx) => (
                                                                    <span
                                                                        key={numIdx}
                                                                        style={{
                                                                            display: 'inline-block',
                                                                            padding: '4px 8px',
                                                                            borderRadius: 'var(--radius-sm)',
                                                                            background: 'var(--success)',
                                                                            color: 'white',
                                                                            fontSize: '0.875rem',
                                                                            fontWeight: '600'
                                                                        }}
                                                                    >
                                                                        {num}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {!results && (
                <div className="card text-center">
                    <div className="card-body">
                        <p className="text-muted">
                            Nenhum resultado cadastrado ainda. Cadastre as apostas e o resultado do sorteio para realizar a conferência automática.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Aposta */}
            {showEditModal && editingBet && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Editar Aposta</h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdateBet}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">
                                        Números da Aposta ({config.count} números de {config.min} a {config.max})
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editBetNumbers}
                                        onChange={(e) => setEditBetNumbers(e.target.value)}
                                        placeholder="Ex: 1, 5, 12, 23, 34, 45"
                                        required
                                    />
                                    <small className="text-muted">
                                        Separe os números por vírgula
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
