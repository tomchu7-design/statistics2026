import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import { 
  Home, 
  HelpCircle, 
  MessageSquarePlus, 
  Calendar, 
  FileText, 
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (e) {
      setUser(null);
    }
    setLoading(false);
  };

  const isStaff = user?.role === "admin" || user?.staff_role === "ta" || user?.staff_role === "admin";
  const isAdmin = user?.role === "admin" || user?.staff_role === "admin";

  const studentLinks = [
    { name: "בית", href: createPageUrl("Home"), icon: Home },

    { name: "פתיחת פנייה", href: createPageUrl("NewTicket"), icon: MessageSquarePlus },
    { name: "שעות קבלה", href: createPageUrl("OfficeHours"), icon: Calendar },
    { name: "הפניות שלי", href: createPageUrl("MyTickets"), icon: FileText },
  ];

  const staffLinks = [
    { name: "דשבורד", href: createPageUrl("Dashboard"), icon: LayoutDashboard },
    { name: "הזמינות שלי", href: createPageUrl("MyAvailability"), icon: Calendar },
  ];

  const adminLinks = [
    { name: "הגדרות", href: createPageUrl("AdminSettings"), icon: Settings },
  ];

  const isActive = (href) => location.pathname === new URL(href, window.location.origin).pathname;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="animate-pulse text-slate-400">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30" dir="rtl">
      <style>{`
        :root {
          --primary: 220 90% 56%;
          --primary-foreground: 0 0% 100%;
        }
        * {
          font-family: 'Heebo', 'Inter', sans-serif;
        }
      `}</style>
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-bold text-lg">ס</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-slate-900">קורס סטטיסטיקה</h1>
                <p className="text-xs text-slate-500">מערכת תמיכה</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {studentLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive(link.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Link>
              ))}
              
              {isStaff && (
                <>
                  <div className="w-px h-6 bg-slate-200 mx-2" />
                  {staffLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        isActive(link.href)
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <link.icon className="w-4 h-4" />
                      {link.name}
                    </Link>
                  ))}
                  {isAdmin && adminLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.href}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        isActive(link.href)
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <link.icon className="w-4 h-4" />
                      {link.name}
                    </Link>
                  ))}
                </>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-slate-700">
                        {user.full_name || user.email}
                      </span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="px-3 py-2 border-b">
                      <p className="font-medium text-slate-900">{user.full_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {isStaff && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                          {isAdmin ? "מנהל" : "מתרגל"}
                        </span>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-red-600">
                      <LogOut className="w-4 h-4 ml-2" />
                      התנתקות
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => base44.auth.redirectToLogin()} className="bg-blue-600 hover:bg-blue-700">
                  התחברות
                </Button>
              )}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-1">
              {studentLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive(link.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.name}
                </Link>
              ))}
              
              {isStaff && (
                <>
                  <div className="border-t my-2" />
                  <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">צוות</p>
                  {staffLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                        isActive(link.href)
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.name}
                    </Link>
                  ))}
                  {isAdmin && adminLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                        isActive(link.href)
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-center text-sm text-slate-500">
            <p>© 2026 קורס סטטיסטיקה - מערכת תמיכה</p>
          </div>
        </div>
      </footer>
    </div>
  );
}