import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Validate real image format using buffer magic bytes
 */
function detectMagicBytes(buffer: Buffer): { valid: boolean; mime: string; error?: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false, mime: "", error: "ឯកសារតូចពេក ឬខូចខាត" };
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { valid: true, mime: "image/png" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mime: "image/jpeg" };
  }

  // WEBP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { valid: true, mime: "image/webp" };
  }

  // SVG: starts with <svg or <?xml ... <svg
  const headStr = buffer.subarray(0, 1024).toString("utf8").toLowerCase();
  if (headStr.includes("<svg") || (headStr.includes("<?xml") && headStr.includes("<svg"))) {
    // Sanitize check: reject if script is found
    if (headStr.includes("<script") || headStr.includes("javascript:")) {
      return { valid: false, mime: "", error: "ឯកសារ SVG មានកូដ script មិនមានសុវត្ថិភាព" };
    }
    return { valid: true, mime: "image/svg+xml" };
  }

  return { valid: false, mime: "", error: "ប្រភេទឯកសារមិនត្រឹមត្រូវ (អនុញ្ញាតតែ PNG, JPG, WEBP, SVG)" };
}

/**
 * GET /api/company/logo
 * Serves the company logo binary with ETag and Cache-Control headers
 */
export async function GET(req: Request) {
  try {
    const company = await prisma.company.findFirst({
      select: { logoUrl: true, updatedAt: true },
    });

    if (!company || !company.logoUrl) {
      return new NextResponse(null, { status: 404 });
    }

    // Check if stored as Data URL
    if (company.logoUrl.startsWith("data:")) {
      const match = company.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        // If data:image/svg+xml;utf8,...
        const svgMatch = company.logoUrl.match(/^data:image\/svg\+xml;utf8,(.+)$/);
        if (svgMatch) {
          const svgContent = decodeURIComponent(svgMatch[1]);
          const buffer = Buffer.from(svgContent, "utf8");
          const etag = `W/"${company.updatedAt.getTime()}-${buffer.length}"`;

          if (req.headers.get("if-none-match") === etag) {
            return new NextResponse(null, { status: 304 });
          }

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": "image/svg+xml",
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
              ETag: etag,
            },
          });
        }
        return new NextResponse(null, { status: 404 });
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Generate ETag based on timestamp and content length
      const etag = `W/"${company.updatedAt.getTime()}-${buffer.length}"`;

      // Check If-None-Match header
      if (req.headers.get("if-none-match") === etag) {
        return new NextResponse(null, { status: 304 });
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          ETag: etag,
        },
      });
    }

    // External URL redirect
    return NextResponse.redirect(company.logoUrl);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

/**
 * POST /api/company/logo
 * Uploads, validates magic bytes, and saves company logo
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "គ្មានសិទ្ធិអនុវត្តសកម្មភាពនេះទេ (Admin Only)" },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let dataUrl = "";
    let fileSize = 0;
    let mimeType = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: "សូមជ្រើសរើសឯកសាររូបភាព" }, { status: 400 });
      }

      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: "រូបធំពេក សូមជ្រើសរូបតូចជាង 2MB" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileSize = buffer.length;

      // Validate real magic bytes on server
      const check = detectMagicBytes(buffer);
      if (!check.valid) {
        return NextResponse.json({ success: false, error: check.error }, { status: 400 });
      }

      mimeType = check.mime;
      dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
    } else {
      // JSON payload { dataUrl: "..." }
      const body = await req.json();
      dataUrl = body.dataUrl;

      if (!dataUrl || !dataUrl.startsWith("data:")) {
        return NextResponse.json({ success: false, error: "ទិន្នន័យរូបភាពមិនត្រឹមត្រូវ" }, { status: 400 });
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ success: false, error: "ទម្រង់រូបភាពមិនត្រឹមត្រូវ" }, { status: 400 });
      }

      mimeType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      fileSize = buffer.length;

      if (fileSize > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: "រូបធំពេក សូមជ្រើសរូបតូចជាង 2MB" },
          { status: 400 }
        );
      }

      // Validate real magic bytes
      const check = detectMagicBytes(buffer);
      if (!check.valid) {
        return NextResponse.json({ success: false, error: check.error }, { status: 400 });
      }
      mimeType = check.mime;
    }

    // Save into database Company model
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: { name: "TheDemo Coffee", logoUrl: dataUrl },
      });
    } else {
      company = await prisma.company.update({
        where: { id: company.id },
        data: { logoUrl: dataUrl },
      });
    }

    // Write audit log without logging image content
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: "LOGO_UPLOAD",
        entity: "Company",
        details: `បានផ្ទុកឡើងរូប Logo ក្រុមហ៊ុន (${mimeType}, ${(fileSize / 1024).toFixed(1)} KB)`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "រក្សាទុក Logo ជោគជ័យ!",
      logoUrl: `/api/company/logo?v=${Date.now()}`,
    });
  } catch (error: any) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/company/logo
 * Removes company logo and logs audit trail
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "គ្មានសិទ្ធិអនុវត្តសកម្មភាពនេះទេ (Admin Only)" },
        { status: 403 }
      );
    }

    const company = await prisma.company.findFirst();
    if (company) {
      await prisma.company.update({
        where: { id: company.id },
        data: { logoUrl: null },
      });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: "LOGO_DELETE",
        entity: "Company",
        details: "បានលុបរូប Logo ក្រុមហ៊ុន",
      },
    });

    return NextResponse.json({
      success: true,
      message: "បានលុប Logo ជោគជ័យ!",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
