"use client";

import { PlaceholderPage } from "@/components/placeholder-page";
import { CalendarCheck } from "lucide-react";

export default function AttendancesPage() {
  return (
    <PlaceholderPage
      title="បញ្ជីវត្តមានបុគ្គលិក (Attendances)"
      subtitle="តាមដាន និងគ្រប់គ្រងការ Check-in, Check-out, ស្ថានភាពទាន់ពេល/មកយឺត និងទីតាំង GPS របស់បុគ្គលិក"
      phaseNotice="Phase 5 • Attendance Management"
      icon={CalendarCheck}
    />
  );
}
