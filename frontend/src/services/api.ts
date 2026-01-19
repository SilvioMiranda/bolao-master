import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = import.meta.env.VITE_API_URL || 'https://bolao-master-backend.onrender.com';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Participants
export const getParticipants = () => api.get('/participants');
export const createParticipant = (data: any) => api.post('/participants', data);
export const updateParticipant = (id: number, data: any) => api.put(`/participants/${id}`, data);
export const deleteParticipant = (id: number) => api.delete(`/participants/${id}`);

// Groups
export const getGroups = () => api.get('/groups');
export const getGroup = (id: number) => api.get(`/groups/${id}`);
export const createGroup = (data: any) => api.post('/groups', data);
export const updateGroup = (id: number, data: any) => api.put(`/groups/${id}`, data);
export const deleteGroup = (id: number) => api.delete(`/groups/${id}`);

// Group Participants
export const addParticipantToGroup = (groupId: number, data: any) =>
    api.post(`/groups/${groupId}/participants`, data);
export const removeParticipantFromGroup = (groupId: number, participantId: number) =>
    api.delete(`/groups/${groupId}/participants/${participantId}`);
export const updateGroupParticipant = (groupId: number, participantId: number, data: any) =>
    api.put(`/groups/${groupId}/participants/${participantId}`, data);

// Payments
export const getGroupPayments = (groupId: number) => api.get(`/groups/${groupId}/payments`);
export const markPaid = (data: any) => api.post('/payments/mark-paid', data);
export const uploadReceipt = (groupId: number, participantId: number, file: File) => {
    const formData = new FormData();
    formData.append('receipt', file);
    return api.post(`/payments/${groupId}/${participantId}/receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};
export const generateQRCode = (groupId: number) => api.post(`/payments/${groupId}/qrcode`);
export const getGroupQRCode = generateQRCode; // Alias for compatibility

// Games
export const createBet = (groupId: number, numbers: number[]) =>
    api.post(`/games/${groupId}/bets`, { numbers });
export const getBets = (groupId: number) => api.get(`/games/${groupId}/bets`);
export const updateBet = (groupId: number, betId: number, numbers: number[]) =>
    api.put(`/games/${groupId}/bets/${betId}`, { numbers });
export const deleteBet = (groupId: number, betId: number) =>
    api.delete(`/games/${groupId}/bets/${betId}`);
export const createDrawResult = (groupId: number, data: any) =>
    api.post(`/games/${groupId}/results`, data);
export const getGameResults = (groupId: number) => api.get(`/games/${groupId}/check`);

// Prizes
export const updateGroupStatus = (groupId: number, status: string) =>
    api.patch(`/prizes/${groupId}/status`, { status });
export const updateAdminFee = (groupId: number, data: any) =>
    api.patch(`/prizes/${groupId}/admin-fee`, data);
export const calculatePrize = (groupId: number, prize_amount: number) =>
    api.post(`/prizes/${groupId}/calculate-prize`, { prize_amount });
export const getPrizeDistribution = (groupId: number) =>
    api.get(`/prizes/${groupId}/distribution`);
export const getWhatsAppReport = (groupId: number) =>
    api.get(`/prizes/${groupId}/whatsapp-report`);

export default api;
