import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquarePlus, Calendar } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center space-y-10 max-w-xl w-full px-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">מערכת התמיכה של קורס סטטיסטיקה</h1>
          <p className="text-slate-500">כיצד נוכל לעזור לכם היום?</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Link to={createPageUrl("OfficeHours")}>
            <div className="group bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">קביעת שעת קבלה</h2>
              <p className="text-slate-600 text-sm">קבעו פגישה עם אחת המתרגלות</p>
            </div>
          </Link>

          <Link to={createPageUrl("NewTicket")}>
            <div className="group bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-400 rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                <MessageSquarePlus className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">פתיחת פנייה</h2>
              <p className="text-slate-600 text-sm">שלחו שאלה לצוות הקורס</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}