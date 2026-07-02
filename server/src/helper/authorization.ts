import prisma from "../lib/prisma";

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
      status: "ACCEPTED",
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

  const connectedUserIds = await getConnectedUserIds(
    userId,
    "shareAllCategories",
  );

  return !!category.userId && connectedUserIds.includes(category.userId);
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
  const ownedAccounts = await prisma.account.findMany({
    where: { ownerId: userId },
    include: { accountShares: true, owner: true },
  });

  const sharedAccounts = await prisma.account.findMany({
    where: {
      accountShares: {
        some: { userId },
      },
    },
    include: { accountShares: true, owner: true },
  });

  const connectedUsers = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      shareAllAccounts: true,
      OR: [{ requesterId: userId }, { inviteeId: userId }],
    },
  });

  const connectedUserIds = connectedUsers
    .map((conn) =>
      conn.requesterId === userId ? conn.inviteeId : conn.requesterId,
    )
    .filter((id): id is string => !!id);

  const connectedAccounts = connectedUserIds.length
    ? await prisma.account.findMany({
        where: { ownerId: { in: connectedUserIds } },
        include: { accountShares: true, owner: true },
      })
    : [];

  const allAccounts = [
    ...ownedAccounts,
    ...sharedAccounts,
    ...connectedAccounts,
  ];
  const seen = new Set();
  return allAccounts.filter((account) => {
    if (seen.has(account.id)) return false;
    seen.add(account.id);
    return true;
  });
}

export async function getConnectedUserIds(userId: string, shareFlag: string) {
  const connections = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { inviteeId: userId }],
      ...(shareFlag === "shareAllAccounts"
        ? { shareAllAccounts: true }
        : shareFlag === "shareAllBudgets"
          ? { shareAllBudgets: true }
          : shareFlag === "shareAllCategories"
            ? { shareAllCategories: true }
            : { shareAllGoals: true }),
    },
  });

  return connections
    .map((conn) =>
      conn.requesterId === userId ? conn.inviteeId : conn.requesterId,
    )
    .filter((id): id is string => !!id);
}
