import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGroup, getGroupPayments, markPaid, uploadReceipt } from '../services/api';
import { Group, GroupParticipantDetail } from '../types';

export default function Payments() {
    const { id } = useParams<{ id: string }>();
    const [group, setGroup] = useState<Group | null>(null);
    const [payments, setPayments] = useState<GroupParticipantDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingFor, setUploadingFor] = useState<number | null>(null);
    const [processingPayment, setProcessingPayment] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        try {
            // Clear payments first to force unmount/remount
            setPayments([]);

            const [groupRes, paymentsRes] = await Promise.all([
                getGroup(parseInt(id!)),
                getGroupPayments(parseInt(id!))
            ]);

            setGroup(groupRes.data);
            setPayments(paymentsRes.data);
            setRefreshKey(prev => prev + 1); // Force complete re-render
            console.log('Loaded payments:', paymentsRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados de pagamento');
        } finally {
            setLoading(false);
        }
    };


    const handleTogglePaid = async (participantId: number, currentStatus: boolean) => {
        // Prevent concurrent requests
        if (processingPayment !== null) {
            console.log('Already processing a payment, ignoring click');
            return;
        }

        console.log('Toggle paid called with:', { participantId, currentStatus, groupId: id });
        setProcessingPayment(participantId);

        try {
            await markPaid({
                group_id: parseInt(id!),
                participant_id: participantId,
                paid: !currentStatus
            });
            await loadData();
        } catch (error) {
            console.error('Erro ao atualizar pagamento:', error);
            alert('Erro ao atualizar status de pagamento');
        } finally {
            setProcessingPayment(null);
        }
    };


    const handleFileUpload = async (participantId: number, file: File) => {
        setUploadingFor(participantId);
        try {
            await uploadReceipt(parseInt(id!), participantId, file);
            loadData();
            alert('Comprovante enviado com sucesso!');
        } catch (error) {
            console.error('Erro ao enviar comprovante:', error);
            alert('Erro ao enviar comprovante');
        } finally {
            setUploadingFor(null);
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

    const totalPaid = payments.filter(p => p.paid).length;
    const totalAmount = payments.reduce((sum, p) => sum + p.individual_value, 0);
    const paidAmount = payments.filter(p => p.paid).reduce((sum, p) => sum + p.individual_value, 0);

    return (
        <div className="fade-in">
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <Link to={`/groups/${id}`} className="text-muted" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
                    ← Voltar para Detalhes do Grupo
                </Link>
                <h1 style={{ marginTop: 'var(--spacing-sm)' }}>Controle de Pagamentos</h1>
                <p className="text-muted">{group.name}</p>
            </div>

            <div className="grid grid-2 mb-4">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">💰 Resumo Financeiro</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total Arrecadado</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)' }}>
                                    R$ {paidAmount.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total Esperado</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                    R$ {totalAmount.toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Pagos</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                                    {totalPaid}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Pendentes</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--warning)' }}>
                                    {payments.length - totalPaid}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'var(--spacing-lg)' }}>
                            <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 'var(--spacing-xs)' }}>
                                Progresso
                            </div>
                            <div style={{
                                height: '12px',
                                background: 'var(--bg-tertiary)',
                                borderRadius: '999px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${payments.length ? (totalPaid / payments.length * 100) : 0}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, var(--success), var(--primary))',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                            <div className="text-muted text-center mt-1" style={{ fontSize: '0.75rem' }}>
                                {payments.length ? Math.round(totalPaid / payments.length * 100) : 0}% completo
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">💳 Informações de Pagamento</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Chave PIX</div>
                                <div style={{ fontWeight: '600', wordBreak: 'break-all' }}>{group.pix_key}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Valor por Cota</div>
                                <div style={{ fontWeight: '600' }}>R$ {group.quota_value.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">📋 Lista de Pagamentos</h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Participante</th>
                                <th>Telefone</th>
                                <th>Cotas</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th>Data Pagamento</th>
                                <th>Comprovante</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody key={refreshKey}>
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-muted">
                                        Nenhum participante no grupo
                                    </td>
                                </tr>
                            ) : (
                                payments.map(payment => (
                                    <tr key={`${payment.group_id}-${payment.participant_id}`}>
                                        <td>{payment.name}</td>
                                        <td>{payment.phone}</td>
                                        <td>{payment.quota_quantity}</td>
                                        <td>R$ {payment.individual_value.toFixed(2)}</td>
                                        <td>
                                            {payment.paid ? (
                                                <span className="badge badge-success">✓ Pago</span>
                                            ) : (
                                                <span className="badge badge-warning">⏳ Pendente</span>
                                            )}
                                        </td>
                                        <td>
                                            {payment.payment_date
                                                ? new Date(payment.payment_date).toLocaleDateString('pt-BR')
                                                : '-'
                                            }
                                        </td>
                                        <td>
                                            {payment.receipt_path ? (
                                                <a
                                                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/uploads/${payment.receipt_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-success"
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    📎 Ver
                                                </a>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                                                <button
                                                    className={`btn btn-sm ${payment.paid ? 'btn-secondary' : 'btn-success'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        console.log('CLICKED:', payment.name, 'participant_id:', payment.participant_id, 'paid:', payment.paid);
                                                        handleTogglePaid(payment.participant_id, payment.paid);
                                                    }}
                                                    disabled={processingPayment !== null}
                                                >
                                                    {processingPayment === payment.participant_id ? '...' : (payment.paid ? 'Marcar Pendente' : 'Marcar Pago')}
                                                </button>

                                                <label
                                                    className="btn btn-primary btn-sm"
                                                    style={{ margin: 0, cursor: 'pointer' }}
                                                >
                                                    {uploadingFor === payment.participant_id ? '...' : '📤'}
                                                    <input
                                                        type="file"
                                                        accept="image/*,.pdf"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileUpload(payment.participant_id, file);
                                                        }}
                                                        disabled={uploadingFor === payment.participant_id}
                                                    />
                                                </label>
                                            </div>
                                        </td>
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
