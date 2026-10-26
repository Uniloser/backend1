const { Router } = require('express') as {
    Router: () => any;
};
import { optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getPreviousChampion } from '../services/eventChampions.service';
const router = Router();
router.get('/events/previous-champion', optionalAuth, asyncHandler(async (_request: any, response: any) => {
    response.set('Cache-Control', 'no-store');
    response.json({ data: await getPreviousChampion() });
}));
export default router;
