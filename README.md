# ប្រព័ន្ធគ្រប់គ្រងវត្តមាន និងប្រាក់ខែបុគ្គលិក AttendPro (AttendPro HR & Payroll System)

**AttendPro** គឺជាប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកតាមរយៈ QR Code, កាលវិភាគការងារ, ការគ្រប់គ្រងច្បាប់សម្រាក, គណនាប្រាក់ខែស្វ័យប្រវត្តិតាមច្បាប់ការងារកម្ពុជា និងការជូនដំណឹងតាម Telegram Group ក្នុងពេលវេលាជាក់ស្តែង (Real-time)។

---

## 🌟 លក្ខណៈពិសេសចម្បងៗ (Key Features)

1. **ស្កេនវត្តមានតាម QR Code (Smart QR Attendance)**
   - គាំទ្រទាំង Dynamic Token (កូដប្រែប្រួលរៀងរាល់ ៣០ វិនាទីលើ Tablet/TV) និង Static Token (Poster A4 បិទជញ្ជាំង)។
   - ផ្ទៀងផ្ទាត់ទីតាំង GPS Geofencing និងកាំចម្ងាយអនុញ្ញាតនៃសាខា។
   - គ្មានការរារាំង Check-out (Check-out បានគ្រប់ពេល ជាមួយការកត់ត្រា Early Leave ប្រសិនបើចេញមុនម៉ោង)។
2. **ការជូនដំណឹងតាម Telegram (Real-time Telegram Alerts)**
   - ផ្ញើសារជូនដំណឹងភ្លាមៗទៅកាន់ Telegram Group ពេលបុគ្គលិក Check-in/Check-out។
   - រាយការណ៍បុគ្គលិកមកទាន់ពេល, មកយឺត (Late), ឬចេញមុន (Early Leave)។
3. **ការគ្រប់គ្រងបុគ្គលិក និងគណនី (Employee Management)**
   - នាំចូល (Import) និងនាំចេញ (Export) ទិន្នន័យបុគ្គលិកតាមរយៈ Excel/CSV។
   - បង្កើតគណនី Login ដោយស្វ័យប្រវត្តិជាមួយជម្រើស Password Policy (មិនបង្ខំប្តូរ Password)។
   - កំណត់វេនការងារច្រើន (Multi-shift), ថ្ងៃធ្វើការ និងសាខាអនុញ្ញាត។
4. **ការគ្រប់គ្រងច្បាប់ និងថ្ងៃឈប់សម្រាក (Leave & Holiday Management)**
   - ស្នើសុំច្បាប់ និងអនុម័តច្បាប់តាមប្រព័ន្ធ។
   - ប្រតិទិនថ្ងៃឈប់សម្រាកបុណ្យជាតិផ្លូវការនៅកម្ពុជា។
5. **ប្រព័ន្ធគណនាប្រាក់ខែស្វ័យប្រវត្តិ (Cambodia Payroll Engine)**
   - គណនាប្រាក់ខែគោល ប្រាក់ថែមម៉ោង (OT) ប្រាក់រង្វាន់ និងការកាត់ប្រាក់ផ្សេងៗ។
   - បោះពុម្ពប័ណ្ណបើកប្រាក់បៀវត្សរ៍ (Payslip) ស្អាត និងទាញយកជារបាយការណ៍ Excel/PDF។
6. **សុវត្ថិភាព និងការបម្រុងទុកទិន្នន័យ (Security & Backup)**
   - ការពារគណនី Super Admin ជាមួយ Recovery Codes ចំនួន ៨ កូដ។
   - ប្រព័ន្ធ Audit Log កត់ត្រាសកម្មភាពសំខាន់ៗទាំងអស់។
   - Backup ទិន្នន័យជាទម្រង់ JSON និង CSV តាម UI ដោយមិនបាច់សរសេរកូដ។
   - យន្តការ Point-in-time Restore ៧ ថ្ងៃលើ Neon Cloud Database។

---

## 🚀 បច្ចេកវិទ្យាដែលប្រើប្រាស់ (Tech Stack)

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Prisma ORM
- **Authentication**: NextAuth.js
- **Hosting & Deployment**: Vercel

---

## ⚙️ ការកំណត់ Environment Variables (គំរូសម្រាប់ Deployment)

បង្កើតឯកសារ `.env` (ឬកំណត់ក្នុង Vercel Project Settings) ដោយប្រើទម្រង់គំរូដូចខាងក្រោម៖

```env
# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-sample-pooler.ap-southeast-1.aws.neon.tech/attendpro?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-generated-random-secret-key"

# Telegram Bot Alerts (Optional)
TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
TELEGRAM_CHAT_ID="your_telegram_group_chat_id"
```

> [!CAUTION]
> ហាមដាច់ខាតមិនត្រូវ Commit ឯកសារ `.env` ពិត ឬបញ្ចេញលេខសម្ងាត់/Token ពិតទៅក្នុង Git Repository ឡើយ។

---

## 🛠️ ការដំឡើង និងដំណើរការក្នុងម៉ាស៊ីន Local (Local Development)

```bash
# ១. ដំឡើង Dependencies
npm install

# ២. រៀបចំ Database Schema
npx prisma db push

# ៣. ដំណើរការ Server អភិវឌ្ឍន៍
npm run dev
```

បើក Browser ចូលទៅកាន់ [http://localhost:3000](http://localhost:3000)។

---

## 📚 ឯកសារណែនាំបន្ថែម (Documentation)

- [បញ្ជីត្រួតពិនិត្យដំណើរការជាផ្លូវការ (Go-Live Checklist)](file:///docs/go-live-checklist.md)
- [ការណែនាំអំពីការ Backup និងស្តារទិន្នន័យ (Neon Backup & Restore Guide)](file:///docs/neon-backup-restore-guide.md)
- [ការណែនាំអំពីការភ្ជាប់ឈ្មោះគេហទំព័រផ្ទាល់ខ្លួន (Custom Domain Guide)](file:///docs/custom-domain-guide.md)

---

## 📄 អាជ្ញាប័ណ្ណ (License)

រក្សាសិទ្ធិគ្រប់យ៉ាង © 2026 AttendPro Cambodia។
