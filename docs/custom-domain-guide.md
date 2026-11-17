# ការណែនាំអំពីការភ្ជាប់ឈ្មោះគេហទំព័រផ្ទាល់ខ្លួន (Custom Domain Guide)

ការប្រើប្រាស់ឈ្មោះគេហទំព័រផ្ទាល់ខ្លួន (ឧទាហរណ៍៖ `attend.mycompany.com` ឬ `mycompany-hr.com`) ជួយបង្កើនទំនុកចិត្ត វិជ្ជាជីវៈ និងភាពងាយស្រួលដល់បុគ្គលិកក្នុងការចងចាំគេហទំព័រ Check-in។

---

## ១. តម្លៃ និងកន្លែងទិញ Domain (Domain Registrars)

លោកអ្នកអាចទិញឈ្មោះ Domain បានពីក្រុមហ៊ុនលក់ Domain ល្បីៗ និងមានសុវត្ថិភាពខ្ពស់៖

| ក្រុមហ៊ុន | តម្លៃប្រហាក់ប្រហែលក្នុង ១ ឆ្នាំ | គេហទំព័រ |
| :--- | :--- | :--- |
| **Cloudflare Registrar** | ~$9 - $10 / ឆ្នាំ (តម្លៃដើម គ្មានថ្លៃលាក់កំបាំង) | [cloudflare.com](https://www.cloudflare.com) |
| **Namecheap** | ~$10 - $14 / ឆ្នាំ (រួមបញ្ចូលការការពារ Free Privacy) | [namecheap.com](https://www.namecheap.com) |
| **Porkbun** | ~$10 - $12 / ឆ្នាំ (សាមញ្ញ តម្លៃសមរម្យ) | [porkbun.com](https://porkbun.com) |

*សម្គាល់៖ កន្ទុយ Domain ដូចជា `.com` គឺជាជម្រើសពេញនិយម និងមានតម្លៃសមរម្យបំផុត (~$10-15 ក្នុងមួយឆ្នាំ)។*

---

## ២. ជំហានភ្ជាប់ Domain ទៅកាន់ Vercel

បន្ទាប់ពីទិញឈ្មោះ Domain រួចរាល់ សូមអនុវត្តតាមជំហានងាយៗដូចខាងក្រោម៖

### ជំហានទី ១៖ បន្ថែម Domain លើ Vercel
1. ចូលទៅកាន់គណនី [Vercel Dashboard](https://vercel.com)
2. ចុចលើ Project `attendpro`
3. ចូលទៅកាន់ **Settings** ➜ ជ្រើសរើសផ្ទាំង **Domains** ពីបញ្ជីខាងឆ្វេង
4. វាយបញ្ចូលឈ្មោះ Domain របស់លោកអ្នក (ឧទាហរណ៍៖ `attend.yourstore.com` ឬ `yourstore.com`) រួចចុចប៊ូតុង **Add**

### ជំហានទី ២៖ កំណត់ត្រា DNS (DNS Records Configuration)
ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រង DNS នៅកន្លែងដែលលោកអ្នកបានទិញ Domain (Cloudflare/Namecheap) ហើយបន្ថែម Records ដូចខាងក្រោម៖

#### ករណីប្រើ Domain ចម្បង (ឧ. `yourstore.com`):
- **Type**: `A`
- **Name**: `@`
- **Value**: `76.76.21.21`

#### ករណីប្រើ Subdomain (ឧ. `attend.yourstore.com`):
- **Type**: `CNAME`
- **Name**: `attend`
- **Value**: `cname.vercel-dns.com`

---

## ៣. ការរង់ចាំផ្ទៀងផ្ទាត់ និងប្រព័ន្ធសុវត្ថិភាព SSL

- Vercel នឹងផ្ទៀងផ្ទាត់ DNS ដោយស្វ័យប្រវត្តិក្នុរយៈពេលពី **៥ នាទី ទៅ ២៤ ម៉ោង** (ជាទូទៅត្រឹមតែប៉ុន្មាននាទីប៉ុណ្ណោះ)។
- Vercel នឹងផ្តល់ជូនវិញ្ញាបនបត្រសុវត្ថិភាព **SSL Certificate (HTTPS)** ដោយឥតគិតថ្លៃ និងបន្តសុពលភាពស្វ័យប្រវត្តិ។
- នៅពេលឃើញសញ្ញាគ្រីសពណ៌បៃតង **Valid Configuration** មានន័យថា Domain ដំណើរការដោយជោគជ័យ!

---

## ⚠️ ចំណាំសំខាន់បំផុតស្តីពីការបោះពុម្ព QR Code ឡើងវិញ (QR Code Reprint Note)

> [!WARNING]
> **រាល់ពេលប្តូរឈ្មោះ Domain ត្រូវបោះពុម្ព QR Code Check-in ថ្មីឡើងវិញ!**
> 
> QR Code Check-in សម្រាប់បិទលើជញ្ជាំងសាខា ឬបង្ហាញលើ Tablet ត្រូវបានបង្កើតឡើងផ្អែកលើ Link នៃ Domain ជាក់ស្តែង (ឧ. `https://attendpro-one.vercel.app/scan/...` ឬ `https://attend.yourstore.com/scan/...`)។
> 
> ប្រសិនបើលោកអ្នកប្តូរមកប្រើ Custom Domain ថ្មីជាផ្លូវការ សូមកុំភ្លេច៖
> 1. ចូលទៅកាន់ទំព័រ **សាខា (Branches)**
> 2. ចុចបើកមើល QR Code នៃសាខានីមួយៗ
> 3. ទាញយកឯកសារ **Poster A4** ថ្មីដើម្បីបោះពុម្ព (Print) បិទជំនួស Poster ចាស់។
