// Script to check which agents from the roster exist in the database
// This is READ-ONLY - no modifications will be made

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Agent roster from Google Sheet (names and emails only for matching)
const rosterAgents = [
  { name: "Alexsandra Palacios-Garcia", email: "alexsandra@soldbycht.com" },
  { name: "Amy Feit", email: "amy@soldbycht.com" },
  { name: "Ansar Khan", email: "ansar@coryhometeam.com" },
  { name: "Baruch Rosenberg", email: "baruch@soldbycht.com" },
  { name: "Chad Hooper", email: "chadh@coryhometeam.com" },
  { name: "Charles Provido", email: "charles@coryhometeam.com" },
  { name: "Christine Van Hyning", email: "christine@soldbycht.com" },
  { name: "Connor McClurg", email: "connor@soldbycht.com" },
  { name: "Daisy Fredrick", email: "daisy@soldbycht.com" },
  { name: "Erskine Bonilla", email: "erskine@soldbycht.com" },
  { name: "Howard Newton", email: "howard@soldbycht.com" },
  { name: "Jaime Agredano", email: "jaime@soldbycht.com" },
  { name: "Jamie Carbajal", email: "jamie@coryhometeam.com" },
  { name: "Jeff Cottingham", email: "jeff@coryhometeam.com" },
  { name: "Joe Rodriguez", email: "joer@coryhometeam.com" },
  { name: "Kathy Zumaya", email: "kathy@coryhometeam.com" },
  { name: "Kristi Beneventi", email: "kristi@soldbycht.com" },
  { name: "Kylie Willis", email: "kylie@soldbycht.com" },
  { name: "Larry Randolph", email: "larry@coryhometeam.com" },
  { name: "Manuel Carrillo", email: "manuel@soldbycht.com" },
  { name: "Martin Gomez", email: "martin@soldbycht.com" },
  { name: "Michael Wickam", email: "michael@coryhometeam.com" },
  { name: "Parisa Shamlou", email: "parisa@coryhometeam.com" },
  { name: "Rachele Lacey", email: "rachele@coryhometeam.com" },
  { name: "Renée Keeling", email: "renee@coryhometeam.com" },
  { name: "Ron Prunty", email: "ronp@coryhometeam.com" },
  { name: "Samantha Gonzales", email: "samanthag@soldbycht.com" },
  { name: "Sarah Miller", email: "sarah@soldbycht.com" },
  { name: "Stacy Bridges", email: "stacy@coryhometeam.com" },
  { name: "Tyler Bernetskie", email: "tyler@soldbycht.com" },
  { name: "Cavin Quintanilla", email: "cavin@coryhometeam.com" },
  { name: "Cheree Moore-Zarty", email: "cheree@coryhometeam.com" },
  { name: "Cheryl Shaw", email: "cheryl@coryhometeam.com" },
  { name: "Edward Kaveney", email: "eddie@coryhometeam.com" },
  { name: "George Folia", email: "george@coryhometeam.com" },
  { name: "Isy Ota-Oro", email: "isy@coryhometeam.com" },
  { name: "Jenna Melendez", email: "jenna@coryhometeam.com" },
  { name: "Mario Muñoz", email: "mario@coryhometeam.com" },
  { name: "Mercedes Torres", email: "mercedes@coryhometeam.com" },
  { name: "Monique Lewis", email: "monique@coryhometeam.com" },
  { name: "Rosalina Williams", email: "rosalina@coryhometeam.com" },
  { name: "Stephanie Carson", email: "stephanie.carson@coryhometeam.com" },
  { name: "Alexandra Haro", email: "alexandra@coryhometeam.com" },
  { name: "Alicia Good", email: "alicia@coryhometeam.com" },
  { name: "Bridget Sisco", email: "bridget@coryhometeam.com" },
  { name: "Diane Caddy", email: "dianec@coryhometeam.com" },
  { name: "Kendra Jo Harlan", email: "kendra@coryhometeam.com" },
  { name: "Kunjal Patel", email: "kay@coryhometeam.com" },
  { name: "Myrna Peterson", email: "myrna@coryhometeam.com" },
  { name: "Nate Bunnell", email: "nate@coryhometeam.com" },
  { name: "Richard Luizzi", email: "richard@coryhometeam.com" },
  { name: "Robin Tapia", email: "robintapia@coryhometeam.com" },
  { name: "Spencer Salter", email: "spencer@coryhometeam.com" },
  { name: "Stephanie Casados", email: "stephaniec@coryhometeam.com" },
  { name: "Blake Cory", email: "blake@coryhometeam.com" },
  { name: "Melissa Mantz", email: "melissa@coryhometeam.com" },
]

async function checkAgents() {
  console.log("=".repeat(60))
  console.log("CHECKING AGENT ROSTER AGAINST DATABASE")
  console.log("=".repeat(60))
  console.log(`Total agents in roster: ${rosterAgents.length}\n`)

  // Get all agents from Agent table
  const dbAgents = await prisma.agent.findMany({
    select: { name: true, email: true }
  })
  console.log(`Agents in Agent table: ${dbAgents.length}`)

  // Get all contacts from Contact table
  const dbContacts = await prisma.contact.findMany({
    select: { firstName: true, lastName: true, email: true }
  })
  console.log(`Contacts in Contact table: ${dbContacts.length}\n`)

  // Check matches
  const foundInAgents: string[] = []
  const foundInContacts: string[] = []
  const notFound: string[] = []

  for (const agent of rosterAgents) {
    const emailLower = agent.email.toLowerCase()
    
    // Check Agent table by email
    const inAgentTable = dbAgents.find(a => a.email.toLowerCase() === emailLower)
    
    // Check Contact table by email
    const inContactTable = dbContacts.find(c => c.email?.toLowerCase() === emailLower)
    
    if (inAgentTable) {
      foundInAgents.push(`${agent.name} (${agent.email})`)
    } else if (inContactTable) {
      const contactName = `${inContactTable.firstName || ''} ${inContactTable.lastName || ''}`.trim()
      foundInContacts.push(`${agent.name} → Contact: "${contactName}" (${agent.email})`)
    } else {
      notFound.push(`${agent.name} (${agent.email})`)
    }
  }

  console.log("=".repeat(60))
  console.log(`FOUND IN AGENT TABLE: ${foundInAgents.length}`)
  console.log("=".repeat(60))
  foundInAgents.forEach(a => console.log(`  ✓ ${a}`))

  console.log("\n" + "=".repeat(60))
  console.log(`FOUND IN CONTACT TABLE: ${foundInContacts.length}`)
  console.log("=".repeat(60))
  foundInContacts.forEach(c => console.log(`  ✓ ${c}`))

  console.log("\n" + "=".repeat(60))
  console.log(`NOT FOUND IN DATABASE: ${notFound.length}`)
  console.log("=".repeat(60))
  notFound.forEach(n => console.log(`  ✗ ${n}`))

  console.log("\n" + "=".repeat(60))
  console.log("SUMMARY")
  console.log("=".repeat(60))
  console.log(`Total in roster:        ${rosterAgents.length}`)
  console.log(`Found in Agent table:   ${foundInAgents.length}`)
  console.log(`Found in Contact table: ${foundInContacts.length}`)
  console.log(`Not found anywhere:     ${notFound.length}`)

  await prisma.$disconnect()
}

checkAgents().catch(console.error)
