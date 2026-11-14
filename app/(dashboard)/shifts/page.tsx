"use client";

import { PlaceholderPage } from "@/components/placeholder-page";
import { Clock } from "lucide-react";

export default function ShiftsPage() {
  return (
    <PlaceholderPage
      title="វេនធ្វើការ (Shifts)"
      subtitle="វេនព្រឹក (07:00 - 16:00) និងវេនរសៀល (13:00 - 22:00) រួមជាមួយម៉ោងលើកលែង Grace Minutes 15 នាទី"
      phaseNotice="Phase 2 • Master Data Setup"
      icon={Clock}
    />
  );
}
