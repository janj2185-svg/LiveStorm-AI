import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

router.get("/auth/session", (req: any, res: any) => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.json({ signedIn: false, userId: null });
  }
  res.json({ signedIn: true, userId: auth.userId });
});

export default router;
