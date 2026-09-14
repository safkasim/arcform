import { Router, type IRouter } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, appUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireClerkAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/auth/profile", requireClerkAuth, async (req, res, next) => {
  try {
    const userId = getAuth(req).userId!;
    const [profile] = await db
      .select()
      .from(appUsersTable)
      .where(eq(appUsersTable.clerkUserId, userId));
    if (!profile) {
      res.status(404).json({ error: "Account profile not found." });
      return;
    }
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

router.post("/auth/profile", requireClerkAuth, async (req, res, next) => {
  try {
    const userId = getAuth(req).userId!;
    const claims = getAuth(req).sessionClaims as Record<string, unknown> | undefined;
    const role = req.body.role;
    const claimName = [claims?.firstName, claims?.lastName]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" ");
    const name = String(req.body.name ?? claims?.name ?? claimName).trim();
    const clerkUser = await clerkClient.users.getUser(userId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    );
    const email = primaryEmail?.emailAddress.trim().toLowerCase() ?? "";
    if (!["athlete", "trainer"].includes(role) || !name || !email) {
      res.status(400).json({ error: "Name, email, and a valid role are required." });
      return;
    }

    const [existing] = await db
      .select()
      .from(appUsersTable)
      .where(eq(appUsersTable.clerkUserId, userId));
    if (existing && existing.role !== role) {
      res.status(409).json({ error: `This account is registered as a ${existing.role}.` });
      return;
    }

    const [profile] = await db
      .insert(appUsersTable)
      .values({ clerkUserId: userId, name, email, role })
      .onConflictDoUpdate({
        target: appUsersTable.clerkUserId,
        set: { name, email, updatedAt: new Date() },
      })
      .returning();
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

export default router;