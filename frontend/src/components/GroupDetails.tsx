import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGroup, getParticipants, addParticipantToGroup, removeParticipantFromGroup, getGroupQRCode, updateGroup } from '../services/api';
import { Group, Participant, QRCodeResponse } from '../types';

export default function GroupDetails() {
    const { id } = useParams<{ id: string }>();
    const [group, setGroup] = useState<Group | null>(null);
    const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
    const [qrCode, setQrCode] = useState<QRCodeResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState({
        participant_id: 0,
        quota_quantity: 1,
        people_per_quota: 1
    });
    const [editFormData, setEditFormData] = useState<{
        name: string;
        lottery_type: 'mega-sena' | 'lotofacil' | 'quina' | 'lotomania' | 'dupla-sena';
        draw_date: string;
        total_quotas: number;
        quota_value: number;
        pix_key: string;
    }>({
        name: '',
        lottery_type: 'mega-sena',
        draw_date: '',
        total_quotas: 0,
        quota_value: 0,
        pix_key: ''
    });

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        try {
            const [groupRes, participantsRes, qrRes] = await Promise.all([
                getGroup(parseInt(id!)),
                getParticipants(),
                getGroupQRCode(parseInt(id!))
            ]);
            setGroup(groupRes.data);
            setAllParticipants(participantsRes.data);
            setQrCode(qrRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados do grupo');
        } finally {
            setLoading(false);
        }
    };

    const handleAddParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addParticipantToGroup(parseInt(id!), formData);
            setShowAddModal(false);
            setFormData({ participant_id: 0, quota_quantity: 1, people_per_quota: 1 });
            loadData();
        } catch (error: any) {
            console.error('Erro ao adicionar participante:', error);
            alert(error.response?.data?.error || 'Erro ao adicionar participante');
        }
    };

    const handleRemoveParticipant = async (participantId: number) => {
        if (!confirm('Tem certeza que deseja remover este participante?')) return;

        try {
            await removeParticipantFromGroup(parseInt(id!), participantId);
            loadData();
        } catch (error) {
            console.error('Erro ao remover participante:', error);
            alert('Erro ao remover participante');
        }
    };

    const handleEditGroup = () => {
        if (group) {
            setEditFormData({
                name: group.name,
                lottery_type: group.lottery_type,
                draw_date: group.draw_date,
                total_quotas: group.total_quotas,
                quota_value: group.quota_value,
                pix_key: group.pix_key
            });
            setShowEditModal(true);
        }
    };

    const handleUpdateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateGroup(parseInt(id!), editFormData);
            setShowEditModal(false);
            loadData();
        } catch (error: any) {
            console.error('Erro ao atualizar grupo:', error);
            alert(error.response?.data?.error || 'Erro ao atualizar grupo');
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

    const availableParticipants = allParticipants.filter(
        p => !group.participants?.some(gp => gp.participant_id === p.id)
    );

    // Calculate available quotas
    const allocatedQuotas = group.participants?.reduce((sum, gp) => sum + gp.quota_quantity, 0) || 0;
    const availableQuotas = group.total_quotas - allocatedQuotas;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Link to="/groups" className="text-muted" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
                    ← Voltar para Grupos
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-sm)' }}>
                    <h1>{group.name}</h1>
                    <button className="btn btn-secondary btn-sm" onClick={handleEditGroup}>
                        ✏️ Editar Grupo
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <span className="badge badge-primary">
                        {group.lottery_type === 'mega-sena' ? 'Mega-Sena' : 'Lotofácil'}
                    </span>
                    <span className={`badge badge-${group.status === 'finalized' ? 'success' :
                        group.status === 'checked' ? 'primary' :
                            group.status === 'closed' ? 'secondary' : 'warning'
                        }`}>
                        {group.status === 'open' ? 'Aberto' :
                            group.status === 'closed' ? 'Fechado' :
                                group.status === 'checked' ? 'Conferido' : 'Finalizado'}
                    </span>
                </div>
            </div>

            <div className="grid grid-2 mb-4">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📋 Informações do Grupo</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Data do Sorteio</div>
                                <div style={{ fontWeight: '600' }}>
                                    {new Date(group.draw_date).toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total de Cotas</div>
                                <div style={{ fontWeight: '600' }}>{group.total_quotas}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Cotas Disponíveis</div>
                                <div style={{ fontWeight: '600', color: availableQuotas > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {availableQuotas} de {group.total_quotas}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Valor por Cota</div>
                                <div style={{ fontWeight: '600' }}>R$ {group.quota_value.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Chave PIX</div>
                                <div style={{ fontWeight: '600', wordBreak: 'break-all' }}>{group.pix_key}</div>
                            </div>
                            {group.prize_amount > 0 && (
                                <div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Prêmio</div>
                                    <div style={{ fontWeight: '600', color: 'var(--success)' }}>
                                        R$ {group.prize_amount.toFixed(2)}
                                    </div>
                                </div>
                            )}
                            {group.admin_fee_value > 0 && (
                                <div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Taxa Admin</div>
                                    <div style={{ fontWeight: '600' }}>
                                        {group.admin_fee_type === 'percentage'
                                            ? `${group.admin_fee_value}%`
                                            : `R$ ${group.admin_fee_value.toFixed(2)}`}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">💳 QR Code PIX</h3>
                    </div>
                    <div className="card-body text-center">
                        {qrCode && (
                            <>
                                <img
                                    src={qrCode.qrcode}
                                    alt="QR Code PIX"
                                    style={{ maxWidth: '200px', borderRadius: 'var(--radius-md)' }}
                                />
                                <p className="text-muted mt-2" style={{ fontSize: '0.875rem' }}>
                                    Valor: R$ {qrCode.amount.toFixed(2)}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="card mb-4">
                <div className="card-header">
                    <h3 className="card-title">👥 Participantes ({group.participants?.length || 0})</h3>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowAddModal(true)}
                        disabled={availableQuotas === 0}
                    >
                        + Adicionar Participante
                    </button>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Cotas</th>
                                <th>Pessoas/Cota</th>
                                <th>Valor Individual</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!group.participants || group.participants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-muted">
                                        Nenhum participante adicionado
                                    </td>
                                </tr>
                            ) : (
                                group.participants.map(gp => (
                                    <tr key={gp.id}>
                                        <td>{gp.name}</td>
                                        <td>{gp.phone}</td>
                                        <td>{gp.quota_quantity}</td>
                                        <td>{gp.people_per_quota}</td>
                                        <td>R$ {gp.individual_value.toFixed(2)}</td>
                                        <td>
                                            {gp.paid ? (
                                                <span className="badge badge-success">Pago</span>
                                            ) : (
                                                <span className="badge badge-warning">Pendente</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleRemoveParticipant(gp.participant_id)}
                                            >
                                                Remover
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <Link to={`/groups/${id}/payments`} className="btn btn-primary">
                    💰 Gerenciar Pagamentos
                </Link>
                <Link to={`/groups/${id}/games`} className="btn btn-primary">
                    🎯 Conferir Jogos
                </Link>
                <Link to={`/groups/${id}/prizes`} className="btn btn-primary">
                    🏆 Gerenciar Prêmios
                </Link>
            </div>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Adicionar Participante</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleAddParticipant}>
                            <div className="modal-body">
                                {availableQuotas === 0 ? (
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'hsla(348, 83%, 47%, 0.1)',
                                        border: '1px solid var(--danger)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--spacing-md)'
                                    }}>
                                        <strong style={{ color: 'var(--danger)' }}>⚠️ Todas as cotas foram alocadas!</strong>
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                                            Não há cotas disponíveis para adicionar novos participantes.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'hsla(142, 71%, 45%, 0.1)',
                                        border: '1px solid var(--success)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--spacing-md)'
                                    }}>
                                        <strong style={{ color: 'var(--success)' }}>✓ Cotas disponíveis: {availableQuotas}</strong>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Participante</label>
                                    <select
                                        className="form-select"
                                        value={formData.participant_id}
                                        onChange={(e) => setFormData({ ...formData, participant_id: parseInt(e.target.value) })}
                                        required
                                        disabled={availableQuotas === 0}
                                    >
                                        <option value={0}>Selecione...</option>
                                        {availableParticipants.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} - {p.phone}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Quantidade de Cotas (máx: {availableQuotas})
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        max={availableQuotas}
                                        value={formData.quota_quantity}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (value <= availableQuotas) {
                                                setFormData({ ...formData, quota_quantity: value });
                                            }
                                        }}
                                        required
                                        disabled={availableQuotas === 0}
                                    />
                                    {formData.quota_quantity > availableQuotas && (
                                        <small style={{ color: 'var(--danger)', display: 'block', marginTop: '0.25rem' }}>
                                            ⚠️ Valor excede as cotas disponíveis ({availableQuotas})
                                        </small>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Pessoas por Cota</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        value={formData.people_per_quota}
                                        onChange={(e) => setFormData({ ...formData, people_per_quota: parseInt(e.target.value) })}
                                        required
                                        disabled={availableQuotas === 0}
                                    />
                                    <small className="text-muted">
                                        Valor individual: R$ {((group.quota_value * formData.quota_quantity) / formData.people_per_quota).toFixed(2)}
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={availableQuotas === 0 || formData.quota_quantity > availableQuotas}
                                >
                                    Adicionar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Editar Grupo</h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdateGroup}>
                            <div className="modal-body">
                                {editFormData.total_quotas < allocatedQuotas && (
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        background: 'hsla(348, 83%, 47%, 0.1)',
                                        border: '1px solid var(--danger)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--spacing-md)'
                                    }}>
                                        <strong style={{ color: 'var(--danger)' }}>⚠️ Atenção!</strong>
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                                            Você não pode reduzir o total de cotas para menos de {allocatedQuotas} (cotas já alocadas).
                                        </p>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Nome do Grupo</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tipo de Loteria</label>
                                    <select
                                        className="form-select"
                                        value={editFormData.lottery_type}
                                        onChange={(e) => setEditFormData({ ...editFormData, lottery_type: e.target.value as any })}
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
                                        value={editFormData.draw_date}
                                        onChange={(e) => setEditFormData({ ...editFormData, draw_date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Total de Cotas (mín: {allocatedQuotas} já alocadas)
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min={allocatedQuotas}
                                        value={editFormData.total_quotas}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (value >= allocatedQuotas) {
                                                setEditFormData({ ...editFormData, total_quotas: value });
                                            }
                                        }}
                                        required
                                    />
                                    <small className="text-muted">
                                        Cotas alocadas: {allocatedQuotas} | Disponíveis após alteração: {Math.max(0, editFormData.total_quotas - allocatedQuotas)}
                                    </small>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Valor por Cota (R$)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        step="0.01"
                                        min="0.01"
                                        value={editFormData.quota_value}
                                        onChange={(e) => setEditFormData({ ...editFormData, quota_value: parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Chave PIX</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editFormData.pix_key}
                                        onChange={(e) => setEditFormData({ ...editFormData, pix_key: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={editFormData.total_quotas < allocatedQuotas}
                                >
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
