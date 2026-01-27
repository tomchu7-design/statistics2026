import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  FileText, 
  HelpCircle, 
  ClipboardList, 
  BarChart3, 
  Table2, 
  Monitor, 
  MoreHorizontal 
} from "lucide-react";

const categoryConfig = {
  course_admin: { label: "מנהלת קורס", color: "bg-purple-100 text-purple-700 border-purple-200", icon: BookOpen },
  assignments: { label: "תרגילים", color: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText },
  quiz: { label: "בוחן", color: "bg-amber-100 text-amber-700 border-amber-200", icon: HelpCircle },
  exam: { label: "מבחן", color: "bg-red-100 text-red-700 border-red-200", icon: ClipboardList },
  statistics_content: { label: "תוכן סטטיסטי", color: "bg-green-100 text-green-700 border-green-200", icon: BarChart3 },
  excel: { label: "אקסל", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Table2 },
  technical: { label: "טכני", color: "bg-slate-100 text-slate-700 border-slate-200", icon: Monitor },
  other: { label: "אחר", color: "bg-gray-100 text-gray-700 border-gray-200", icon: MoreHorizontal },
  general: { label: "כללי", color: "bg-gray-100 text-gray-700 border-gray-200", icon: MoreHorizontal },
};

export default function CategoryBadge({ category, showIcon = true, size = "default" }) {
  const config = categoryConfig[category] || categoryConfig.other;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} border ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}`}
    >
      {showIcon && <Icon className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} ml-1`} />}
      {config.label}
    </Badge>
  );
}

export { categoryConfig };