import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface QrValidationResult {
  valid: boolean;
  branch?: any;
  isDynamic?: boolean;
  error?: string;
}

export async function validateBranchQrToken(
  token: string
): Promise<QrValidationResult> {
  if (!token || typeof token !== "string" || token.length < 16) {
    return {
      valid: false,
      error: "QR នេះលែងមានសុពលភាព សូមទាក់ទងម្ចាស់ហាង",
    };
  }

  // 1. Try static QR token match first
  const staticBranch = await prisma.branch.findUnique({
    where: { qrToken: token },
    include: { company: true },
  });

  if (staticBranch) {
    return {
      valid: true,
      branch: staticBranch,
      isDynamic: false,
    };
  }

  // 2. Try dynamic QR token match (current 30s step or previous step)
  const now = Date.now();
  const currentStep = Math.floor(now / 30000);
  const candidateSteps = [currentStep, currentStep - 1]; // 30s window tolerance

  const branchesWithSecret = await prisma.branch.findMany({
    where: {
      qrSecret: { not: null },
      isActive: true,
    },
    include: { company: true },
  });

  for (const b of branchesWithSecret) {
    if (!b.qrSecret) continue;
    for (const step of candidateSteps) {
      const computedToken = crypto
        .createHmac("sha256", b.qrSecret)
        .update(String(step))
        .digest("hex")
        .slice(0, 32);

      if (computedToken === token) {
        return {
          valid: true,
          branch: b,
          isDynamic: true,
        };
      }
    }
  }

  return {
    valid: false,
    error: "QR នេះលែងមានសុពលភាព សូមទាក់ទងម្ចាស់ហាង",
  };
}
