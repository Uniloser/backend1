import { z } from 'zod';
import * as creatorService from '../services/creator.service';

const limitSchema = z.coerce.number().int().min(1).max(100).default(50);
const payoutRequestSchema = z.object({
	amountZmwMinorUnits: z.number().int().positive().max(100_000_000),
	payoutMethod: z.string().trim().min(1).max(40),
	destinationReference: z.string().trim().min(8).max(60),
	idempotencyKey: z.string().uuid(),
});
const adminReviewSchema = z.object({
	decision: z.enum(['approve', 'reject']),
	note: z.string().trim().min(3).max(1000),
});
const reserveFundingSchema = z.object({
	amountZmwMinorUnits: z.number().int().positive().max(1_000_000_000),
	reference: z.string().trim().min(3).max(200),
	note: z.string().trim().max(1000).default(''),
	idempotencyKey: z.string().uuid(),
});
const reconciliationSchema = z.object({
	outcome: z.enum(['uncertain', 'paid', 'failed']),
	providerReference: z.string().trim().max(200).nullable().optional(),
	note: z.string().trim().min(3).max(1000),
});
export async function applyForMonetization(request: any, response: any) { response.status(202).json({ data: await creatorService.applyForMonetization(request.user.id) }); }
export async function getWallet(request: any, response: any) { response.json({ data: await creatorService.getWallet(request.user.id) }); }
export async function listTransactions(request: any, response: any) { response.json({ data: await creatorService.listTransactions(request.user.id, limitSchema.parse(request.query.limit)) }); }
export async function getAnalytics(request: any, response: any) { response.json({ data: await creatorService.getAnalytics(request.user.id) }); }
export async function getCashWallet(request: any, response: any) { response.json({ data: await creatorService.getCashWallet(request.user.id) }); }
export async function getCashoutQuote(request: any, response: any) { response.json({ data: await creatorService.getCashoutQuote(request.user.id) }); }
export async function listCashTransactions(request: any, response: any) { const limit = z.coerce.number().int().min(1).max(100).default(50).parse(request.query.limit); response.json({ data: await creatorService.listCashTransactions(request.user.id, limit) }); }
export async function listPayoutHistory(request: any, response: any) { const limit = z.coerce.number().int().min(1).max(100).default(50).parse(request.query.limit); response.json({ data: await creatorService.listPayoutHistory(request.user.id, limit) }); }
export async function requestPayout(request: any, response: any) {
	const input = payoutRequestSchema.parse(request.body);
	response.status(201).json({ data: await creatorService.requestPayout(
		request.user.id, input.amountZmwMinorUnits, input.payoutMethod,
		input.destinationReference, input.idempotencyKey,
	) });
}
export async function listAdminPayouts(request: any, response: any) {
	response.json({ data: await creatorService.listAdminPayouts(limitSchema.parse(request.query.limit)) });
}
export async function getAdminPayoutReserve(_request: any, response: any) {
	response.json({ data: await creatorService.getPayoutReserve() });
}
export async function reviewPayout(request: any, response: any) {
	const id = z.string().uuid().parse(request.params.id);
	const input = adminReviewSchema.parse(request.body);
	response.json({ data: await creatorService.reviewPayout(id, request.user.id, input.decision, input.note) });
}
export async function fundPayoutReserve(request: any, response: any) {
	const input = reserveFundingSchema.parse(request.body);
	response.status(201).json({ data: await creatorService.fundPayoutReserve(
		request.user.id, input.amountZmwMinorUnits, input.reference, input.note, input.idempotencyKey,
	) });
}
export async function startPayoutTransfer(request: any, response: any) {
	const id = z.string().uuid().parse(request.params.id);
	response.json({ data: await creatorService.startPayoutTransfer(id, request.user.id) });
}
export async function reconcilePayout(request: any, response: any) {
	const id = z.string().uuid().parse(request.params.id);
	const input = reconciliationSchema.parse(request.body);
	response.json({ data: await creatorService.reconcilePayout(
		id, request.user.id, input.outcome, input.providerReference ?? null, input.note,
	) });
}
