import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateReadableTempPassword } from "@/lib/pin-utils";
import { normalizePhoneNumber } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userName = (session?.user as any)?.name || "Admin";

    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "សិទ្ធិមិនគ្រប់គ្រាន់ (Admin / Super Admin only)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { employeeIds } = body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "សូមជ្រើសរើសបុគ្គលិកយ៉ាងតិច ១ នាក់" },
        { status: 400 }
      );
    }

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { user: true },
      orderBy: { code: "asc" },
    });

    const forceSetting = await prisma.setting.findUnique({
      where: { key: "force_employee_change_password" },
    });
    const mustChange = forceSetting?.value === "true";

    const createdList: Array<{
      code: string;
      name: string;
      username: string;
      tempPassword: string;
      status: "CREATED" | "EXISTED";
    }> = [];

    for (const emp of employees) {
      if (emp.user) {
        // Already has user account
        createdList.push({
          code: emp.code,
          name: emp.name,
          username: emp.user.phone || emp.user.email || emp.code,
          tempPassword: "(មានគណនីរួចហើយ - Password មិនផ្លាស់ប្តូរ)",
          status: "EXISTED",
        });
        continue;
      }

      // Username priority: phone -> email -> code@attendpro.com
      const normPhone = emp.phone ? normalizePhoneNumber(emp.phone) : null;
      let username = normPhone;
      let emailVal: string | null = null;
      let phoneVal: string | null = normPhone;

      if (!username) {
        username = emp.code.toLowerCase() + "@attendpro.com";
        emailVal = username;
      }

      // Generate readable temporary password
      const tempPassword = generateReadableTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          email: emailVal,
          phone: phoneVal,
          name: emp.name,
          passwordHash,
          role: "EMPLOYEE",
          mustChangePassword: mustChange,
          isActive: true,
        },
      });

      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId: newUser.id },
      });

      createdList.push({
        code: emp.code,
        name: emp.name,
        username,
        tempPassword,
        status: "CREATED",
      });
    }

    // Write audit log
    const newlyCreated = createdList.filter((c) => c.status === "CREATED");
    if (newlyCreated.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "BULK_CREATE_LOGINS",
          entity: "User",
          details: `Admin (${userName}) បានបង្កើតគណនី Login សម្រាប់បុគ្គលិកចំនួន ${newlyCreated.length} នាក់ (${newlyCreated.map((c) => c.code).join(", ")})`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      createdCount: newlyCreated.length,
      mustChangePassword: mustChange,
      accounts: createdList,
      message: `បានបង្កើតគណនី Login ដោយជោគជ័យសម្រាប់ ${newlyCreated.length} នាក់!`,
    });
  } catch (error: any) {
    console.error("bulk-create-logins error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
