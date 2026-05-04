import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating all contacts with null subAccount...')
  
  const result = await prisma.contact.updateMany({
    where: {
      subAccount: null,
    },
    data: {
      subAccount: 'Cory Home Team Agent Recruiter',
    },
  })

  console.log(`Updated ${result.count} contacts`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
