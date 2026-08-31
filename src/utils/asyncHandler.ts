export function asyncHandler(handler: (...argumentsList: any[]) => Promise<unknown>) {
	return (...argumentsList: any[]) => Promise.resolve(handler(...argumentsList)).catch(argumentsList[2]);
}
// Async Express handler wrapper stub.
// TODO: forward rejected promises to next(error) so controllers stay free of
// repetitive try/catch blocks.
