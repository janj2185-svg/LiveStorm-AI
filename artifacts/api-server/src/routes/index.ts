import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import streamersRouter from "./streamers";
import kingdomsRouter from "./kingdoms";
import sessionsRouter from "./sessions";
import automationsRouter from "./automations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(streamersRouter);
router.use(kingdomsRouter);
router.use(sessionsRouter);
router.use(automationsRouter);

export default router;
