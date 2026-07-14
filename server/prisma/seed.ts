import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const systemCategories = [
  { name: "Food & Drink", icon: "🍔" },
  { name: "Groceries", icon: "🛒" },
  { name: "Transport", icon: "🚗" },
  { name: "Housing", icon: "🏠" },
  { name: "Utilities", icon: "💡" },
  { name: "Entertainment", icon: "🎬" },
  { name: "Health", icon: "💊" },
  { name: "Shopping", icon: "🛍️" },
  { name: "Education", icon: "📚" },
  { name: "Salary", icon: "💼" },
  { name: "Gifts", icon: "🎁" },
  { name: "Other", icon: "📌" },
];

async function main() {
  for (const cat of systemCategories) {
    const existing = await prisma.category.findFirst({
      where: { userId: null, parentId: null, name: cat.name },
    });

    if (!existing) {
      await prisma.category.create({
        data: { userId: null, parentId: null, ...cat },
      });

      console.log(`✓ created "${cat.name}"`);
    } else {
      console.log(`↷ skipped "${cat.name}" (already exists)`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(() => prisma.$disconnect());