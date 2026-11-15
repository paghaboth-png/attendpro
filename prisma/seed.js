const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting AttendPro Database Seed for TheDemo Coffee...');

  // 1. Create Company
  const company = await prisma.company.upsert({
    where: { id: 'company-demo-coffee' },
    update: {},
    create: {
      id: 'company-demo-coffee',
      name: 'TheDemo Coffee',
      phone: '+855 23 999 888',
      email: 'info@thedemocoffee.com',
      address: 'រាជធានីភ្នំពេញ ព្រះរាជាណាចក្រកម្ពុជា',
    },
  });
  console.log('✅ Company created:', company.name);

  // 2. Create Primary Branch: THE ONE COFFEE (ស្វាយរៀង)
  const branch1 = await prisma.branch.upsert({
    where: { id: 'branch-toul-kork' },
    update: {
      name: 'THE ONE COFFEE (ស្វាយរៀង)',
      lat: 11.0917049,
      lng: 105.7917625,
      radiusMeters: 100,
      address: 'ផ្លូវលេខ ០៨ ភូមិវាលយន្ត សង្កាត់ស្វាយរៀង ក្រុងស្វាយរៀង ខេត្តស្វាយរៀង',
      isActive: true,
    },
    create: {
      id: 'branch-toul-kork',
      companyId: company.id,
      name: 'THE ONE COFFEE (ស្វាយរៀង)',
      lat: 11.0917049,
      lng: 105.7917625,
      radiusMeters: 100,
      address: 'ផ្លូវលេខ ០៨ ភូមិវាលយន្ត សង្កាត់ស្វាយរៀង ក្រុងស្វាយរៀង ខេត្តស្វាយរៀង',
      isActive: true,
    },
  });

  // Ensure branch-bkk1 is deleted if it exists
  await prisma.branch.deleteMany({
    where: { id: 'branch-bkk1' },
  });
  console.log('✅ Branch created:', branch1.name);

  // 3. Create 3 Departments
  const dept1 = await prisma.department.upsert({
    where: { id: 'dept-service' },
    update: {},
    create: {
      id: 'dept-service',
      companyId: company.id,
      name: 'សេវាកម្មអតិថិជន & បារីស្តា',
    },
  });

  const dept2 = await prisma.department.upsert({
    where: { id: 'dept-kitchen' },
    update: {},
    create: {
      id: 'dept-kitchen',
      companyId: company.id,
      name: 'ផ្ទះបាយ & ស្តុកទំនិញ',
    },
  });

  const dept3 = await prisma.department.upsert({
    where: { id: 'dept-admin' },
    update: {},
    create: {
      id: 'dept-admin',
      companyId: company.id,
      name: 'រដ្ឋបាល និងហិរញ្ញវត្ថុ',
    },
  });
  console.log('✅ 3 Departments created');

  // 4. Create 3 Positions
  const posManager = await prisma.position.upsert({
    where: { id: 'pos-manager' },
    update: {},
    create: {
      id: 'pos-manager',
      companyId: company.id,
      name: 'ប្រធានសាខា (Branch Manager)',
    },
  });

  const posBarista = await prisma.position.upsert({
    where: { id: 'pos-barista' },
    update: {},
    create: {
      id: 'pos-barista',
      companyId: company.id,
      name: 'បារីស្តាជំនាញ (Senior Barista)',
    },
  });

  const posCashier = await prisma.position.upsert({
    where: { id: 'pos-cashier' },
    update: {},
    create: {
      id: 'pos-cashier',
      companyId: company.id,
      name: 'បុគ្គលិកគិតលុយ (Cashier)',
    },
  });
  console.log('✅ 3 Positions created');

  // 5. Create 2 Shifts
  const shiftMorning = await prisma.shift.upsert({
    where: { id: 'shift-morning' },
    update: {},
    create: {
      id: 'shift-morning',
      companyId: company.id,
      name: 'វេនព្រឹក (Morning 07:00 - 16:00)',
      startTime: '07:00',
      endTime: '16:00',
      graceMinutes: 15,
      workDays: '1,2,3,4,5,6',
    },
  });

  const shiftAfternoon = await prisma.shift.upsert({
    where: { id: 'shift-afternoon' },
    update: {},
    create: {
      id: 'shift-afternoon',
      companyId: company.id,
      name: 'វេនរសៀល (Afternoon 13:00 - 22:00)',
      startTime: '13:00',
      endTime: '22:00',
      graceMinutes: 15,
      workDays: '1,2,3,4,5,6',
    },
  });
  console.log('✅ 2 Shifts created');

  // 6. Create 2 Holidays
  await prisma.holiday.upsert({
    where: { id: 'holiday-khmer-new-year' },
    update: {},
    create: {
      id: 'holiday-khmer-new-year',
      companyId: company.id,
      name: 'ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិ',
      date: new Date('2026-04-14T00:00:00Z'),
    },
  });

  await prisma.holiday.upsert({
    where: { id: 'holiday-pchum-ben' },
    update: {},
    create: {
      id: 'holiday-pchum-ben',
      companyId: company.id,
      name: 'ពិធីបុណ្យភ្ជុំបិណ្ឌ',
      date: new Date('2026-10-10T00:00:00Z'),
    },
  });
  console.log('✅ 2 Holidays created');

  // 7. Create Leave Types
  await prisma.leaveType.upsert({
    where: { id: 'leave-annual' },
    update: {},
    create: {
      id: 'leave-annual',
      name: 'ច្បាប់ឈប់សម្រាកប្រចាំឆ្នាំ (Annual Leave)',
      daysAllowed: 18,
    },
  });
  await prisma.leaveType.upsert({
    where: { id: 'leave-sick' },
    update: {},
    create: {
      id: 'leave-sick',
      name: 'ច្បាប់ឈឺ (Sick Leave)',
      daysAllowed: 7,
    },
  });

  // 8. Create Default System Settings
  await prisma.setting.upsert({
    where: { key: 'require_selfie' },
    update: { value: 'false' },
    create: {
      companyId: company.id,
      key: 'require_selfie',
      value: 'false',
    },
  });
  await prisma.setting.upsert({
    where: { key: 'require_gps' },
    update: { value: 'true' },
    create: {
      companyId: company.id,
      key: 'require_gps',
      value: 'true',
    },
  });
  console.log('✅ Settings initialized (require_selfie: false, require_gps: true)');

  // 9. Create Users with encrypted passwords
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const managerPasswordHash = await bcrypt.hash('Manager@12345', 10);
  const employeePasswordHash = await bcrypt.hash('Employee@12345', 10);

  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@demo.com',
      phone: '012999001',
      name: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Super Admin)',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: { passwordHash: managerPasswordHash },
    create: {
      email: 'manager@demo.com',
      phone: '012999002',
      name: 'សុខ វិសាល (Branch Manager)',
      passwordHash: managerPasswordHash,
      role: 'MANAGER',
    },
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@demo.com' },
    update: { passwordHash: employeePasswordHash },
    create: {
      email: 'employee@demo.com',
      phone: '012999003',
      name: 'ចាន់ ធីតា (Barista)',
      passwordHash: employeePasswordHash,
      role: 'EMPLOYEE',
    },
  });
  console.log('✅ 3 Logins created (admin@demo.com, manager@demo.com, employee@demo.com)');

  // 9. Create 10 Sample Employees
  const sampleEmployees = [
    {
      code: 'EMP001',
      name: 'សុខ វិសាល',
      phone: '012999002',
      branchId: branch1.id,
      departmentId: dept3.id,
      positionId: posManager.id,
      shiftId: shiftMorning.id,
      userId: managerUser.id,
    },
    {
      code: 'EMP002',
      name: 'ចាន់ ធីតា',
      phone: '012999003',
      branchId: branch1.id,
      departmentId: dept1.id,
      positionId: posBarista.id,
      shiftId: shiftMorning.id,
      userId: employeeUser.id,
    },
    {
      code: 'EMP003',
      name: 'មាស សុភ័ក្រ',
      phone: '012999004',
      branchId: branch1.id,
      departmentId: dept1.id,
      positionId: posCashier.id,
      shiftId: shiftMorning.id,
    },
    {
      code: 'EMP004',
      name: 'កែវ បុប្ផា',
      phone: '012999005',
      branchId: branch1.id,
      departmentId: dept1.id,
      positionId: posBarista.id,
      shiftId: shiftAfternoon.id,
    },
    {
      code: 'EMP005',
      name: 'ហេង ដារ៉ា',
      phone: '012999006',
      branchId: branch1.id,
      departmentId: dept1.id,
      positionId: posCashier.id,
      shiftId: shiftAfternoon.id,
    },
    {
      code: 'EMP006',
      name: 'រ័ត្ន ចិន្តា',
      phone: '012999007',
      branchId: branch1.id,
      departmentId: dept3.id,
      positionId: posManager.id,
      shiftId: shiftMorning.id,
    },
    {
      code: 'EMP007',
      name: 'ពេជ្រ រស្មី',
      phone: '012999008',
      branchId: branch1.id,
      departmentId: dept1.id,
      positionId: posBarista.id,
      shiftId: shiftMorning.id,
    },
    {
      code: 'EMP008',
      name: 'ឡុង វាសនា',
      phone: '012999009',
      branchId: branch1.id,
      departmentId: dept1.id,
      positionId: posCashier.id,
      shiftId: shiftMorning.id,
    },
    {
      code: 'EMP009',
      name: 'ឈាង សុភាព',
      phone: '012999010',
      branchId: branch1.id,
      departmentId: dept2.id,
      positionId: posBarista.id,
      shiftId: shiftAfternoon.id,
    },
    {
      code: 'EMP010',
      name: 'វ៉ាន់ ស្រីនាង',
      phone: '012999011',
      branchId: branch1.id,
      departmentId: dept1.id,
      positionId: posCashier.id,
      shiftId: shiftAfternoon.id,
    },
  ];

  for (const emp of sampleEmployees) {
    await prisma.employee.upsert({
      where: { code: emp.code },
      update: {
        ...emp,
        pin: '1234',
        pinFailedAttempts: 0,
        pinLockedUntil: null,
      },
      create: {
        ...emp,
        pin: '1234',
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        companyId: company.id,
        isActive: true,
        hiddenInReport: false,
      },
    });
  }
  console.log('✅ 10 Sample Employees created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
