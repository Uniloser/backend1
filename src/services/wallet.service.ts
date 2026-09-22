import * as walletRepository from '../repositories/wallet.repository';

export function getWallet(userId: string) {
	return walletRepository.getWallet(userId);
}

export function listTransactions(userId: string, limit?: number) {
	return walletRepository.listTransactions(userId, limit);
}

export function listAchievements(userId: string) {
	return walletRepository.listAchievements(userId);
}

export function listActiveChallenges(userId: string) {
	return walletRepository.listActiveChallenges(userId);
}

export function awardGems(input: walletRepository.GemTransactionInput) {
	return walletRepository.applyGemTransaction(input);
}

export function claimAlphaPerks(userId: string) {
	return awardGems({
		userId,
		amount: 100,
		reason: 'alpha_welcome_grant',
		idempotencyKey: `alpha_grant:${userId}`,
		metadata: { campaign: 'alpha_2026', source: 'founding_member' },
	});
}