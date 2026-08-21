const express = require('express') as any;
const helmet = require('helmet') as any;
const cors = require('cors') as any;
const morgan = require('morgan') as any;

import chaptersRouter from './routes/chapters.routes';
import storiesRouter from './routes/stories.routes';
import usersRouter from './routes/users.routes';
import commentsRouter from './routes/comments.routes';
import feedRouter from './routes/feed.routes';
import uploadsRouter from './routes/uploads.routes';
import authRouter from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler.middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(authRouter);
app.use(usersRouter);
app.use(commentsRouter);
app.use(feedRouter);
app.use(uploadsRouter);
app.use(storiesRouter);
app.use(chaptersRouter);
app.use(errorHandler);

export default app;
// Express application composition stub.
// TODO: configure helmet, cors, morgan/pino logging, JSON parsing, rate
// limiting, and route mounting.
// TODO: keep public reads (published story/profile/discovery reads) and auth
// routes outside required auth, while protecting all private route groups.
// TODO: register the final errorHandler middleware after every route.
