import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const shift = await prisma.shift.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.startTime && { startTime: body.startTime }),
        ...(body.endTime && { endTime: body.endTime }),
        ...(body.graceMinutes !== undefined && { graceMinutes: parseInt(body.graceMinutes) }),
        ...(body.workDays && { workDays: body.workDays }),
      },
    });

    // If templates array is provided, replace or update templates
    if (Array.isArray(body.templates)) {
      // Delete existing templates not in the incoming list
      const templateIds = body.templates.map((t: any) => t.id).filter(Boolean);
      await prisma.shiftTemplate.deleteMany({
        where: {
          shiftId: params.id,
          id: { notIn: templateIds },
        },
      });

      // Upsert templates
      for (const t of body.templates) {
        if (t.id && !t.id.startsWith("temp-")) {
          await prisma.shiftTemplate.update({
            where: { id: t.id },
            data: {
              name: t.name,
              startTime: t.startTime,
              endTime: t.endTime,
            },
          });
        } else {
          await prisma.shiftTemplate.create({
            data: {
              shiftId: params.id,
              name: t.name,
              startTime: t.startTime,
              endTime: t.endTime,
            },
          });
        }
      }
    }

    const updated = await prisma.shift.findUnique({
      where: { id: params.id },
      include: {
        templates: { orderBy: { startTime: "asc" } },
        _count: { select: { employees: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const empCount = await prisma.employee.count({
      where: { shiftId: params.id },
    });

    if (empCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `មិនអាចលុបវេននេះបានទេ ព្រោះមានបុគ្គលិកចំនួន ${empCount} នាក់កំពុងប្រើប្រាស់! សូមផ្លាស់ប្តូរវេនបុគ្គលិកជាមុនសិន។`,
        },
        { status: 400 }
      );
    }

    await prisma.shift.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "បានលុបវេនធ្វើការដោយជោគជ័យ!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
