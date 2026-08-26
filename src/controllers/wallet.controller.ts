import * as walletService from '../services/wallet.service';
import { z } from 'zod';

const limitSchema = z.coerce.number().int().min(1).max(100).optional();

export async function getWallet(request: any, response: any) {
	response.json({ data: await walletService.getWallet(request.user.id) });
}

export async function listTransactions(request: any, response: any) {
	const limit = limitSchema.parse(request.query.limit);
	response.json({ data: await walletService.listTransactions(request.user.id, limit) });
}

export async function listAchievements(request: any, response: any) {
	response.json({ data: await walletService.listAchievements(request.user.id) });
}

export async function listChallenges(request: any, response: any) {
	response.json({ data: await walletService.listActiveChallenges(request.user.id) });
}