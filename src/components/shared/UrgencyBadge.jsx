import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

const urgencyConfig = {
  low: { label: "נמוכה", color: "bg-slate-100 text-slate-600 border-slate-200", icon: Info },
  medium: { label: "בינונית", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertCircle },
  high: { label: "גבוהה", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
};

export default function UrgencyBadge({ urgency, size = "default" }) {
  const config = urgencyConfig[urgency] || urgencyConfig.medium;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} border ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"}`}
    >
      <Icon className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} ml-1`} />
      {config.label}
    </Badge>
  );
}

export { urgencyConfig };