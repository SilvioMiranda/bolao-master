import { LotteryType, LotteryConfig } from '../types';

export const LOTTERY_TYPES: Record<LotteryType, LotteryConfig> = {
    'mega-sena': {
        name: 'Mega-Sena',
        numbersCount: 6,
        minNumber: 1,
        maxNumber: 60
    },
    'lotofacil': {
        name: 'Lotofácil',
        numbersCount: 15,
        minNumber: 1,
        maxNumber: 25
    },
    'quina': {
        name: 'Quina',
        numbersCount: 5,
        minNumber: 1,
        maxNumber: 80
    },
    'lotomania': {
        name: 'Lotomania',
        numbersCount: 50,
        minNumber: 0,
        maxNumber: 99
    },
    'dupla-sena': {
        name: 'Dupla Sena',
        numbersCount: 6,
        minNumber: 1,
        maxNumber: 50
    }
};

export function validateNumbers(lotteryType: LotteryType, numbers: number[]): { valid: boolean; error?: string } {
    const config = LOTTERY_TYPES[lotteryType];

    if (!config) {
        return { valid: false, error: 'Tipo de loteria inválido' };
    }

    if (numbers.length !== config.numbersCount) {
        return { valid: false, error: `${config.name} requer exatamente ${config.numbersCount} números` };
    }

    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
        return { valid: false, error: 'Números duplicados não são permitidos' };
    }

    for (const num of numbers) {
        if (num < config.minNumber || num > config.maxNumber) {
            return { valid: false, error: `Números devem estar entre ${config.minNumber} e ${config.maxNumber}` };
        }
    }

    return { valid: true };
}
