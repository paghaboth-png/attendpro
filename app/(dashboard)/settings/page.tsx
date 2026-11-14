"use client";

import { PlaceholderPage } from "@/components/placeholder-page";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="ការកំណត់ប្រព័ន្ធ (Settings)"
      subtitle="កំណត់ម៉ោងលើកលែង Grace Minutes, បើក/បិទ GPS ឬ Selfie, ប្តូរលេខសម្ងាត់ និងការកំណត់សុវត្ថិភាព"
      phaseNotice="Phase 8 • Settings & Security"
      icon={Settings}
    />
  );
}
