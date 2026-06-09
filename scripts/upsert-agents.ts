// Script to upsert all agents from the roster
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper to parse DRE expiration date
function parseDreExpiration(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const [month, day, year] = dateStr.split('/')
  if (!month || !day || !year) return null
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

// Full roster data from Google Sheet
const rosterAgents = [
  { name: "Alexsandra Palacios-Garcia", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "Yes", email: "alexsandra@soldbycht.com", phone: "(909) 684-2320", dre: "02040415", dreExpiration: "11/3/2029", birthday: "April 2", anniversary: "02-23-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Amy Feit", status: "Active", leadTeam: "Processing", coach: "Kiona Grantham", agentDevelopment: null, email: "amy@soldbycht.com", phone: "(212) 470-8100", dre: "01309143", dreExpiration: "4/24/2029", birthday: "May 18", anniversary: "04-27-2026", language: null, mlsId: null, subscription: null, tc: "Alexis", source: null },
  { name: "Ansar Khan", status: "Part Time", leadTeam: "Inactive", coach: "Kiona Grantham", agentDevelopment: "Yes", email: "ansar@coryhometeam.com", phone: "(949) 923-1020", dre: "01947545", dreExpiration: "2/6/2030", birthday: "April 8", anniversary: "10-07-2025", language: null, mlsId: null, subscription: "Outside", tc: "Outside", source: "Referral" },
  { name: "Baruch Rosenberg", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: null, email: "baruch@soldbycht.com", phone: "(619) 436-9500", dre: "01709370", dreExpiration: "4/19/2030", birthday: "July 19", anniversary: "04-13-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Chad Hooper", status: "Part Time", leadTeam: "Inactive", coach: "Kiona Grantham", agentDevelopment: "No", email: "chadh@coryhometeam.com", phone: "(949) 529-8787", dre: "01895792", dreExpiration: "5/26/2027", birthday: "June 23", anniversary: "10-10-2025", language: null, mlsId: "SHOOPCHA", subscription: "No", tc: "Alexis", source: "FB" },
  { name: "Charles Provido", status: "Inactive", leadTeam: "Inactive", coach: "Kiona Grantham", agentDevelopment: "No", email: "charles@coryhometeam.com", phone: "(951) 719-9343", dre: "02072708", dreExpiration: "10/24/2026", birthday: "June 22", anniversary: "08-24-2020", language: null, mlsId: "SWPROVCHA", subscription: "No", tc: "Kenia", source: null },
  { name: "Christine Van Hyning", status: "Active", leadTeam: "Processing", coach: "Kiona Grantham", agentDevelopment: null, email: "christine@soldbycht.com", phone: "(909) 921-7766", dre: "01789486", dreExpiration: "6/18/2029", birthday: "November 10", anniversary: "04-27-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Connor McClurg", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "Yes", email: "connor@soldbycht.com", phone: "(619) 985-3716", dre: "02426417", dreExpiration: "2/23/2030", birthday: "August 11", anniversary: "02-24-2026", language: null, mlsId: null, subscription: null, tc: "Kenia", source: null },
  { name: "Daisy Fredrick", status: "Active", leadTeam: "Processing", coach: "Kiona Grantham", agentDevelopment: null, email: "daisy@soldbycht.com", phone: "(323) 873-7933", dre: "02224310", dreExpiration: "1/29/2028", birthday: "January 9", anniversary: "04-26-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Erskine Bonilla", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: null, email: "erskine@soldbycht.com", phone: "(360) 314-8015", dre: "02228088", dreExpiration: "10/24/2027", birthday: "November 29", anniversary: "04-06-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Howard Newton", status: "Active", leadTeam: "Processing", coach: "Kiona Grantham", agentDevelopment: null, email: "howard@soldbycht.com", phone: "(949) 285-9902", dre: "01391067", dreExpiration: "7/7/2027", birthday: "February 22", anniversary: "04-27-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Jaime Agredano", status: "Processing", leadTeam: "Processing", coach: "Kiona Grantham", agentDevelopment: null, email: "jaime@soldbycht.com", phone: "(951) 837-7710", dre: "01763736", dreExpiration: "11/14/2028", birthday: "June 23", anniversary: "06-02-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Jamie Carbajal", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "Yes", email: "jamie@coryhometeam.com", phone: "(951) 906-0708", dre: "02003066", dreExpiration: "2/26/2030", birthday: "November 6", anniversary: "12-29-2025", language: null, mlsId: null, subscription: null, tc: "Kenia", source: null },
  { name: "Jeff Cottingham", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "No", email: "jeff@coryhometeam.com", phone: "(951) 813-7889", dre: "01200254", dreExpiration: "8/13/2029", birthday: "June 19", anniversary: "01-05-2026", language: null, mlsId: "SWCOTTJEF", subscription: "No", tc: "Kenia", source: null },
  { name: "Joe Rodriguez", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "No", email: "joer@coryhometeam.com", phone: "(951) 757-2386", dre: "01405644", dreExpiration: "11/5/2027", birthday: "December 4", anniversary: "07-24-2024", language: null, mlsId: "TRODRJOE", subscription: "Yes", tc: "Alexis", source: null },
  { name: "Kathy Zumaya", status: "Active", leadTeam: "Inactive", coach: "Kiona Grantham", agentDevelopment: "No", email: "kathy@coryhometeam.com", phone: "(858) 335-5473", dre: "02236749", dreExpiration: "3/3/2028", birthday: "May 12", anniversary: "04-28-2025", language: null, mlsId: "SAND-706737", subscription: "No", tc: "Alexis", source: null },
  { name: "Kristi Beneventi", status: "Processing", leadTeam: "Processing", coach: "Kiona Grantham", agentDevelopment: null, email: "kristi@soldbycht.com", phone: "(949) 292-4248", dre: "01980359", dreExpiration: "7/5/2028", birthday: "August 14", anniversary: "05-04-2026", language: null, mlsId: "SWVIRAKRI", subscription: null, tc: "Alexis", source: null },
  { name: "Kylie Willis", status: "Processing", leadTeam: "Processing", coach: "Kiona Grantham", agentDevelopment: null, email: "kylie@soldbycht.com", phone: "(951) 264-3026", dre: "02231872", dreExpiration: "1/18/2028", birthday: null, anniversary: "05-11-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Larry Randolph", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "No", email: "larry@coryhometeam.com", phone: "(619) 776-9995", dre: "02182788", dreExpiration: "1/29/2028", birthday: "July 27", anniversary: "02-25-2024", language: null, mlsId: "SWRANDLAR", subscription: "No", tc: "Alexis", source: null },
  { name: "Manuel Carrillo", status: "Processing", leadTeam: "Processing", coach: "Kiona Grantham", agentDevelopment: null, email: "manuel@soldbycht.com", phone: "(951) 956-3740", dre: "01918177", dreExpiration: "8/9/2028", birthday: "December 10", anniversary: "05-18-2026", language: null, mlsId: "SWCARRMAN", subscription: null, tc: null, source: null },
  { name: "Martin Gomez", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "Yes", email: "martin@soldbycht.com", phone: "(760) 900-8320", dre: "02260352", dreExpiration: "4/10/2029", birthday: "November 26", anniversary: "02-23-2026", language: null, mlsId: null, subscription: null, tc: "Kenia", source: null },
  { name: "Michael Wickam", status: "Inactive", leadTeam: "Inactive", coach: "Kiona Grantham", agentDevelopment: "No", email: "michael@coryhometeam.com", phone: "(951) 219-9203", dre: "02099944", dreExpiration: "4/18/2029", birthday: "January 9", anniversary: "06-22-2020", language: null, mlsId: "SWWICKMIC", subscription: "No", tc: "Alexis", source: null },
  { name: "Parisa Shamlou", status: "Part Time", leadTeam: "Inactive", coach: "Kiona Grantham", agentDevelopment: "No", email: "parisa@coryhometeam.com", phone: "(408) 627-2331", dre: "02082362", dreExpiration: "4/15/2027", birthday: "May 30", anniversary: "11-04-2025", language: null, mlsId: null, subscription: "No", tc: "Kenia", source: "FB" },
  { name: "Rachele Lacey", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "No", email: "rachele@coryhometeam.com", phone: "(619) 559-6176", dre: "02223207", dreExpiration: "10/10/2027", birthday: "December 14", anniversary: "08-14-2023", language: "Spanish", mlsId: "SWLACERAC", subscription: "No", tc: "Kenia", source: null },
  { name: "Renée Keeling", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "No", email: "renee@coryhometeam.com", phone: "(951) 334-3775", dre: "01498147", dreExpiration: "5/17/2029", birthday: "March 31", anniversary: "10-22-2025", language: null, mlsId: "TRABYREN", subscription: "No", tc: "Alexis", source: "Referral" },
  { name: "Ron Prunty", status: "Part Time", leadTeam: "Inactive", coach: "Kiona Grantham", agentDevelopment: "No", email: "ronp@coryhometeam.com", phone: "(858) 914-7091", dre: "01440715", dreExpiration: "11/22/2029", birthday: "August 30", anniversary: "01-20-2025", language: null, mlsId: "SAND-632063", subscription: "No", tc: "Kenia", source: null },
  { name: "Samantha Gonzales", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: null, email: "samanthag@soldbycht.com", phone: "(951) 442-6731", dre: "02284633", dreExpiration: "5/26/2029", birthday: "September 10", anniversary: "05-04-2026", language: null, mlsId: null, subscription: null, tc: "Alexis", source: null },
  { name: "Sarah Miller", status: "Active", leadTeam: "Inactive", coach: "Kiona Grantham", agentDevelopment: null, email: "sarah@soldbycht.com", phone: "(714) 474-7759", dre: "02069608", dreExpiration: "7/17/2026", birthday: "January 4", anniversary: "03-31-2026", language: null, mlsId: null, subscription: null, tc: null, source: null },
  { name: "Stacy Bridges", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "Yes", email: "stacy@coryhometeam.com", phone: "(951) 705-5519", dre: "02213328", dreExpiration: "4/12/2027", birthday: "December 15", anniversary: "12-11-2025", language: null, mlsId: null, subscription: "No", tc: "Kenia", source: null },
  { name: "Tyler Bernetskie", status: "Active", leadTeam: "Active", coach: "Kiona Grantham", agentDevelopment: "No", email: "tyler@soldbycht.com", phone: "(760) 829-3478", dre: "02144941", dreExpiration: "3/18/2030", birthday: "March 22", anniversary: "03-16-2026", language: null, mlsId: null, subscription: "No", tc: "Alexis", source: null },
  { name: "Cavin Quintanilla", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "cavin@coryhometeam.com", phone: "(310) 259-2465", dre: "01223591", dreExpiration: "9/17/2028", birthday: "August 16", anniversary: "01-14-2026", language: null, mlsId: null, subscription: "No", tc: "Kenia", source: null },
  { name: "Cheree Moore-Zarty", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "Yes", email: "cheree@coryhometeam.com", phone: "(760) 877-0600", dre: "02254774", dreExpiration: "4/22/2029", birthday: "December 30", anniversary: "10-08-2025", language: null, mlsId: null, subscription: "Yes", tc: "Alexis", source: "Referral" },
  { name: "Cheryl Shaw", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "cheryl@coryhometeam.com", phone: "(951) 551-5229", dre: "01998287", dreExpiration: "2/21/2028", birthday: "October 18", anniversary: "07-18-2023", language: null, mlsId: "SWSHAWCHE", subscription: "No", tc: "Alexis", source: null },
  { name: "Edward Kaveney", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "eddie@coryhometeam.com", phone: "(562) 714-4601", dre: "02077190", dreExpiration: "10/29/2026", birthday: "August 14", anniversary: "07-24-2023", language: null, mlsId: "SWKAVEEDW", subscription: "No", tc: "Kenia", source: null },
  { name: "George Folia", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "george@coryhometeam.com", phone: "(760) 689-8060", dre: "01815964", dreExpiration: "10/11/2027", birthday: "December 13", anniversary: "12-16-2025", language: null, mlsId: null, subscription: "Yes", tc: "Alexis", source: null },
  { name: "Isy Ota-Oro", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "Yes", email: "isy@coryhometeam.com", phone: "(714) 337-0638", dre: "02259200", dreExpiration: "7/8/2029", birthday: "November 30", anniversary: "12-08-2025", language: null, mlsId: null, subscription: "No", tc: "Kenia", source: null },
  { name: "Jenna Melendez", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "jenna@coryhometeam.com", phone: "(951) 965-0669", dre: "02109563", dreExpiration: "9/9/2028", birthday: "May 2", anniversary: "02-01-2022", language: null, mlsId: "SWMELEJEN", subscription: "No", tc: "Kenia", source: null },
  { name: "Mario Muñoz", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "mario@coryhometeam.com", phone: "(562) 587-3990", dre: "02162899", dreExpiration: "3/21/2030", birthday: "March 6", anniversary: "09-20-2021", language: "Spanish", mlsId: "SWMARMUNO", subscription: "Yes", tc: "Alexis", source: null },
  { name: "Mercedes Torres", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "mercedes@coryhometeam.com", phone: "(951) 223-5127", dre: "02201161", dreExpiration: "11/17/2026", birthday: "November 4", anniversary: "09-08-2025", language: "Spanish", mlsId: "SWTORRMERR", subscription: "No", tc: "Alexis", source: "Referral" },
  { name: "Monique Lewis", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "monique@coryhometeam.com", phone: "(714) 476-8827", dre: "02160204", dreExpiration: "9/26/2029", birthday: "November 20", anniversary: "09-10-2025", language: null, mlsId: "OCLEWIMON", subscription: "No", tc: "Alexis", source: "Referral" },
  { name: "Rosalina Williams", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "rosalina@coryhometeam.com", phone: "(619) 892-6064", dre: "02163820", dreExpiration: "10/28/2029", birthday: "September 26", anniversary: "02-10-2025", language: null, mlsId: "SWWILROSA", subscription: "No", tc: "Kenia", source: null },
  { name: "Stephanie Carson", status: "Active", leadTeam: "Active", coach: "Mario Munoz", agentDevelopment: "No", email: "stephanie.carson@coryhometeam.com", phone: "(760) 670-5155", dre: "01417660", dreExpiration: "11/30/2027", birthday: "March 26", anniversary: "04-07-2025", language: null, mlsId: "151813", subscription: "Yes", tc: "Alexis", source: null },
  { name: "Alexandra Haro", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "alexandra@coryhometeam.com", phone: "(951) 894-9074", dre: "02211296", dreExpiration: "4/17/2027", birthday: "July 26", anniversary: "04-15-2024", language: "Romanian", mlsId: "SWHAROIUL", subscription: "Yes", tc: "Alexis", source: null },
  { name: "Alicia Good", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "alicia@coryhometeam.com", phone: "(951) 760-9043", dre: "02033553", dreExpiration: "4/30/2029", birthday: "September 3", anniversary: "03-25-2019", language: null, mlsId: "SWGOODALI", subscription: "No", tc: "Alexis", source: null },
  { name: "Bridget Sisco", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "bridget@coryhometeam.com", phone: "(435) 817-3210", dre: "01866045", dreExpiration: "7/23/2027", birthday: "September 24", anniversary: "03-12-2016", language: null, mlsId: "TSISCBRI", subscription: "Yes", tc: "Kenia", source: null },
  { name: "Diane Caddy", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "dianec@coryhometeam.com", phone: "(951) 965-1760", dre: "01878582", dreExpiration: "12/9/2026", birthday: "June 14", anniversary: "01-14-2026", language: null, mlsId: "TCADDDIA", subscription: "No", tc: "Kenia", source: null },
  { name: "Kendra Jo Harlan", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "kendra@coryhometeam.com", phone: "(951) 704-2362", dre: "02168500", dreExpiration: "2/3/2030", birthday: "April 30", anniversary: "02-11-2022", language: null, mlsId: "SWHARLKEN", subscription: "No", tc: "Kenia", source: null },
  { name: "Kunjal Patel", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "kay@coryhometeam.com", phone: "(210) 517-1906", dre: "02254635", dreExpiration: "3/12/2029", birthday: "June 14", anniversary: "03-31-2025", language: null, mlsId: "SWPATEKUN", subscription: "No", tc: "Alexis", source: null },
  { name: "Myrna Peterson", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "myrna@coryhometeam.com", phone: "(650) 678-0839", dre: "01187483", dreExpiration: "9/13/2026", birthday: "January 3", anniversary: "11-25-2024", language: "Spanish", mlsId: "SWPETEMYR", subscription: "Yes", tc: "Alexis", source: null },
  { name: "Nate Bunnell", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "nate@coryhometeam.com", phone: "(951) 294-4114", dre: "02029120", dreExpiration: "4/14/2029", birthday: "February 5", anniversary: "12-09-2019", language: "Spanish/Portuguese", mlsId: "SWBUNNNAT", subscription: "No", tc: "Alexis", source: null },
  { name: "Richard Luizzi", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "richard@coryhometeam.com", phone: "(858) 335-5631", dre: "01766683", dreExpiration: "4/30/2027", birthday: "December 26", anniversary: "07-14-2020", language: null, mlsId: "SAND-644125", subscription: "Outside", tc: "Outside", source: null },
  { name: "Robin Tapia", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "robintapia@coryhometeam.com", phone: "(760) 687-3339", dre: "02179930", dreExpiration: "6/4/2026", birthday: "September 21", anniversary: "08-22-2022", language: "Spanish", mlsId: "SWTAPIROB", subscription: "No", tc: "Alexis", source: null },
  { name: "Spencer Salter", status: "Active", leadTeam: "Active", coach: "Melissa Perla", agentDevelopment: "No", email: "spencer@coryhometeam.com", phone: "(818) 879-3293", dre: "02082680", dreExpiration: "3/19/2027", birthday: "April 11", anniversary: "12-30-2025", language: null, mlsId: "Sr207066888", subscription: "No", tc: "Kenia", source: null },
  { name: "Stephanie Casados", status: "Active", leadTeam: "Inactive", coach: "Melissa Perla", agentDevelopment: "No", email: "stephaniec@coryhometeam.com", phone: "(951) 466-6383", dre: "02182349", dreExpiration: "8/15/2026", birthday: "December 15", anniversary: "09-19-2022", language: null, mlsId: "SWCASASTE", subscription: "No", tc: "Kenia", source: null },
  { name: "Blake Cory", status: "Active", leadTeam: null, coach: "N/A", agentDevelopment: "No", email: "blake@coryhometeam.com", phone: null, dre: "01781649", dreExpiration: null, birthday: null, anniversary: null, language: null, mlsId: "TCORYBLA", subscription: "No", tc: "Alexis", source: null },
  { name: "Melissa Mantz", status: "Active", leadTeam: null, coach: "N/A", agentDevelopment: "No", email: "melissa@coryhometeam.com", phone: "(951) 250-7165", dre: "02079338", dreExpiration: null, birthday: null, anniversary: null, language: null, mlsId: null, subscription: "No", tc: "Alexis", source: null },
]

async function upsertAgents() {
  console.log("=".repeat(60))
  console.log("UPSERTING AGENTS FROM ROSTER")
  console.log("=".repeat(60))
  console.log(`Total agents to process: ${rosterAgents.length}\n`)

  let created = 0
  let updated = 0
  let errors = 0

  for (const agent of rosterAgents) {
    try {
      const result = await prisma.agent.upsert({
        where: { email: agent.email },
        update: {
          name: agent.name,
          phone: agent.phone,
          status: agent.status,
          leadTeam: agent.leadTeam,
          coach: agent.coach,
          agentDevelopment: agent.agentDevelopment,
          dre: agent.dre,
          dreExpiration: parseDreExpiration(agent.dreExpiration),
          birthday: agent.birthday,
          anniversary: agent.anniversary,
          language: agent.language,
          mlsId: agent.mlsId,
          subscription: agent.subscription,
          tc: agent.tc,
          source: agent.source,
        },
        create: {
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          status: agent.status,
          leadTeam: agent.leadTeam,
          coach: agent.coach,
          agentDevelopment: agent.agentDevelopment,
          dre: agent.dre,
          dreExpiration: parseDreExpiration(agent.dreExpiration),
          birthday: agent.birthday,
          anniversary: agent.anniversary,
          language: agent.language,
          mlsId: agent.mlsId,
          subscription: agent.subscription,
          tc: agent.tc,
          source: agent.source,
        },
      })

      // Check if it was created or updated by comparing timestamps
      const isNew = result.createdAt.getTime() === result.updatedAt.getTime()
      if (isNew) {
        created++
        console.log(`  ✓ CREATED: ${agent.name}`)
      } else {
        updated++
        console.log(`  ✓ UPDATED: ${agent.name}`)
      }
    } catch (error: any) {
      errors++
      console.log(`  ✗ ERROR: ${agent.name} - ${error.message}`)
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("SUMMARY")
  console.log("=".repeat(60))
  console.log(`Created: ${created}`)
  console.log(`Updated: ${updated}`)
  console.log(`Errors:  ${errors}`)
  console.log(`Total:   ${rosterAgents.length}`)

  // Show final count
  const totalAgents = await prisma.agent.count()
  console.log(`\nTotal agents in database: ${totalAgents}`)

  await prisma.$disconnect()
}

upsertAgents().catch(console.error)
