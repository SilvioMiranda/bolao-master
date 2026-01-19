export interface Participant {
    id: number;
    phone: string;
    name: string;
    created_at: string;
}

export type LotteryType = 'mega-sena' | 'lotofacil' | 'quina' | 'lotomania' | 'dupla-sena';
export type GroupStatus = 'open' | 'closed' | 'checked' | 'finalized';
export type AdminFeeType = 'percentage' | 'fixed';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface Group {
    id: number;
    name: string;
    lottery_type: LotteryType;
    draw_date: string;
    total_quotas: number;
    quota_value: number;
    pix_key: string;
    status: GroupStatus;
    prize_amount: number;
    admin_fee_type: AdminFeeType;
    admin_fee_value: number;
    created_at: string;
    participant_count?: number;
    paid_count?: number;
    total_participants?: number;
    participants?: GroupParticipantDetail[];
}

export interface GroupParticipant {
    id: number;
    group_id: number;
    participant_id: number;
    quota_quantity: number;
    people_per_quota: number;
    individual_value: number;
    paid: boolean;
    payment_date: string | null;
    payment_status: PaymentStatus;
    receipt_path: string | null;
    rejection_reason: string | null;
    rejection_date: string | null;
}

export interface GroupParticipantDetail extends GroupParticipant {
    name: string;
    phone: string;
}

export interface Bet {
    id: number;
    group_id: number;
    numbers: number[];
    created_at: string;
}

export interface DrawResult {
    id: number;
    group_id: number;
    result_numbers: number[];
    draw_date: string;
    matches: BetMatch[];
    lottery_type?: LotteryType;
    group_name?: string;
    bets?: Bet[];
}

export interface BetMatch {
    bet_id: number;
    matched_numbers: number[];
    match_count: number;
}

export interface PrizeDistribution {
    id: number;
    group_id: number;
    participant_id: number;
    quota_fraction: number;
    prize_share: number;
    paid_out: boolean;
    payout_date: string | null;
    created_at: string;
}

export interface PrizeDistributionDetail extends PrizeDistribution {
    name: string;
    phone: string;
}

export interface PrizeCalculationResult {
    prize_amount: number;
    admin_fee: number;
    net_prize: number;
    distributions: PrizeDistributionDetail[];
}

export interface LiquidationSummary {
    total_collected: number;
    total_prize: number;
    total_distributed: number;
    remaining_balance: number;
    participants_paid: number;
    total_participants: number;
}

export interface QRCodeResponse {
    qrcode: string;
    pix_key: string;
    amount: number;
}
