import { NextResponse } from "next/server";
import { validateBranchQrToken } from "@/lib/qr-validator";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "មិនមាន Token សម្រាប់ស្កេនឡើយ" },
        { status: 400 }
      );
    }

    const result = await validateBranchQrToken(token);
    if (!result.valid || !result.branch) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "QR នេះលែងមានសុពលភាព សូមទាក់ទងម្ចាស់ហាង",
        },
        { status: 404 }
      );
    }

    const b = result.branch;
    return NextResponse.json({
      success: true,
      data: {
        branchId: b.id,
        branchName: b.name,
        branchAddress: b.address,
        lat: b.lat,
        lng: b.lng,
        radiusMeters: b.radiusMeters,
        companyName: b.company?.name || "TheDemo Coffee",
        companyLogo: b.company?.logoUrl || null,
        isDynamic: result.isDynamic,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
