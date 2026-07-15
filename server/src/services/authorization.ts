import { ConnectionStatus } from "@prisma/client";
import prisma from "../lib/prisma";

type ShareFlag =
  | "shareAllAccounts"
  | "shareAllBudgets"
  | "shareAllCategories"
  | "shareAllGoals";

export async function userCanAccessAccount(
  userId: string,
  accountId: string,
): Promise<boolean> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      accountShares: true,
      owner: true,
    },
  });

  if (!account) return false;

  if (account.ownerId === userId) return true;

  if (account.accountShares.some((share) => share.userId === userId))
    return true;

  const connection = await prisma.connection.findFirst({
    where: {
      status: ConnectionStatus.ACCEPTED,
      shareAllAccounts: true,
      OR: [
        { requesterId: userId, inviteeId: account.ownerId },
        { requesterId: account.ownerId, inviteeId: userId },
      ],
    },
  });

  return !!connection;
}

export async function userIsAccountOwner(
  userId: string,
  accountId: string,
): Promise<boolean> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  return account?.ownerId === userId;
}

// Same as userCanAccessAccount for now. Kept as a distinct function so we can
// tighten write access (e.g. reject VIEWER role) without touching every caller.
export async function userCanEditTransactionInAccount(
  userId: string,
  accountId: string,
): Promise<boolean> {
  return userCanAccessAccount(userId, accountId);
}

export async function userCanAccessCategory(
  userId: string,
  categoryId: string,
): Promise<boolean> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) return false;
  if (category.userId === userId) return true;

  if (category.userId === null) return true;

  const connectedUserIds = await getConnectedUserIds(
    userId,
    "shareAllCategories",
  );
  return connectedUserIds.includes(category.userId);
}

export async function userCanAccessBudget(
  userId: string,
  budgetId: string,
): Promise<boolean> {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
  });

  if (!budget) return false;
  if (budget.userId === userId) return true;

  const connectedUserIds = await getConnectedUserIds(userId, "shareAllBudgets");

  return connectedUserIds.includes(budget.userId);
}

export async function userCanAccessGoal(
  userId: string,
  goalId: string,
): Promise<boolean> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
  });

  if (!goal) return false;
  if (goal.userId === userId) return true;

  const connectedUserIds = await getConnectedUserIds(userId, "shareAllGoals");

  return connectedUserIds.includes(goal.userId);
}

export async function userCanAccessTransaction(
  userId: string,
  transactionId: string,
): Promise<boolean> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { accountId: true },
  });

  if (!transaction) return false;

  return userCanAccessAccount(userId, transaction.accountId);
}

export async function getUserAccounts(userId: string) {
  const connectedUserIds = await getConnectedUserIds(
    userId,
    "shareAllAccounts",
  );

  return prisma.account.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { accountShares: { some: { userId } } },
        ...(connectedUserIds.length
          ? [{ ownerId: { in: connectedUserIds } }]
          : []),
      ],
    },
    include: { accountShares: true, owner: true },
    distinct: ["id"],
  });
}

export async function getConnectedUserIds(userId: string, shareFlag: ShareFlag) {
  const connections = await prisma.connection.findMany({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR: [{ requesterId: userId }, { inviteeId: userId }],
      [shareFlag]: true,
    },
  });

  return connections
    .map((conn) =>
      conn.requesterId === userId ? conn.inviteeId : conn.requesterId,
    )
    .filter((id): id is string => !!id);
}
