/**
 * Replaces ALL agent roster data with the updated CHT roster.
 *
 * WARNING: this deletes every existing Agent row first, then inserts the
 * provided dataset. checklistState/percentage reset to defaults.
 *
 * Usage: tsx scripts/import-agents-roster.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Columns in order:
// name, status, leadTeam, coach, agentDevelopment, email, phone, dre,
// dreExpiration, birthday, anniversary, language, mlsId, tc, subscription,
// isaServices, source
type Row = [
  string, string, string, string, string, string, string, string,
  string, string, string, string, string, string, string, string, string,
]

const ROWS: Row[] = [
  ['Alexandra Haro', 'Active', 'Active', 'Melissa Perla', 'No', 'alexandra@coryhometeam.com', '(951) 894-9074', '02211296', '4/17/2027', 'July 26', '04-15-2024', 'Romanian', 'SWHAROIUL', 'Alexis', 'Yes', 'No', ''],
  ['Alexsandra Palacios-Garcia', 'Active', 'Active', 'Kiona Grantham', 'Yes', 'alexsandra@soldbycht.com', '(909) 684-2320', '02040415', '11/3/2029', 'April 2', '02-23-2026', '', '', '', 'No', 'No', ''],
  ['Alicia Good', 'Active', 'Active', 'Melissa Perla', 'No', 'alicia@coryhometeam.com', '(951) 760-9043', '02033553', '4/30/2029', 'September 3', '03-25-2019', '', 'SWGOODALI', 'Alexis', 'Yes', 'No', ''],
  ['Amy Feit', 'Active', 'Active', 'Kiona Grantham', '', 'amy@soldbycht.com', '(212) 470-8100', '01309143', '4/24/2029', 'May 18', '04-27-2026', '', '', 'Alexis', 'No', 'No', ''],
  ['Ansar Khan', 'Part Time', 'Inactive', 'Kiona Grantham', 'Yes', 'ansar@coryhometeam.com', '(949) 923-1020', '01947545', '2/6/2030', 'April 8', '10-07-2025', '', '', 'Outside', 'Outside', 'No', 'Referral'],
  ['Baruch Rosenberg', 'Active', 'Active', 'Kiona Grantham', '', 'baruch@soldbycht.com', '(619) 436-9500', '01709370', '4/19/2030', 'July 19', '04-13-2026', '', '', '', 'No', 'No', ''],
  ['Blake Cory', 'Active', 'Active', 'N/A', 'No', 'blake@coryhometeam.com', '(949) 668-4733', '01781649', '', '', '', '', 'TCORYBLA', 'Alexis', 'Yes', 'Yes', ''],
  ['Bridget Sisco', 'Active', 'Active', 'Melissa Perla', 'No', 'bridget@coryhometeam.com', '(435) 817-3210', '01866045', '7/23/2027', 'September 24', '03-12-2016', '', 'TSISCBRI', 'Kenia', 'Yes', 'Yes', ''],
  ['Cavin Quintanilla', 'Active', 'Active', 'Mario Munoz', 'No', 'cavin@coryhometeam.com', '(310) 259-2465', '01223591', '9/17/2028', 'August 16', '01-14-2026', '', '', 'Kenia', 'Yes', 'Yes', ''],
  ['Chad Hooper', 'Part Time', 'Inactive', 'Kiona Grantham', 'No', 'chadh@coryhometeam.com', '(949) 529-8787', '01895792', '5/26/2027', 'June 23', '10-10-2025', '', 'SHOOPCHA', 'Alexis', 'No', 'No', 'FB'],
  ['Charles Provido', 'Part Time', 'Inactive', 'Kiona Grantham', 'No', 'charles@coryhometeam.com', '(951) 719-9343', '02072708', '10/24/2026', 'June 22', '08-24-2020', '', 'SWPROVCHA', 'Kenia', 'No', 'No', ''],
  ['Cheree Moore-Zarty', 'Active', 'Active', 'Mario Munoz', 'Yes', 'cheree@coryhometeam.com', '(760) 877-0600', '02254774', '4/22/2029', 'December 30', '10-08-2025', '', '', 'Alexis', 'Yes', 'No', 'Referral'],
  ['Cheryl Shaw', 'Active', 'Active', 'Mario Munoz', 'No', 'cheryl@coryhometeam.com', '(951) 551-5229', '01998287', '2/21/2028', 'October 18', '07-18-2023', '', 'SWSHAWCHE', 'Alexis', 'No', 'No', ''],
  ['Christine Van Hyning', 'Active', 'Active', 'Kiona Grantham', '', 'christine@soldbycht.com', '(909) 921-7766', '01789486', '6/18/2029', 'November 10', '04-27-2026', '', '', 'Alexis', 'No', 'No', ''],
  ['Connor McClurg', 'Active', 'Active', 'Kiona Grantham', 'Yes', 'connor@soldbycht.com', '(619) 985-3716', '02426417', '2/23/2030', 'August 11', '02-24-2026', '', '', 'Kenia', 'No', 'No', ''],
  ['Diane Caddy', 'Active', 'Active', 'Melissa Perla', 'No', 'dianec@coryhometeam.com', '(951) 965-1760', '01878582', '12/9/2026', 'June 14', '01-14-2026', '', 'TCADDDIA', 'Kenia', 'No', 'Yes', ''],
  ['Edward Kaveney "Eddie"', 'Active', 'Active', 'Mario Munoz', 'No', 'eddie@coryhometeam.com', '(562) 714-4601', '02077190', '10/29/2026', 'August 14', '07-24-2023', '', 'SWKAVEEDW', 'Kenia', 'No', 'No', ''],
  ['Erskine Bonilla', 'Active', 'Active', 'Kiona Grantham', '', 'erskine@soldbycht.com', '(360) 314-8015', '02228088', '10/24/2027', 'November 29', '04-06-2026', '', '', '', 'No', 'No', ''],
  ['George Folia', 'Part Time', 'Inactive', 'Kiona Grantham', 'No', 'george@coryhometeam.com', '(760) 689-8060', '01815964', '10/11/2027', 'December 13', '12-16-2025', '', '', 'Alexis', 'No', 'No', ''],
  ['Howard Newton', 'Active', 'Active', 'Kiona Grantham', '', 'howard@soldbycht.com', '(949) 285-9902', '01391067', '7/7/2027', 'February 22', '04-27-2026', '', '', '', 'No', 'No', ''],
  ['Isy Ota-Oro', 'Active', 'Active', 'Mario Munoz', 'Yes', 'isy@coryhometeam.com', '(714) 337-0638', '02259200', '7/8/2029', 'November 30', '12-08-2025', '', '', 'Kenia', 'Yes', 'No', ''],
  ['Jaime Agredano', 'Processing', 'Processing', 'Kiona Grantham', '', 'jaime@soldbycht.com', '(951) 837-7710', '01763736', '11/14/2028', 'June 23', '06-02-2026', '', '', '', 'No', 'No', ''],
  ['Jamie Carbajal', 'Active', 'Active', 'Kiona Grantham', 'Yes', 'jamie@coryhometeam.com', '(951) 906-0708', '02003066', '2/26/2030', 'November 6', '12-29-2025', '', '', 'Kenia', 'No', 'No', ''],
  ['Jeff Cottingham', 'Active', 'Active', 'Kiona Grantham', 'No', 'jeff@coryhometeam.com', '(951) 813-7889', '01200254', '8/13/2029', 'June 19', '01-05-2026', '', 'SWCOTTJEF', 'Kenia', 'No', 'No', ''],
  ['Jenna Melendez', 'Active', 'Active', 'Mario Munoz', 'No', 'jenna@coryhometeam.com', '(951) 965-0669', '02109563', '9/9/2028', 'May 2', '02-01-2022', '', 'SWMELEJEN', 'Kenia', 'No', 'No', ''],
  ['Joe Rodriguez', 'Active', 'Active', 'Kiona Grantham', 'No', 'joer@coryhometeam.com', '(951) 757-2386', '01405644', '11/5/2027', 'December 4', '07-24-2024', '', 'TRODRJOE', 'Alexis', 'Yes', 'No', ''],
  ['Kathy Zumaya', 'Part Time', 'Inactive', 'Kiona Grantham', 'No', 'kathy@coryhometeam.com', '(858) 335-5473', '02236749', '3/3/2028', 'May 12', '04-28-2025', '', 'SAND-706737', 'Alexis', 'No', 'No', ''],
  ['Kendra Jo Harlan', 'Active', 'Active', 'Melissa Perla', 'No', 'kendra@coryhometeam.com', '(951) 704-2362', '02168500', '2/3/2030', 'April 30', '02-11-2022', '', 'SWHARLKEN', 'Kenia', 'Yes', 'Yes', ''],
  ['Kiona Grantham', 'Active', 'Active', 'N/A', 'No', 'kiona@coryhometeam.com', '(951) 497-0679', '02075788', '11/18/2026', 'July 4', '7/10/2017', '', '', '', '', '', ''],
  ['Kristi Beneventi', 'Active', 'Active', 'Kiona Grantham', '', 'kristi@soldbycht.com', '(949) 292-4248', '01980359', '7/5/2028', 'August 14', '05-04-2026', '', 'SWVIRAKRI', 'Alexis', 'No', 'No', ''],
  ['Kunjal "Kay" Patel', 'Active', 'Active', 'Melissa Perla', 'No', 'kay@coryhometeam.com', '(210) 517-1906', '02254635', '3/12/2029', 'June 14', '03-31-2025', '', 'SWPATEKUN', 'Alexis', 'No', 'No', ''],
  ['Kylie Willis', 'Processing', 'Processing', 'Kiona Grantham', '', 'kylie@soldbycht.com', '(951) 264-3026', '02231872', '1/18/2028', '', '05-11-2026', '', '', '', 'No', 'No', ''],
  ['Larry Randolph', 'Part Time', 'Inactive', 'Kiona Grantham', 'No', 'larry@coryhometeam.com', '(619) 776-9995', '02182788', '1/29/2028', 'July 27', '02-25-2024', '', 'SWRANDLAR', 'Alexis', 'No', 'No', ''],
  ['Lisa Kyle', 'Processing', 'Processing', 'Kiona Grantham', '', 'lisa@soldbycht.com', '(760) 500-1044', '01438174', '6/20/2028', '', '06-15-2026', '', '', '', '', '', ''],
  ['Manuel Carrillo', 'Active', 'Processing', 'Kiona Grantham', '', 'manuel@soldbycht.com', '(951) 956-3740', '01918177', '8/9/2028', 'December 10', '05-18-2026', '', 'SWCARRMAN', '', 'No', 'No', ''],
  ['Mario Muñoz', 'Active', 'Active', 'Mario Munoz', 'No', 'mario@coryhometeam.com', '(562) 587-3990', '02162899', '3/21/2030', 'March 6', '09-20-2021', 'Spanish', 'SWMARMUNO', 'Alexis', 'Yes', '', ''],
  ['Martin Gomez', 'Active', 'Active', 'Kiona Grantham', 'Yes', 'martin@soldbycht.com', '(760) 900-8320', '02260352', '4/10/2029', 'November 26', '02-23-2026', '', '', 'Kenia', 'No', 'No', ''],
  ['Melissa Mantz', 'Active', '', 'N/A', 'No', 'melissa@coryhometeam.com', '(951) 250-7165', '02079338', '', '', '', '', '', 'Alexis', 'No', 'Yes', ''],
  ['Mercedes Torres', 'Active', 'Active', 'Mario Munoz', 'No', 'mercedes@coryhometeam.com', '(951) 223-5127', '02201161', '11/17/2026', 'November 4', '09-08-2025', 'Spanish', 'SWTORRMERR', 'Alexis', 'No', 'No', 'Referral'],
  ['Michael Wickam', 'Part Time', 'Inactive', 'Kiona Grantham', 'No', 'michael@coryhometeam.com', '(951) 219-9203', '02099944', '4/18/2029', 'January 9', '06-22-2020', '', 'SWWICKMIC', 'Alexis', 'No', 'No', ''],
  ['Monique Lewis', 'Active', 'Active', 'Mario Munoz', 'No', 'monique@coryhometeam.com', '(714) 476-8827', '02160204', '9/26/2029', 'November 20', '09-10-2025', '', 'OCLEWIMON', 'Alexis', 'No', 'No', 'Referral'],
  ['Myrna Peterson', 'Active', 'Active', 'Melissa Perla', 'No', 'myrna@coryhometeam.com', '(650) 678-0839', '01187483', '9/13/2026', 'January 3', '11-25-2024', 'Spanish', 'SWPETEMYR', 'Alexis', 'Yes', 'No', ''],
  ['Nate Bunnell', 'Active', 'Active', 'Melissa Perla', 'No', 'nate@coryhometeam.com', '(951) 294-4114', '02029120', '4/14/2029', 'February 5', '12-09-2019', 'Spanish/Portuguese', 'SWBUNNNAT', 'Alexis', 'Yes', 'Yes', ''],
  ['Parisa Shamlou', 'Part Time', 'Inactive', 'Kiona Grantham', 'No', 'parisa@coryhometeam.com', '(408) 627-2331', '02082362', '4/15/2027', 'May 30', '11-04-2025', '', '', 'Kenia', 'No', 'No', 'FB'],
  ['Rachele Lacey', 'Active', 'Active', 'Kiona Grantham', 'No', 'rachele@coryhometeam.com', '(619) 559-6176', '02223207', '10/10/2027', 'December 14', '08-14-2023', 'Spanish', 'SWLACERAC', 'Kenia', 'No', 'No', ''],
  ['Renée Keeling', 'Active', 'Active', 'Kiona Grantham', 'No', 'renee@coryhometeam.com', '(951) 334-3775', '01498147', '5/17/2029', 'March 31', '10-22-2025', '', 'TRABYREN', 'Alexis', 'No', 'Yes', 'Referral'],
  ['Richard Luizzi', 'Active', 'Active', 'Melissa Perla', 'No', 'richard@coryhometeam.com', '(858) 335-5631', '01766683', '4/30/2027', 'December 26', '07-14-2020', '', 'SAND-644125', 'Outside', 'Outside', 'No', ''],
  ['Robin Tapia', 'Active', 'Active', 'Melissa Perla', 'No', 'robintapia@coryhometeam.com', '(760) 687-3339', '02179930', '6/4/2026', 'September 21', '08-22-2022', 'Spanish', 'SWTAPIROB', 'Alexis', 'No', 'Yes', ''],
  ['Rosalina Williams', 'Active', 'Active', 'Mario Munoz', 'No', 'rosalina@coryhometeam.com', '(619) 892-6064', '02163820', '10/28/2029', 'September 26', '02-10-2025', '', 'SWWILROSA', 'Kenia', 'No', 'No', ''],
  ['Samantha Gonzales', 'Active', 'Active', 'Kiona Grantham', '', 'samanthag@soldbycht.com', '(951) 442-6731', '02284633', '5/26/2029', 'September 10', '05-04-2026', '', '', 'Alexis', 'No', 'No', ''],
  ['Sarah Miller', 'Active', 'Active', 'Kiona Grantham', '', 'sarah@soldbycht.com', '(714) 474-7759', '02069608', '7/17/2026', 'January 4', '03-31-2026', '', '', '', 'No', 'No', ''],
  ['Spencer Salter', 'Active', 'Active', 'Melissa Perla', 'No', 'spencer@coryhometeam.com', '(818) 879-3293', '02082680', '3/19/2027', 'April 11', '12-30-2025', '', 'Sr207066888', 'Kenia', 'Yes', 'Yes', ''],
  ['Stacy Bridges', 'Active', 'Active', 'Kiona Grantham', 'Yes', 'stacy@coryhometeam.com', '(951) 705-5519', '02213328', '4/12/2027', 'December 15', '12-11-2025', '', '', 'Kenia', 'No', 'No', ''],
  ['Stephanie Carson', 'Active', 'Active', 'Mario Munoz', 'No', 'stephanie.carson@coryhometeam.com', '(760) 670-5155', '01417660', '11/30/2027', 'March 26', '04-07-2025', '', '151813', 'Alexis', 'Yes', 'No', ''],
  ['Stephanie Casados', 'Active', 'Active', 'Melissa Perla', 'No', 'stephaniec@coryhometeam.com', '(951) 466-6383', '02182349', '8/15/2026', 'December 15', '09-19-2022', '', 'SWCASASTE', 'Kenia', 'No', 'No', ''],
  ['Tyler Bernetskie', 'Active', 'Active', 'Kiona Grantham', 'No', 'tyler@soldbycht.com', '(760) 829-3478', '02144941', '3/18/2030', 'March 22', '03-16-2026', '', '', 'Alexis', 'No', 'No', ''],
]

function clean(v: string): string | null {
  const t = (v || '').trim()
  return t ? t : null
}

function toDate(v: string): Date | null {
  const t = (v || '').trim()
  if (!t) return null
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

async function main() {
  const deleted = await prisma.agent.deleteMany({})
  console.log(`Deleted ${deleted.count} existing agents.`)

  let created = 0
  for (const r of ROWS) {
    const [
      name, status, leadTeam, coach, agentDevelopment, email, phone, dre,
      dreExpiration, birthday, anniversary, language, mlsId, tc, subscription,
      isaServices, source,
    ] = r

    await prisma.agent.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: clean(phone),
        status: clean(status),
        leadTeam: clean(leadTeam),
        coach: clean(coach),
        agentDevelopment: clean(agentDevelopment),
        dre: clean(dre),
        dreExpiration: toDate(dreExpiration),
        birthday: clean(birthday),
        anniversary: clean(anniversary),
        language: clean(language),
        mlsId: clean(mlsId),
        tc: clean(tc),
        subscription: clean(subscription),
        isaServices: clean(isaServices),
        source: clean(source),
      },
    })
    created++
  }

  const total = await prisma.agent.count()
  console.log(`Agents imported. created=${created} total=${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
