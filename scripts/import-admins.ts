/**
 * Seeds the internal team / admin directory (Admin table).
 *
 * Data provided directly by CHT (not from the workbook). Idempotent: upserts
 * by email so re-running won't create duplicates.
 *
 * Usage: tsx scripts/import-admins.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Columns: title, name, email, phone, googleVoice, dre, birthday, anniversary, language, mlsId, dreExpiration
type Row = [
  string, // title
  string, // name
  string, // email
  string, // phone
  string, // googleVoice
  string, // dre
  string, // birthday
  string, // anniversary
  string, // language
  string, // mlsId
  string, // dreExpiration
]

const ROWS: Row[] = [
  ['Owner', 'Blake Cory', 'blake@coryhometeam.com', '(949) 668-4733', 'N/A', '01781649', 'February 26', '1/1/2016', '', 'TCORYBLA', ''],
  ['VP', 'Kiona Grantham', 'kiona@coryhometeam.com', '(951) 497-0679', '', '02075788', 'July 4', '7/10/2017', '', 'SWGRANKIO', '11/18/2026'],
  ['Finance Manager', 'Dana Martinez', 'dana@coryhometeam.com', '(951) 500-4269', 'N/A', 'N/A', 'December 9', '3/29/2016', '', 'SWMARTDAN', ''],
  ['Sales Manager', 'Melissa Mantz', 'melissa@coryhometeam.com', '(951) 250-7165', '', '2079338', '10/9/2020', '3/5/2019', '', 'SWMANTMEL', '2/27/2027'],
  ['TC', 'Kenia Bautista', 'kenia@coryhometeam.com', '(951) 215-6148', 'N/A', '01778072', 'May 31', '7/20/2020', 'Spanish', 'SWBAUTKEN', ''],
  ['TC', 'Alexis Cassidy', 'alexis@coryhometeam.com', '(760) 916-6933', 'N/A', '02209260', 'April 4', '8/9/2021', '', 'SWCASSALE', ''],
  ['Customer Experience', 'Diana Alsup', 'diana@coryhometeam.com', '(951) 215-6033', 'N/A', 'N/A', 'March 14', '4/18/2022', '', 'N/A', ''],
  ['Marketing', 'Michael Muthui', 'michaelm@coryhometeam.com', '', '', '', '', '10/15/2025', '', '', ''],
  ['VA- Database Manager/Leads Manager', 'Remy Victoria', 'remy@coryhometeam.com', '(+63) 925-552-2975', '(951) 821-8138', 'N/A', 'June 25', '5/5/2017', '', 'NA', ''],
  ['VA- Listing Coordinator', 'Aileen Munoz', 'aileen@coryhometeam.com', '(+63) 966-167-9978', '(951) 387-4783', 'N/A', 'February 19', '3/7/2018', '', 'NA', ''],
  ['VA- Recruitment Coordinator / Sales Assistant', 'Mark Carandang', 'mark@coryhometeam.com', '(+63) 939-348-6548', '(951) 215-6294', 'N/A', 'March 26', '7/27/2020', '', 'NA', ''],
  ['VA-Accountant', 'Isabel Delmo', 'isabel@coryhometeam.com', '(+63) 917-837-8394', 'N/A', 'N/A', 'August 30', '12/16/2020', '', 'NA', ''],
  ['VA-Transaction', 'Rafael Bernardo', 'rafael@coryhometeam.com', '(+63) 9950124134', 'N/A', 'N/A', 'September 26', '2/10/2021', '', '', ''],
  ['VA-Transaction', 'Jam Bernardo', 'jamesa@coryhometeam.com', '', '(951) 251-5859', 'N/A', 'September 20', '5/24/2024', '', '', ''],
  ['VA-Admin Asst (Database/Zillow/ISA reports)', 'Allain Christian Baltazar', 'abaltazar@coryhometeam.com', '(+63) 977-008-0791', 'N/A', 'N/A', 'July 3', '4/5/2022', '', 'NA', ''],
  ['VA - CHT Store Specialist and Automations Expert', 'Raphael Paul Martinez', 'raphael@coryhometeam.com', '', 'N/A', 'N/A', '', '10/15/2025', '', 'NA', ''],
  ['Inside Sales Manager', 'Nichole Raimer', 'nichole@coryhometeam.com', '', '(951) 363-3679', 'N/A', 'October 10', '12/13/2018', 'Spanish', 'NA', ''],
  ['ISA', 'Kimberly Romero', 'kimberly@coryhometeam.com', '(+506) 8467 1005', '(619) 436-1915 Ext 108 (shared ISA #)', '', '', '6/26/2024', '', '', ''],
  ['ISA', 'Jasmine Flores', 'jasmine@coryhometeam.com', '909-380-5087', 'RC: (951) 344-6422 Ext. 114', '', 'April 27', '10/9/2024', '', '', ''],
  ['ISA', 'Kelly Montoya', 'kellym@coryhometeam.com', '702-265-4321', '(619) 436-1915 Ext 108 (shared ISA #)', '', 'March 26', '1/29/2026', '', '', ''],
  ['ISA', 'Jamilla Villegas', 'jamilla@soldbycht.com', '310-782-5834', '(619) 436-1915 Ext 108 (shared ISA #)', '', '', '6/18/2026', '', '', ''],
]

// Empty strings and placeholders like "N/A" / "NA" become null.
function clean(v: string): string | null {
  const t = (v || '').trim()
  if (!t) return null
  if (/^n\/?a$/i.test(t)) return null
  return t
}

async function main() {
  let created = 0
  let updated = 0

  for (const r of ROWS) {
    const [title, name, email, phone, googleVoice, dre, birthday, anniversary, language, mlsId, dreExpiration] = r
    const data = {
      title: clean(title),
      name: name.trim(),
      phone: clean(phone),
      googleVoice: clean(googleVoice),
      dre: clean(dre),
      birthday: clean(birthday),
      anniversary: clean(anniversary),
      language: clean(language),
      mlsId: clean(mlsId),
      dreExpiration: clean(dreExpiration),
    }
    const existing = await prisma.admin.findUnique({ where: { email: email.trim() } })
    await prisma.admin.upsert({
      where: { email: email.trim() },
      create: { email: email.trim(), ...data },
      update: data,
    })
    if (existing) updated++
    else created++
  }

  const total = await prisma.admin.count()
  console.log(`Admins imported. created=${created} updated=${updated} total=${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
