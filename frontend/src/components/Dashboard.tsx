import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGroups, getParticipants } from '../services/api';
import { Group, Participant } from '../types';

export default function Dashboard() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [groupsRes, participantsRes] = await Promise.all([
                getGroups(),
                getParticipants()
            ]);
            setGroups(groupsRes.data);
            setParticipants(participantsRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const upcomingDraws = groups
        .filter(g => new Date(g.draw_date) >= new Date())
        .sort((a, b) => new Date(a.draw_date).getTime() - new Date(b.draw_date).getTime())
        .slice(0, 5);

    const totalPaid = groups.reduce((sum, g) => sum + (g.paid_count || 0), 0);
    const totalPending = groups.reduce((sum, g) => sum + ((g.total_participants || 0) - (g.paid_count || 0)), 0);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <h1>Dashboard</h1>
            <p className="text-muted mb-4">Visão geral dos seus bolões</p>

            <div className="grid grid-2 mb-4">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📊 Estatísticas</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>Total de Grupos</div>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                                    {groups.length}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>Participantes</div>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--secondary)' }}>
                                    {participants.length}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>Pagamentos Confirmados</div>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>
                                    {totalPaid}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>Pendentes</div>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--warning)' }}>
                                    {totalPending}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">🎯 Próximos Sorteios</h3>
                    </div>
                    <div className="card-body">
                        {upcomingDraws.length === 0 ? (
                            <p className="text-muted">Nenhum sorteio próximo</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                {upcomingDraws.map(group => (
                                    <Link
                                        key={group.id}
                                        to={`/groups/${group.id}`}
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                    >
                                        <div style={{
                                            padding: 'var(--spacing-md)',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            transition: 'var(--transition)'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>{group.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                        {group.lottery_type === 'mega-sena' ? 'Mega-Sena' : 'Lotofácil'}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                                        {new Date(group.draw_date).toLocaleDateString('pt-BR')}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                        {group.paid_count}/{group.total_participants} pagos
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">🎲 Todos os Grupos</h3>
                    <Link to="/groups" className="btn btn-primary btn-sm">Ver Todos</Link>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th>Data do Sorteio</th>
                                <th>Status</th>
                                <th>Cotas</th>
                                <th>Pagamentos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-muted">
                                        Nenhum grupo cadastrado
                                    </td>
                                </tr>
                            ) : (
                                groups.slice(0, 10).map(group => (
                                    <tr key={group.id}>
                                        <td>
                                            <Link to={`/groups/${group.id}`} style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>
                                                {group.name}
                                            </Link>
                                        </td>
                                        <td>
                                            <span className="badge badge-primary">
                                                {group.lottery_type === 'mega-sena' ? 'Mega-Sena' : 'Lotofácil'}
                                            </span>
                                        </td>
                                        <td>{new Date(group.draw_date).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                            <span className={`badge badge-${group.status === 'finalized' ? 'success' :
                                                    group.status === 'checked' ? 'primary' :
                                                        group.status === 'closed' ? 'secondary' : 'warning'
                                                }`}>
                                                {group.status === 'open' ? 'Aberto' :
                                                    group.status === 'closed' ? 'Fechado' :
                                                        group.status === 'checked' ? 'Conferido' : 'Finalizado'}
                                            </span>
                                            {group.prize_amount > 0 && (
                                                <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                                                    🏆 R$ {group.prize_amount.toFixed(2)}
                                                </span>
                                            )}
                                        </td>
                                        <td>{group.total_quotas}</td>
                                        <td>{group.paid_count || 0}/{group.total_participants || 0}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
