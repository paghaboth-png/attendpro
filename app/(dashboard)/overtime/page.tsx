"use client";

import { PlaceholderPage } from "@/components/placeholder-page";
import { ClockAlert } from "lucide-react";

export default function OvertimePage() {
  return (
    <PlaceholderPage
      title="ការស្នើសុំថែមម៉ោង (Overtime)"
      subtitle="កត់ត្រា និងអនុម័តម៉ោងបន្ថែម (OT) របស់បុគ្គលិកនៅតាមសាខានីមួយៗ"
      phaseNotice="Phase 6 • Leave, Overtime & Day-off"
      icon={ClockAlert}
    />
  );
}
