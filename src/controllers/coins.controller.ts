import { z } from 'zod';
import * as coinsService from '../services/coins.service';
const limitSchema = z.coerce.number().int().min(1).max(100).default(50);
const supportSchema = z.object({ storyId: z.string().uuid(), coins: z.coerce.number().int().min(1).max(800), idempotencyKey: z.string().uuid() });
export async function getWallet(request: any, response: any) { response.json({ data: await coinsService.getWallet(request.user.id) }); }
export async function listProducts(_request: any, response: any) { response.json({ data: await coinsService.listProducts() }); }
export async function listHistory(request: any, response: any) { response.json({ data: await coinsService.listHistory(request.user.id, limitSchema.parse(request.query.limit)) }); }
export async function sendSupport(request: any, response: any) { const input = supportSchema.parse(request.body); response.json({ data: await coinsService.sendSupport(request.user.id, input.storyId, input.coins, input.idempotencyKey) }); }
