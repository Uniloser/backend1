"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const community_routes_1 = __importDefault(require("./routes/community.routes"));
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const panels_routes_1 = __importDefault(require("./routes/panels.routes"));
const chapters_routes_1 = __importDefault(require("./routes/chapters.routes"));
const stories_routes_1 = __importDefault(require("./routes/stories.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const account_routes_1 = __importDefault(require("./routes/account.routes"));
const moderation_routes_1 = __importDefault(require("./routes/moderation.routes"));
const comments_routes_1 = __importDefault(require("./routes/comments.routes"));
const feed_routes_1 = __importDefault(require("./routes/feed.routes"));
const uploads_routes_1 = __importDefault(require("./routes/uploads.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const bookmarks_routes_1 = __importDefault(require("./routes/bookmarks.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const pushTokens_routes_1 = __importDefault(require("./routes/pushTokens.routes"));
const blocks_routes_1 = __importDefault(require("./routes/blocks.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const storyAds_routes_1 = __importDefault(require("./routes/storyAds.routes"));
const siteAds_routes_1 = __importDefault(require("./routes/siteAds.routes"));
const promotions_routes_1 = __importDefault(require("./routes/promotions.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const imports_routes_1 = __importDefault(require("./routes/imports.routes"));
const media_routes_1 = __importDefault(require("./routes/media.routes"));
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(auth_routes_1.default);
app.use(blocks_routes_1.default);
app.use(wallet_routes_1.default);
app.use(users_routes_1.default);
app.use(account_routes_1.default);
app.use(moderation_routes_1.default);
app.use(comments_routes_1.default);
app.use(feed_routes_1.default);
app.use(community_routes_1.default);
app.use(storyAds_routes_1.default);
app.use(siteAds_routes_1.default);
app.use(promotions_routes_1.default);
app.use(analytics_routes_1.default);
app.use(uploads_routes_1.default);
app.use(imports_routes_1.default);
app.use(media_routes_1.default);
app.use(reports_routes_1.default);
app.use(bookmarks_routes_1.default);
app.use(notifications_routes_1.default);
app.use(pushTokens_routes_1.default);
app.use(stories_routes_1.default);
app.use(chapters_routes_1.default);
app.use(panels_routes_1.default);
app.use(errorHandler_middleware_1.errorHandler);
exports.default = app;
// Express application composition stub.
// TODO: configure helmet, cors, morgan/pino logging, JSON parsing, rate
// limiting, and route mounting.
// TODO: keep public reads (published story/profile/discovery reads) and auth
// routes outside required auth, while protecting all private route groups.
// TODO: register the final errorHandler middleware after every route.
