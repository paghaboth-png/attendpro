"use client";

import { PlaceholderPage } from "@/components/placeholder-page";
import { FolderTree } from "lucide-react";

export default function DepartmentsPage() {
  return (
    <PlaceholderPage
      title="ផ្នែកការងារ (Departments)"
      subtitle="គ្រប់គ្រងផ្នែកការងារដូចជា សេវាកម្មអតិថិជន & បារីស្តា, ផ្ទះបាយ, រដ្ឋបាល និងហិរញ្ញវត្ថុ"
      phaseNotice="Phase 2 • Master Data Setup"
      icon={FolderTree}
    />
  );
}
