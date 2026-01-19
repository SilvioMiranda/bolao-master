import { useState, useEffect } from 'react';
import { getParticipants, createParticipant, updateParticipant, deleteParticipant } from '../services/api';
import { Participant } from '../types';

export default function Participants() {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ phone: '', name: '' });

    useEffect(() => {
        loadParticipants();
    }, []);

    const loadParticipants = async () => {
        try {
            const response = await getParticipants();
            setParticipants(response.data);
        } catch (error) {
            console.error('Erro ao carregar participantes:', error);
            alert('Erro ao carregar participantes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateParticipant(editingId, formData);
            } else {
                await createParticipant(formData);
            }
            setShowModal(false);
            setFormData({ phone: '', name: '' });
            setEditingId(null);
            loadParticipants();
        } catch (error: any) {
            console.error('Erro ao salvar participante:', error);
            alert(error.response?.data?.error || 'Erro ao salvar participante');
        }
    };

    const handleEdit = (participant: Participant) => {
        setEditingId(participant.id);
        setFormData({ phone: participant.phone, name: participant.name });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este participante?')) return;

        try {
            await deleteParticipant(id);
            loadParticipants();
        } catch (error) {
            console.error('Erro ao excluir participante:', error);
            alert('Erro ao excluir participante');
        }
    };

    const openNewModal = () => {
        setEditingId(null);
        setFormData({ phone: '', name: '' });
        setShowModal(true);
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
                    <h1>Participantes</h1>
                    <p className="text-muted">Gerencie os participantes dos bolões</p>
                </div>
                <button className="btn btn-primary" onClick={openNewModal}>
                    + Novo Participante
                </button>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Telefone (WhatsApp)</th>
                                <th>Data de Cadastro</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center text-muted">
                                        Nenhum participante cadastrado
                                    </td>
                                </tr>
                            ) : (
                                participants.map(participant => (
                                    <tr key={participant.id}>
                                        <td>{participant.name}</td>
                                        <td>{participant.phone}</td>
                                        <td>{new Date(participant.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleEdit(participant)}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(participant.id)}
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingId ? 'Editar Participante' : 'Novo Participante'}</h3>
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
                                    <label className="form-label">Nome</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Telefone (WhatsApp)</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(11) 99999-9999"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingId ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
