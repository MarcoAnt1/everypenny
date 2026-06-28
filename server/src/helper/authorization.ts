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
