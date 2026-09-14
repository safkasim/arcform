import { getAuth } from "@clerk/express";
import { db, appUsersTable, type AppUser } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      appUser?: AppUser;
      clerkUserId?: string;
    }
  }
}

export function clerkUserId(req: Request): string | null {
  const auth = getAuth(req);
  return auth.userId ?? null;
}

export async function requireClerkAuth(req: Request, res: Response, next: NextFunction) {
  const userId = clerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = userId;
  next();
}

export async function requireAppUser(req: Request, res: Response, next: NextFunction) {
  const userId = clerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.clerkUserId, userId));
  if (!user) {
    res.status(403).json({ error: "Complete account setup before accessing Arcform." });
    return;
  }
  req.clerkUserId = userId;
  req.appUser = user;
  next();
}

export function requireRole(role: AppUser["role"]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.appUser?.role !== role) {
      res.status(403).json({ error: `${role} access is required.` });
      return;
    }
    next();
  };
}