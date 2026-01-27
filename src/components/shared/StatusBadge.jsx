import React from "react";
import { Badge } from "@/components/ui/badge";
import { Circle, Clock, MessageCircle, CheckCircle } from "lucide-react";

const statusConfig = {
  new: { label: "חדש", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Circle },
  in_progress: { label: "בטיפול", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  waiting_for_student: { label: "ממתין לסטודנט", color: "bg-purple-100 text-purple-700 border-purple-200", icon: MessageCircle },
  resolved: { label: "טופל", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
};

export default function StatusBadge({ status, size = "default" }) {
  const config = statusConfig[status] || statusConfig.new;
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

export { statusConfig };