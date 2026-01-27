import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  MessageSquarePlus, 
  Calendar, 
  FileText, 
  HelpCircle,
  ChevronLeft,
  Sparkles,
  BookOpen,
  BarChart3,
  Table2,
  Monitor,
  ClipboardList
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CategoryBadge, { categoryConfig } from "@/components/shared/CategoryBadge";

export default function Home() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: popularQnA = [] } = useQuery({
    queryKey: ["popular-qna"],
    queryFn: async () => {
      const qnas = await base44.entities.QnA.filter({ is_published: true }, "-view_count", 6);
      return qnas;
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = createPageUrl("QnAPage") + `?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const quickActions = [
    {
      title: "פתיחת פנייה חדשה",
      description: "יש לכם שאלה? פתחו פנייה לצוות הקורס",
      icon: MessageSquarePlus,
      href: createPageUrl("NewTicket"),
      color: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "קביעת שעות קבלה",
      description: "קבעו פגישה עם אחד המתרגלים",
      icon: Calendar,
      href: createPageUrl("OfficeHours"),
      color: "from-emerald-500 to-teal-600",
      shadow: "shadow-emerald-500/20",
    },
    {
      title: "הפניות שלי",
      description: "צפו בסטטוס הפניות שפתחתם",
      icon: FileText,
      href: createPageUrl("MyTickets"),
      color: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/20",
    },
  ];

  const categories = [
    { key: "course_admin", icon: BookOpen },
    { key: "assignments", icon: FileText },
    { key: "exam", icon: ClipboardList },
    { key: "statistics_content", icon: BarChart3 },
    { key: "excel", icon: Table2 },
    { key: "technical", icon: Monitor },
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 md:p-12 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"30\" height=\"30\" viewBox=\"0 0 30 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z\" fill=\"rgba(255,255,255,0.07)\"%2F%3E%3C/svg%3E')] opacity-50" />
        
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">מערכת התמיכה של קורס סטטיסטיקה</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            {user ? `שלום ${user.full_name || ""}! 👋` : "ברוכים הבאים!"}
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8">
            חפשו תשובות לשאלות נפוצות או פתחו פנייה לצוות הקורס
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="חיפוש תשובה מהיר..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pr-12 pl-32 text-lg rounded-2xl border-0 bg-white text-slate-900 placeholder:text-slate-400 shadow-xl shadow-black/10"
              />
              <Button 
                type="submit"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 rounded-xl h-10"
              >
                <Search className="w-4 h-4 ml-2" />
                חיפוש
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        {quickActions.map((action) => (
          <Link key={action.title} to={action.href}>
            <Card className={`group relative overflow-hidden border-0 shadow-lg ${action.shadow} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardContent className="relative p-6">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg ${action.shadow}`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors mb-2">
                  {action.title}
                </h3>
                <p className="text-slate-500 group-hover:text-white/80 transition-colors text-sm">
                  {action.description}
                </p>
                <div className="mt-4 flex items-center text-blue-600 group-hover:text-white font-medium text-sm">
                  לחצו כאן
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">עיון לפי קטגוריה</h2>
          <Link to={createPageUrl("QnAPage")} className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center">
            כל השאלות
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const config = categoryConfig[cat.key];
            return (
              <Link 
                key={cat.key}
                to={createPageUrl("QnAPage") + `?category=${cat.key}`}
                className="group"
              >
                <Card className="border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 rounded-xl ${config?.color?.split(' ')[0] || 'bg-slate-100'} flex items-center justify-center mx-auto mb-3`}>
                      <cat.icon className={`w-6 h-6 ${config?.color?.split(' ')[1] || 'text-slate-600'}`} />
                    </div>
                    <p className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors text-sm">
                      {config?.label || cat.key}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Popular Q&A */}
      {popularQnA.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">שאלות נפוצות</h2>
            <Link to={createPageUrl("QnAPage")} className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center">
              צפייה בכל השאלות
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {popularQnA.map((qna) => (
              <Link key={qna.id} to={createPageUrl("QnAPage") + `?id=${qna.id}`}>
                <Card className="border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all duration-200 h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 mb-1 line-clamp-2">{qna.question}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{qna.answer}</p>
                        <div className="mt-3">
                          <CategoryBadge category={qna.category} size="sm" showIcon={false} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Help Banner */}
      <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1 text-center md:text-right">
              <h3 className="text-xl font-bold text-slate-900 mb-2">לא מצאתם תשובה?</h3>
              <p className="text-slate-600">
                אל דאגה! פתחו פנייה וצוות הקורס יחזור אליכם בהקדם
              </p>
            </div>
            <Link to={createPageUrl("NewTicket")}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20">
                <MessageSquarePlus className="w-5 h-5 ml-2" />
                פתיחת פנייה
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}