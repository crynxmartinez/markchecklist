import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const agents = [
  { name: "Alexandra Haro", email: "alexandra@coryhometeam.com" },
  { name: "Alexandra Palacios-Garcia", email: "alexsandra@soldbycht.com" },
  { name: "Alicia Good", email: "alicia@coryhometeam.com" },
  { name: "Amanda Brown", email: "amandab@coryhometeam.com" },
  { name: "Ansar Khan", email: "ansar@coryhometeam.com" },
  { name: "Anthony Silva", email: "anthony@soldbycht.com" },
  { name: "Bridget Sisco", email: "bridget@coryhometeam.com" },
  { name: "Carmen Avalos", email: "carmen@coryhometeam.com" },
  { name: "Cavin Quintanilla", email: "cavin@coryhometeam.com" },
  { name: "Chad Hooper", email: "chadh@coryhometeam.com" },
  { name: "Cheree Moore-Zarty", email: "cheree@coryhometeam.com" },
  { name: "Cheryl Shaw", email: "cheryl@coryhometeam.com" },
  { name: "Connor McClurg", email: "connor@soldbycht.com" },
  { name: "Dana Garcia", email: "danamg@coryhometeam.com" },
  { name: "Diane Caddy", email: "dianec@coryhometeam.com" },
  { name: "Edward Kaveney \"Eddie\"", email: "eddie@coryhometeam.com" },
  { name: "George Folla", email: "george@coryhometeam.com" },
  { name: "Isy Ota-Oro", email: "isy@coryhometeam.com" },
  { name: "Jaime Ayala", email: "jaimea@soldbycht.com" },
  { name: "Jamie Carbajal", email: "jamie@coryhometeam.com" },
  { name: "Jeanette Simms", email: "jeanettes@coryhometeam.com" },
  { name: "Jeff Cottingham", email: "jeff@coryhometeam.com" },
  { name: "Jenna Melendez", email: "jenna@coryhometeam.com" },
  { name: "Jeremy Griego", email: "jc@soldbycht.com" },
  { name: "Jessica Cano", email: "jessicac@coryhometeam.com" },
  { name: "Joe Rodriguez", email: "joer@coryhometeam.com" },
  { name: "Joseph Calescibetta", email: "josephc@soldbycht.com" },
  { name: "Kathy Zumaya", email: "kathy@coryhometeam.com" },
  { name: "Kendra Jo Harlan", email: "kendra@coryhometeam.com" },
  { name: "Kunjal \"Kay\" Patel", email: "kay@coryhometeam.com" },
  { name: "Larry Randolph", email: "larry@coryhometeam.com" },
  { name: "Mario Muñoz", email: "mario@coryhometeam.com" },
  { name: "Martin Gomez", email: "martin@soldbycht.com" },
  { name: "Mercedes Torres", email: "mercedes@coryhometeam.com" },
  { name: "Michael Wickam", email: "michael@coryhometeam.com" },
  { name: "Monique Lewis", email: "monique@coryhometeam.com" },
  { name: "Myrna Peterson", email: "myrna@coryhometeam.com" },
  { name: "Nate Bunnell", email: "nate@coryhometeam.com" },
  { name: "Nicole Shettleroe", email: "nicole@coryhometeam.com" },
  { name: "Parisa Shamlou", email: "parisa@coryhometeam.com" },
  { name: "Rachele Lacey", email: "rachele@coryhometeam.com" },
  { name: "Renard Hamilton", email: "renard@coryhometeam.com" },
  { name: "Renée Keeling", email: "renee@coryhometeam.com" },
  { name: "Richard Luizzi", email: "richard@coryhometeam.com" },
  { name: "Robin Tapia", email: "robintapia@coryhometeam.com" },
  { name: "Ron Prunty", email: "ronp@coryhometeam.com" },
  { name: "Ronda Bryce", email: "ronda@coryhometeam.com" },
  { name: "Rosalina Williams", email: "rosalina@coryhometeam.com" },
  { name: "Spencer Salter", email: "spencer@coryhometeam.com" },
  { name: "Stacy Bridges", email: "stacy@coryhometeam.com" },
  { name: "Stephanie Carson", email: "stephanie.carson@coryhometeam.com" },
  { name: "Stephanie Casados", email: "stephaniec@coryhometeam.com" },
  { name: "Tyler Berneskie", email: "tyler@soldbycht.com" },
  { name: "Victor Acordagoitia", email: "victor@soldbycht.com" },
  { name: "Zayn Almusawi", email: "zayn@coryhometeam.com" }
]

async function main() {
  console.log('🌱 Seeding database...')

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { email: agent.email },
      update: {},
      create: {
        name: agent.name,
        email: agent.email,
        checklistState: [],
        percentage: 0
      }
    })
  }

  console.log(`✅ Seeded ${agents.length} agents`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
