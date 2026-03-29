import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Standard Home Game blind structure
  const standard = await prisma.blindStructure.create({
    data: {
      name: 'Standard (15 min)',
      isDefault: true,
      levels: {
        create: [
          { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 4, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 5, smallBlind: 150, bigBlind: 300, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 6, smallBlind: 0, bigBlind: 0, ante: 0, durationMinutes: 10, isBreak: true },
          { level: 7, smallBlind: 200, bigBlind: 400, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 8, smallBlind: 300, bigBlind: 600, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 9, smallBlind: 400, bigBlind: 800, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 10, smallBlind: 500, bigBlind: 1000, ante: 0, durationMinutes: 15, isBreak: false },
          { level: 11, smallBlind: 750, bigBlind: 1500, ante: 0, durationMinutes: 12, isBreak: false },
          { level: 12, smallBlind: 1000, bigBlind: 2000, ante: 0, durationMinutes: 12, isBreak: false },
          { level: 13, smallBlind: 1500, bigBlind: 3000, ante: 0, durationMinutes: 10, isBreak: false },
        ],
      },
    },
  });

  // Turbo blind structure
  const turbo = await prisma.blindStructure.create({
    data: {
      name: 'Turbo (10 min)',
      isDefault: false,
      levels: {
        create: [
          { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 10, isBreak: false },
          { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 10, isBreak: false },
          { level: 3, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 10, isBreak: false },
          { level: 4, smallBlind: 150, bigBlind: 300, ante: 0, durationMinutes: 10, isBreak: false },
          { level: 5, smallBlind: 200, bigBlind: 400, ante: 0, durationMinutes: 10, isBreak: false },
          { level: 6, smallBlind: 300, bigBlind: 600, ante: 0, durationMinutes: 10, isBreak: false },
          { level: 7, smallBlind: 500, bigBlind: 1000, ante: 0, durationMinutes: 10, isBreak: false },
          { level: 8, smallBlind: 750, bigBlind: 1500, ante: 0, durationMinutes: 8, isBreak: false },
          { level: 9, smallBlind: 1000, bigBlind: 2000, ante: 0, durationMinutes: 8, isBreak: false },
          { level: 10, smallBlind: 1500, bigBlind: 3000, ante: 0, durationMinutes: 8, isBreak: false },
        ],
      },
    },
  });

  // Deep Stack blind structure
  const deepStack = await prisma.blindStructure.create({
    data: {
      name: 'Deep Stack (20 min)',
      isDefault: false,
      levels: {
        create: [
          { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 4, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 5, smallBlind: 150, bigBlind: 300, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 6, smallBlind: 0, bigBlind: 0, ante: 0, durationMinutes: 15, isBreak: true },
          { level: 7, smallBlind: 200, bigBlind: 400, ante: 25, durationMinutes: 20, isBreak: false },
          { level: 8, smallBlind: 300, bigBlind: 600, ante: 50, durationMinutes: 20, isBreak: false },
          { level: 9, smallBlind: 400, bigBlind: 800, ante: 75, durationMinutes: 20, isBreak: false },
          { level: 10, smallBlind: 500, bigBlind: 1000, ante: 100, durationMinutes: 20, isBreak: false },
          { level: 11, smallBlind: 0, bigBlind: 0, ante: 0, durationMinutes: 15, isBreak: true },
          { level: 12, smallBlind: 750, bigBlind: 1500, ante: 150, durationMinutes: 15, isBreak: false },
          { level: 13, smallBlind: 1000, bigBlind: 2000, ante: 200, durationMinutes: 15, isBreak: false },
          { level: 14, smallBlind: 1500, bigBlind: 3000, ante: 300, durationMinutes: 12, isBreak: false },
          { level: 15, smallBlind: 2000, bigBlind: 4000, ante: 400, durationMinutes: 12, isBreak: false },
        ],
      },
    },
  });

  // Super Bowl Sunday blind structure
  const superBowlSunday = await prisma.blindStructure.create({
    data: {
      name: 'Super Bowl Sunday',
      isDefault: false,
      levels: {
        create: [
          { level: 1, smallBlind: 5, bigBlind: 10, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 2, smallBlind: 10, bigBlind: 20, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 3, smallBlind: 15, bigBlind: 30, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 4, smallBlind: 20, bigBlind: 40, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 5, smallBlind: 25, bigBlind: 50, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 6, smallBlind: 0, bigBlind: 0, ante: 0, durationMinutes: 20, isBreak: true },
          { level: 7, smallBlind: 75, bigBlind: 150, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 8, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 9, smallBlind: 150, bigBlind: 300, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 10, smallBlind: 200, bigBlind: 400, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 11, smallBlind: 300, bigBlind: 600, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 12, smallBlind: 400, bigBlind: 800, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 13, smallBlind: 500, bigBlind: 1000, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 14, smallBlind: 600, bigBlind: 1200, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 15, smallBlind: 700, bigBlind: 1400, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 16, smallBlind: 800, bigBlind: 1600, ante: 0, durationMinutes: 20, isBreak: false },
          { level: 17, smallBlind: 1000, bigBlind: 2000, ante: 0, durationMinutes: 20, isBreak: false },
        ],
      },
    },
  });

  console.log('Seeded blind structures:', standard.name, turbo.name, deepStack.name, superBowlSunday.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
