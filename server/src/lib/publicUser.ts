import { Prisma } from "@prisma/client";

// The User fields that are safe to send to clients. Deliberately excludes
// passwordHash — it must never leave the server. Use this wherever a User is
// nested into an API response (e.g. account owner, connection requester/invitee).
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
