import { z } from 'zod';
import * as creatorService from '../services/creator.service';

const limitSchema = z.coerce.number().int().min(1).max(100).default(50);
export async function applyForMonetization(request: any, response: any) { response.status(202).json({ data: await creatorService.applyForMonetization(request.user.id) }); }
export async function getWallet(request: any, response: any) { response.json({ data: await creatorService.getWallet(request.user.id) }); }
export async function listTransactions(request: any, response: any) { response.json({ data: await creatorService.listTransactions(request.user.id, limitSchema.parse(request.query.limit)) }); }
export async function getAnalytics(request: any, response: any) { response.json({ data: await creatorService.getAnalytics(request.user.id) }); }
export async function getCashWallet(request: any, response: any) { response.json({ data: await creatorService.getCashWallet(request.user.id) }); }
export async function getCashoutQuote(request: any, response: any) { response.json({ data: await creatorService.getCashoutQuote(request.user.id) }); }
export async function listCashTransactions(request: any, response: any) { const limit = z.coerce.number().int().min(1).max(100).default(50).parse(request.query.limit); response.json({ data: await creatorService.listCashTransactions(request.user.id, limit) }); }
export async function listPayoutHistory(request: any, response: any) { const limit = z.coerce.number().int().min(1).max(100).default(50).parse(request.query.limit); response.json({ data: await creatorService.listPayoutHistory(request.user.id, limit) }); }
