import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGroups, createGroup, deleteGroup } from '../services/api';
import { Group, LotteryType } from '../types';

export default function Groups() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        lottery_type: 'mega-sena' as LotteryType,
        draw_date: '',
        total_quotas: 1,
        quota_value: 0,
        pix_key: ''
    });

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const response = await getGroups();
            setGroups(response.data);
        } catch (error) {
            console.error('Erro ao carregar grupos:', error);
            alert('Erro ao carregar grupos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createGroup(formData);
            setShowModal(false);
            setFormData({
                name: '',
                lottery_type: 'mega-sena',
                draw_date: '',
                total_quotas: 1,
                quota_value: 0,
                pix_key: ''
            });
            loadGroups();
        } catch (error: any) {
            console.error('Erro ao criar grupo:', error);
            alert(error.response?.data?.error || 'Erro ao criar grupo');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este grupo?')) return;

        try {
            await deleteGroup(id);
            loadGroups();
        } catch (error) {
            console.error('Erro ao excluir grupo:', error);
            alert('Erro ao excluir grupo');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1>Grupos</h1>
                    <p className="text-muted">Gerencie os bolões e suas cotas</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Novo Grupo
                </button>
            </div>

            {groups.length === 0 ? (
                <div className="card text-center">
                    <div className="card-body">
                        <p className="text-muted">Nenhum grupo cadastrado</p>
                        <button className="btn btn-primary mt-3" onClick={() => setShowModal(true)}>
                            Criar Primeiro Grupo
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-2">
                    {groups.map(group => (
                        <div key={group.id} className="card">
                            <div className="card-header">
                                <div>
                                    <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>{group.name}</h3>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                        <span className="badge badge-primary">
                                            {group.lottery_type === 'mega-sena' ? 'Mega-Sena' :
                                                group.lottery_type === 'lotofacil' ? 'Lotofácil' :
                                                    group.lottery_type === 'quina' ? 'Quina' :
                                                        group.lottery_type === 'lotomania' ? 'Lotomania' :
                                                            group.lottery_type === 'dupla-sena' ? 'Dupla Sena' : group.lottery_type}
                                        </span>
                                        <span className={`badge badge-${group.status === 'finalized' ? 'success' :
                                            group.status === 'checked' ? 'primary' :
                                                group.status === 'closed' ? 'secondary' : 'warning'
                                            }`}>
                                            {group.status === 'open' ? 'Aberto' :
                                                group.status === 'closed' ? 'Fechado' :
                                                    group.status === 'checked' ? 'Conferido' : 'Finalizado'}
                                        </span>
                                        {group.prize_amount > 0 && (
                                            <span className="badge badge-success">
                                                🏆 R$ {group.prize_amount.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Data do Sorteio</div>
                                        <div style={{ fontWeight: '600' }}>
                                            {new Date(group.draw_date).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Cotas</div>
                                            <div style={{ fontWeight: '600' }}>{group.total_quotas}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Valor/Cota</div>
                                            <div style={{ fontWeight: '600' }}>
                                                R$ {group.quota_value.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Pagamentos</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: '0.25rem' }}>
                                            <div style={{
                                                flex: 1,
                                                height: '8px',
                                                background: 'var(--bg-tertiary)',
                                                borderRadius: '999px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${group.total_participants ? (group.paid_count || 0) / group.total_participants * 100 : 0}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, var(--success), var(--primary))',
                                                    transition: 'width 0.3s ease'
                                                }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                                {group.paid_count || 0}/{group.total_participants || 0}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
                                        <Link to={`/groups/${group.id}`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                                            Ver Detalhes
                                        </Link>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDelete(group.id)}
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Novo Grupo</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nome do Sorteio</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tipo de Loteria</label>
                                    <select
                                        className="form-select"
                                        value={formData.lottery_type}
                                        onChange={(e) => setFormData({ ...formData, lottery_type: e.target.value as LotteryType })}
                                        required
                                    >
                                        <option value="mega-sena">Mega-Sena</option>
                                        <option value="lotofacil">Lotofácil</option>
                                        <option value="quina">Quina</option>
                                        <option value="lotomania">Lotomania</option>
                                        <option value="dupla-sena">Dupla Sena</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Data do Sorteio</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.draw_date}
                                        onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Quantidade de Cotas</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        value={formData.total_quotas}
                                        onChange={(e) => setFormData({ ...formData, total_quotas: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Valor por Cota (R$)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        step="0.01"
                                        value={formData.quota_value}
                                        onChange={(e) => setFormData({ ...formData, quota_value: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Chave PIX</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.pix_key}
                                        onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                                        placeholder="email@exemplo.com ou CPF"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Criar Grupo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
