import { Router } from "express";
import tenantsRouter from "./tenants.js";
import workspacesRouter from "./workspaces.js";
import billingRouter from "./billing.js";
import metaRouter from "./meta.js";
import samlRouter from "./saml.js";
import scimRouter from "./scim.js";
import federationRouter from "./federation.js";

const router = Router();

router.use("/v1/tenants", tenantsRouter);
router.use("/v1/workspaces", workspacesRouter);
router.use("/v1/workspaces", samlRouter);
router.use("/v1/workspaces", scimRouter);
router.use("/v1/workspaces", federationRouter);
router.use("/v1/tenants", billingRouter);
router.post("/v1/webhooks/stripe", billingRouter);
router.use("/v1/meta", metaRouter);

export default router;
