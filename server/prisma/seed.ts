import 'dotenv/config';
import { PrismaClient, Role, SurveyStatus, QuestionType, ResponseMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with demo accounts and baseline surveys...');
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

  const owner1 = await prisma.user.findUnique({ where: { email: 'owner1@unipulse.edu' } });
  if (owner1) {
    // 1. Seed srv_cpe334_001 (PUBLISHED)
    const existing1 = await prisma.survey.findUnique({ where: { id: 'srv_cpe334_001' } });
    if (!existing1) {
      await prisma.survey.create({
        data: {
          id: 'srv_cpe334_001',
          ownerId: owner1.id,
          title: 'CPE 334 Software Engineering Course Evaluation (Sprint 1)',
          description: 'Please provide constructive feedback on course lectures, TDD workshops, and sprint cadence.',
          status: SurveyStatus.PUBLISHED,
          responseMode: ResponseMode.IDENTIFIED,
          publishedAt: new Date('2026-11-02T10:00:00Z'),
          updatedAt: new Date(),
          Question: {
            create: [
              {
                id: 'qst_1',
                text: 'How satisfied are you with the TDD and CI/CD engineering workshops?',
                type: QuestionType.RATING,
                isRequired: true,
                displayOrder: 1,
              },
              {
                id: 'qst_2',
                text: 'Which development methodology fits your team best?',
                type: QuestionType.SINGLE_CHOICE,
                isRequired: true,
                displayOrder: 2,
                QuestionOption: {
                  create: [
                    { id: 'opt_1', label: 'TDD (Test-Driven Development)', displayOrder: 1 },
                    { id: 'opt_2', label: 'Feature-first with Integration Tests', displayOrder: 2 },
                    { id: 'opt_3', label: 'Spike & Prototype Exploration', displayOrder: 3 },
                  ],
                },
              },
              {
                id: 'qst_3',
                text: 'What suggestions do you have for upcoming Sprint 2 and 3 topics?',
                type: QuestionType.SHORT_TEXT,
                isRequired: false,
                displayOrder: 3,
              },
            ],
          },
        },
      });
    }

    // 2. Seed srv_facilities_002 (DRAFT)
    const existing2 = await prisma.survey.findUnique({ where: { id: 'srv_facilities_002' } });
    if (!existing2) {
      await prisma.survey.create({
        data: {
          id: 'srv_facilities_002',
          ownerId: owner1.id,
          title: 'CPE Engineering Computer Lab Hardware & Environment Feedback',
          description: 'Help department technicians evaluate monitor resolution, network speed, and chair ergonomics.',
          status: SurveyStatus.DRAFT,
          responseMode: ResponseMode.IDENTIFIED,
          updatedAt: new Date(),
          Question: {
            create: [
              {
                id: 'qst_fac_1',
                text: 'Rate the overall responsiveness of lab workstations (1 to 5):',
                type: QuestionType.RATING,
                isRequired: true,
                displayOrder: 1,
              },
            ],
          },
        },
      });
    }

    // 3. Seed srv_senior_003 (CLOSED)
    const existing3 = await prisma.survey.findUnique({ where: { id: 'srv_senior_003' } });
    if (!existing3) {
      await prisma.survey.create({
        data: {
          id: 'srv_senior_003',
          ownerId: owner1.id,
          title: 'Senior Capstone Project Track Preferences',
          description: 'Completed annual survey on senior project domains.',
          status: SurveyStatus.CLOSED,
          responseMode: ResponseMode.IDENTIFIED,
          publishedAt: new Date('2026-10-16T08:00:00Z'),
          closedAt: new Date('2026-11-05T18:00:00Z'),
          updatedAt: new Date(),
          Question: {
            create: [
              {
                id: 'qst_sen_1',
                text: 'Which capstone track is your primary preference?',
                type: QuestionType.SINGLE_CHOICE,
                isRequired: true,
                displayOrder: 1,
                QuestionOption: {
                  create: [
                    { id: 'opt_sen_1', label: 'AI & Data Engineering', displayOrder: 1 },
                    { id: 'opt_sen_2', label: 'Full-Stack & Cloud Systems', displayOrder: 2 },
                    { id: 'opt_sen_3', label: 'Embedded & IoT Security', displayOrder: 3 },
                  ],
                },
              },
              {
                id: 'qst_sen_2',
                text: 'Rate your readiness for the upcoming capstone proposal defense (1-5):',
                type: QuestionType.RATING,
                isRequired: true,
                displayOrder: 2,
              },
            ],
          },
        },
      });
    }
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
