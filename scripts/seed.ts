import { PrismaClient } from '@prisma/client';
import { LeadStatus } from '../src/services/lead.service';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  const leads = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      status: LeadStatus.NEW,
      source: 'Website',
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '0987654321',
      status: LeadStatus.CONTACTED,
      source: 'Referral',
    },
    {
      name: 'Bob Wilson',
      email: 'bob@example.com',
      phone: '5556667777',
      status: LeadStatus.QUALIFIED,
      source: 'LinkedIn',
    },
    {
      name: 'Alice Brown',
      email: 'alice@example.com',
      phone: '1112223333',
      status: LeadStatus.CONVERTED,
      source: 'Advertisement',
    },
    {
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      phone: '4445556666',
      status: LeadStatus.LOST,
      source: 'Cold Call',
    },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { email: lead.email },
      update: {},
      create: lead,
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
