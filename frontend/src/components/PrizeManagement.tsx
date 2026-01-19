import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    getGroup,
    updateGroupStatus,
    updateAdminFee,
    calculatePrize,
    getPrizeDistribution,
    getWhatsAppReport
} from '../services/api';
import { Group, GroupStatus, PrizeDistributionDetail } from '../types';

const STATUS_LABELS: Record<GroupStatus, string> = {
    'open': 'Aberto',
    'closed': 'Fechado',
    'checked': 'Conferido',
    'finalized': 'Finalizado'
};

const STATUS_NEXT: Record<GroupStatus, GroupStatus | null> = {
    'open': 'closed',
    'closed': 'checked',
    'checked': 'finalized',
    'finalized': null
};

export default function PrizeManagement() {
    const { id } = useParams<{ id: string }>();
    const [group, setGroup] = useState<Group | null>(null);
    const [distributions, setDistributions] = useState<PrizeDistributionDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Admin Fee Form (always percentage)
    const [adminFeeValue, setAdminFeeValue] = useState(0);

    // Prize Calculation Form
    const [prizeAmount, setPrizeAmount] = useState(0);

    // WhatsApp Report
    const [report, setReport] = useState('');
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        try {
            const groupRes = await getGroup(parseInt(id!));
            setGroup(groupRes.data);
            setAdminFeeValue(groupRes.data.admin_fee_value);
            setPrizeAmount(groupRes.data.prize_amount);

            // Load distributions if prize is calculated
            if (groupRes.data.prize_amount > 0) {
                const distRes = await getPrizeDistribution(parseInt(id!));
                setDistributions(distRes.data);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados do grupo');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async () => {
        if (!group) return;

        const nextStatus = STATUS_NEXT[group.status];
        if (!nextStatus) {
            alert('Este grupo já está finalizado');
            return;
        }

        if (!confirm(`Deseja alterar o status para "${STATUS_LABELS[nextStatus]}"?`)) {
            return;
        }

        setProcessing(true);
        try {
            await updateGroupStatus(parseInt(id!), nextStatus);
            alert('Status atualizado com sucesso!');
            loadData();
        } catch (error: any) {
            console.error('Erro ao atualizar status:', error);
            alert(error.response?.data?.error || 'Erro ao atualizar status');
        } finally {
            setProcessing(false);
        }
    };

    const handleAdminFeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await updateAdminFee(parseInt(id!), {
                admin_fee_type: 'percentage', // Always percentage
                admin_fee_value: adminFeeValue
            });
            alert('Taxa de administração configurada com sucesso!');
            loadData();
        } catch (error: any) {
            console.error('Erro ao configurar taxa:', error);
            alert(error.response?.data?.error || 'Erro ao configurar taxa');
        } finally {
            setProcessing(false);
        }
    };

    const handleCalculatePrize = async (e: React.FormEvent) => {
        e.preventDefault();

        if (prizeAmount <= 0) {
            alert('Informe um valor de prêmio válido');
            return;
        }

        if (!confirm(`Calcular distribuição do prêmio de R$ ${prizeAmount.toFixed(2)}?`)) {
            return;
        }

        setProcessing(true);
        try {
            await calculatePrize(parseInt(id!), prizeAmount);
            alert('Prêmio calculado com sucesso!');
            // loadData() will fetch the updated distributions
            loadData();
        } catch (error: any) {
            console.error('Erro ao calcular prêmio:', error);
            alert(error.response?.data?.error || 'Erro ao calcular prêmio');
        } finally {
            setProcessing(false);
        }
    };

    const handleGenerateReport = async () => {
        setProcessing(true);
        try {
            const result = await getWhatsAppReport(parseInt(id!));
            setReport(result.data.report);
            setShowReport(true);
        } catch (error: any) {
            console.error('Erro ao gerar relatório:', error);
            alert(error.response?.data?.error || 'Erro ao gerar relatório');
        } finally {
            setProcessing(false);
        }
    };

    const handleCopyReport = () => {
        navigator.clipboard.writeText(report);
        alert('Relatório copiado para a área de transferência!');
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

    const nextStatus = STATUS_NEXT[group.status];
    // Always calculate as percentage
    const adminFee = prizeAmount * (adminFeeValue / 100);
    const netPrize = prizeAmount - adminFee;

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Link to={`/groups/${id}`} className="text-muted" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
                    ← Voltar para Detalhes do Grupo
                </Link>
                <h1 style={{ marginTop: 'var(--spacing-sm)' }}>🏆 Gerenciar Prêmios</h1>
                <p className="text-muted">{group.name}</p>
            </div>

            {/* Status Card */}
            <div className="card mb-4">
                <div className="card-header">
                    <h3 className="card-title">📊 Status do Grupo</h3>
                </div>
                <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                Status Atual
                            </div>
                            <span className={`badge badge-${group.status === 'finalized' ? 'success' : group.status === 'checked' ? 'primary' : 'warning'}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                                {STATUS_LABELS[group.status]}
                            </span>
                        </div>
                        {nextStatus && (
                            <button
                                className="btn btn-primary"
                                onClick={handleStatusChange}
                                disabled={processing}
                            >
                                Avançar para: {STATUS_LABELS[nextStatus]}
                            </button>
                        )}
                    </div>
                    <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <small className="text-muted">
                            <strong>Workflow:</strong> Aberto → Fechado → Conferido → Finalizado
                        </small>
                    </div>
                </div>
            </div>

            {/* Admin Fee Configuration */}
            <div className="card mb-4">
                <div className="card-header">
                    <h3 className="card-title">💼 Taxa de Administração</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleAdminFeeSubmit}>
                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label className="form-label">Taxa de Administração (%)</label>
                            <input
                                type="number"
                                className="form-input"
                                min="0"
                                max="100"
                                step="0.01"
                                value={adminFeeValue}
                                onChange={(e) => setAdminFeeValue(parseFloat(e.target.value))}
                                placeholder="Ex: 10 para 10%"
                            />
                            <small className="text-muted">
                                Percentual a ser descontado do prêmio total
                            </small>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            Salvar Configuração
                        </button>
                    </form>
                </div>
            </div>

            {/* Prize Calculation */}
            <div className="card mb-4">
                <div className="card-header">
                    <h3 className="card-title">💰 Cálculo do Prêmio</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleCalculatePrize}>
                        <div className="form-group">
                            <label className="form-label">Valor do Prêmio (R$)</label>
                            <input
                                type="number"
                                className="form-input"
                                min="0"
                                step="0.01"
                                value={prizeAmount}
                                onChange={(e) => setPrizeAmount(parseFloat(e.target.value))}
                                placeholder="0.00"
                            />
                        </div>

                        {prizeAmount > 0 && (
                            <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Prêmio Total</div>
                                        <div style={{ fontWeight: '600', color: 'var(--primary-light)' }}>
                                            R$ {prizeAmount.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Taxa Admin</div>
                                        <div style={{ fontWeight: '600', color: 'var(--warning)' }}>
                                            R$ {adminFee.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Prêmio Líquido</div>
                                        <div style={{ fontWeight: '600', color: 'var(--success)' }}>
                                            R$ {netPrize.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary" disabled={processing || prizeAmount <= 0}>
                            Calcular Distribuição
                        </button>
                    </form>
                </div>
            </div>

            {/* Prize Distribution */}
            {distributions.length > 0 && (
                <div className="card mb-4">
                    <div className="card-header">
                        <h3 className="card-title">💵 Distribuição do Prêmio</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Participante</th>
                                    <th>Telefone</th>
                                    <th>Fração (%)</th>
                                    <th>Valor a Receber</th>
                                </tr>
                            </thead>
                            <tbody>
                                {distributions.map(dist => (
                                    <tr key={dist.id}>
                                        <td>{dist.name}</td>
                                        <td>{dist.phone}</td>
                                        <td>{(dist.quota_fraction * 100).toFixed(2)}%</td>
                                        <td style={{ fontWeight: '600', color: 'var(--success)' }}>
                                            R$ {dist.prize_share.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* WhatsApp Report */}
            {group.status === 'checked' || group.status === 'finalized' ? (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">📱 Relatório WhatsApp</h3>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleGenerateReport}
                            disabled={processing}
                        >
                            Gerar Relatório
                        </button>
                    </div>
                    {showReport && (
                        <div className="card-body">
                            <pre style={{
                                background: 'var(--bg-tertiary)',
                                padding: 'var(--spacing-md)',
                                borderRadius: 'var(--radius-md)',
                                whiteSpace: 'pre-wrap',
                                fontSize: '0.875rem',
                                marginBottom: 'var(--spacing-md)'
                            }}>
                                {report}
                            </pre>
                            <button className="btn btn-primary" onClick={handleCopyReport}>
                                📋 Copiar para Área de Transferência
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="card">
                    <div className="card-body text-center text-muted">
                        <p>O relatório WhatsApp estará disponível após o grupo ser marcado como "Conferido"</p>
                    </div>
                </div>
            )}
        </div>
    );
}
