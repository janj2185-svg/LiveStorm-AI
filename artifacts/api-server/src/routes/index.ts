import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import streamersRouter from "./streamers";
import kingdomsRouter from "./kingdoms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(streamersRouter);
router.use(kingdomsRouter);

export default router;
