import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import v1Router from "./v1/index.js";
import oidcRealmRouter from "./v1/oidcRealm.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(v1Router);
router.use(oidcRealmRouter);

export default router;
