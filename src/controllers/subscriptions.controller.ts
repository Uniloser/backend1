import * as subscriptionsService from '../services/subscriptions.service';

export async function getCurrent(request: any, response: any) {
	response.json({ data: await subscriptionsService.getCurrentSubscription(request.user.id) });
}
