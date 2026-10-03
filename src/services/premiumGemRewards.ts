type PremiumPlan = 'LIFETIME' | 'YEARLY' | 'MONTHLY' | 'READAGORA_PLUS_WEEKLY';

const rewardByPlan: Partial<Record<PremiumPlan, number>> = {
	LIFETIME: 1000,
	YEARLY: 500,
	MONTHLY: 50,
};

export function getPremiumGemReward(input: {
	userId: string;
	plan: PremiumPlan;
	eventType: string;
	transactionId: string;
}) {
	const eventType = input.eventType.toUpperCase();
	const isInitialPurchase = eventType === 'INITIAL_PURCHASE';
	if (!isInitialPurchase && !(input.plan !== 'LIFETIME' && eventType === 'RENEWAL')) return null;

	const amount = rewardByPlan[input.plan];
	if (!amount) return null;

	return {
		amount,
		reason: 'premium_subscription_reward',
		referenceId: input.transactionId,
		idempotencyKey: `premium_gem_reward:${input.userId}:${input.transactionId}`,
		metadata: {
			plan: input.plan,
			event_type: eventType,
			transaction_id: input.transactionId,
		},
	};
}
