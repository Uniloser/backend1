const configuredMinimum = Number.parseInt(process.env.READAGORA_MINIMUM_FREE_CHAPTERS ?? '3', 10);

export const MINIMUM_FREE_CHAPTERS = Number.isFinite(configuredMinimum) && configuredMinimum >= 3 ? configuredMinimum : 3;
