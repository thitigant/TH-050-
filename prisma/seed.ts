import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with demo accounts...');
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const users = [
    {
      id: 'usr_owner_1',
      email: 'owner1@unipulse.edu',
      name: 'Instructor Alice',
      passwordHash,
      role: Role.SURVEY_OWNER,
      isActive: true,
    },
    {
      id: 'usr_owner_2',
      email: 'owner2@unipulse.edu',
      name: 'Instructor Bob',
      passwordHash,
      role: Role.SURVEY_OWNER,
      isActive: true,
    },
    {
      id: 'usr_student_1',
      email: 'student1@unipulse.edu',
      name: 'Student Charlie',
      passwordHash,
      role: Role.RESPONDENT,
      isActive: true,
    },
    {
      id: 'usr_student_2',
      email: 'student2@unipulse.edu',
      name: 'Student David',
      passwordHash,
      role: Role.RESPONDENT,
      isActive: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
      },
      create: user,
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
