import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Settings, 
  Users, 
  HelpCircle,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  Loader2,
  Save,
  Download,
  BookOpen,
  UserPlus,
  X,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { categoryConfig } from "@/components/shared/CategoryBadge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminSettings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("qna");
  
  // QnA Dialog
  const [showQnADialog, setShowQnADialog] = useState(false);
  const [editingQnA, setEditingQnA] = useState(null);
  const [qnaForm, setQnaForm] = useState({
    question: "",
    answer: "",
    category: "general",
    tags: [],
    attachment_url: "",
    is_published: true,
  });
  const [newTag, setNewTag] = useState("");

  // Invite Dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === "admin" || user?.staff_role === "admin";

  const { data: qnas = [], refetch: refetchQnA } = useQuery({
    queryKey: ["admin-qna"],
    queryFn: () => base44.entities.QnA.list("-created_date"),
    enabled: isAdmin,
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["admin-tickets-stats"],
    queryFn: () => base44.entities.Ticket.list(),
    enabled: isAdmin,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["admin-appointments-stats"],
    queryFn: () => base44.entities.Appointment.list(),
    enabled: isAdmin,
  });

  const staffUsers = users.filter(u => u.role === "admin" || u.staff_role === "ta" || u.staff_role === "admin");

  // Q&A CRUD
  const handleSaveQnA = async () => {
    if (!qnaForm.question || !qnaForm.answer) {
      toast.error("יש למלא שאלה ותשובה");
      return;
    }

    try {
      if (editingQnA) {
        await base44.entities.QnA.update(editingQnA.id, qnaForm);
        toast.success("השאלה עודכנה");
      } else {
        await base44.entities.QnA.create({ ...qnaForm, view_count: 0 });
        toast.success("השאלה נוספה");
      }

      setShowQnADialog(false);
      setEditingQnA(null);
      setQnaForm({
        question: "",
        answer: "",
        category: "general",
        tags: [],
        attachment_url: "",
        is_published: true,
      });
      refetchQnA();
    } catch (error) {
      toast.error("שגיאה בשמירה");
    }
  };

  const handleDeleteQnA = async (id) => {
    if (!confirm("למחוק את השאלה?")) return;

    try {
      await base44.entities.QnA.delete(id);
      refetchQnA();
      toast.success("השאלה נמחקה");
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleEditQnA = (qna) => {
    setEditingQnA(qna);
    setQnaForm({
      question: qna.question,
      answer: qna.answer,
      category: qna.category,
      tags: qna.tags || [],
      attachment_url: qna.attachment_url || "",
      is_published: qna.is_published !== false,
    });
    setShowQnADialog(true);
  };

  const addTag = () => {
    if (newTag.trim() && !qnaForm.tags.includes(newTag.trim())) {
      setQnaForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag("");
    }
  };

  const removeTag = (tag) => {
    setQnaForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // User management
  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast.error("יש להזין כתובת מייל");
      return;
    }

    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("user");
      toast.success("ההזמנה נשלחה");
    } catch (error) {
      toast.error("שגיאה בשליחת ההזמנה");
    }
  };

  const handleUpdateStaffRole = async (userEmail, staffRole) => {
    try {
      const targetUser = users.find(u => u.email === userEmail);
      if (targetUser) {
        await base44.entities.User.update(targetUser.id, { staff_role: staffRole });
        refetchUsers();
        toast.success("התפקיד עודכן");
      }
    } catch (error) {
      toast.error("שגיאה בעדכון התפקיד");
    }
  };

  // Export CSV
  const exportTicketsCSV = () => {
    const headers = ["מספר פנייה", "נושא", "קטגוריה", "דחיפות", "סטטוס", "סטודנט", "תאריך יצירה"];
    const rows = tickets.map(t => [
      t.ticket_number,
      t.subject,
      categoryConfig[t.category]?.label || t.category,
      t.urgency,
      t.status,
      t.student_email,
      format(new Date(t.created_date), "dd/MM/yyyy HH:mm")
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tickets_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const exportAppointmentsCSV = () => {
    const headers = ["מתרגל", "סטודנט", "תאריך", "שעה", "נושא", "סטטוס"];
    const rows = appointments.map(a => [
      a.ta_name,
      a.student_name,
      a.date,
      `${a.start_time}-${a.end_time}`,
      a.topic,
      a.status
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointments_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">אין הרשאה</h2>
            <p className="text-slate-600">דף זה מיועד למנהלי הקורס בלבד</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stats
  const ticketsByCategory = tickets.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});

  const appointmentsByTA = appointments.reduce((acc, a) => {
    acc[a.ta_name] = (acc[a.ta_name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-8 h-8" />
            הגדרות מערכת
          </h1>
          <p className="text-slate-600 mt-1">ניהול שאלות נפוצות, משתמשים ודוחות</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="qna">שאלות נפוצות</TabsTrigger>
          <TabsTrigger value="users">משתמשים</TabsTrigger>
          <TabsTrigger value="reports">דוחות</TabsTrigger>
          <TabsTrigger value="guide">מדריך</TabsTrigger>
        </TabsList>

        {/* Q&A Management */}
        <TabsContent value="qna" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">ניהול שאלות ותשובות ({qnas.length})</h2>
            <Button onClick={() => {
              setEditingQnA(null);
              setQnaForm({
                question: "",
                answer: "",
                category: "general",
                tags: [],
                attachment_url: "",
                is_published: true,
              });
              setShowQnADialog(true);
            }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 ml-2" />
              הוספת שאלה
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שאלה</TableHead>
                    <TableHead className="text-right">קטגוריה</TableHead>
                    <TableHead className="text-right">צפיות</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qnas.map((qna) => (
                    <TableRow key={qna.id}>
                      <TableCell className="max-w-[300px]">
                        <p className="font-medium truncate">{qna.question}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoryConfig[qna.category]?.label || qna.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{qna.view_count || 0}</TableCell>
                      <TableCell>
                        <Badge className={qna.is_published !== false ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                          {qna.is_published !== false ? "פורסם" : "טיוטה"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditQnA(qna)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteQnA(qna.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Users Management */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">ניהול משתמשים ({users.length})</h2>
            <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 ml-2" />
              הזמנת משתמש
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">צוות הקורס ({staffUsers.length})</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">אימייל</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role === "admin" ? "admin" : (u.staff_role || "user")}
                          onValueChange={(v) => handleUpdateStaffRole(u.email, v)}
                          disabled={u.role === "admin"}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">סטודנט</SelectItem>
                            <SelectItem value="ta">מתרגל</SelectItem>
                            <SelectItem value="admin">מנהל</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {u.role === "admin" && (
                          <Badge className="bg-purple-100 text-purple-700">מנהל ראשי</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4">
          <h2 className="text-xl font-semibold">דוחות וסטטיסטיקות</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פניות לפי קטגוריה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(ticketsByCategory).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm">{categoryConfig[cat]?.label || cat}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={exportTicketsCSV}>
                  <Download className="w-4 h-4 ml-2" />
                  ייצוא פניות ל-CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">פגישות לפי מתרגל</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(appointmentsByTA).map(([ta, count]) => (
                    <div key={ta} className="flex items-center justify-between">
                      <span className="text-sm">{ta}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={exportAppointmentsCSV}>
                  <Download className="w-4 h-4 ml-2" />
                  ייצוא פגישות ל-CSV
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">סיכום כללי</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-3xl font-bold text-slate-900">{tickets.length}</p>
                  <p className="text-sm text-slate-500">סה"כ פניות</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{tickets.filter(t => t.status === "new").length}</p>
                  <p className="text-sm text-blue-600">פניות חדשות</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{tickets.filter(t => t.status === "resolved").length}</p>
                  <p className="text-sm text-green-600">טופלו</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{appointments.length}</p>
                  <p className="text-sm text-purple-600">פגישות</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Guide */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                מדריך למנהל המערכת
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <h3>ניהול פניות</h3>
              <ul>
                <li><strong>הקצאת פניות:</strong> בדשבורד הפניות, לחצו על פנייה ובחרו "עריכת הקצאה" כדי להקצות מתרגלים</li>
                <li><strong>העברה במייל:</strong> ניתן להעביר פנייה למתרגלים באמצעות כפתור "העברה במייל"</li>
                <li><strong>הערות פנימיות:</strong> הערות פנימיות נראות רק לצוות הקורס</li>
              </ul>

              <h3>ניהול שעות קבלה</h3>
              <ul>
                <li>כל מתרגל מגדיר את הזמינות שלו בדף "הזמינות שלי"</li>
                <li>סטודנטים יכולים לקבוע עד 2 פגישות בו-זמנית</li>
                <li>ביטול פגישה אפשרי עד 12 שעות לפני מועדה</li>
              </ul>

              <h3>ניהול משתמשים</h3>
              <ul>
                <li><strong>הזמנת משתמשים:</strong> הזמינו משתמשים חדשים עם תפקיד מתאים</li>
                <li><strong>שינוי תפקיד:</strong> ניתן לשנות תפקיד משתמש קיים בטבלת המשתמשים</li>
                <li>תפקידים: סטודנט (רגיל), מתרגל (גישה לפניות מוקצות), מנהל (גישה מלאה)</li>
              </ul>

              <h3>שאלות נפוצות</h3>
              <ul>
                <li>הוסיפו שאלות חדשות עם קטגוריה ותגיות מתאימות</li>
                <li>ניתן לשמור כטיוטה לפני פרסום</li>
                <li>השאלות הנצפות ביותר מוצגות בדף הבית</li>
              </ul>

              <h3>דוחות</h3>
              <ul>
                <li>צפו בסטטיסטיקות לפי קטגוריה ומתרגל</li>
                <li>ייצאו נתונים ל-CSV לניתוח נוסף</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Q&A Dialog */}
      <Dialog open={showQnADialog} onOpenChange={setShowQnADialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQnA ? "עריכת שאלה" : "הוספת שאלה חדשה"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>שאלה *</Label>
              <Input
                value={qnaForm.question}
                onChange={(e) => setQnaForm(prev => ({ ...prev, question: e.target.value }))}
                placeholder="מהי השאלה?"
              />
            </div>

            <div className="space-y-2">
              <Label>תשובה *</Label>
              <Textarea
                value={qnaForm.answer}
                onChange={(e) => setQnaForm(prev => ({ ...prev, answer: e.target.value }))}
                placeholder="התשובה לשאלה..."
                className="min-h-[150px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>קטגוריה</Label>
                <Select
                  value={qnaForm.category}
                  onValueChange={(v) => setQnaForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>קישור/קובץ מצורף</Label>
                <Input
                  value={qnaForm.attachment_url}
                  onChange={(e) => setQnaForm(prev => ({ ...prev, attachment_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>תגיות</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="תגית חדשה"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {qnaForm.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={qnaForm.is_published}
                onCheckedChange={(checked) => setQnaForm(prev => ({ ...prev, is_published: checked }))}
              />
              <Label>פרסם מיד</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQnADialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveQnA} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 ml-2" />
              שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הזמנת משתמש חדש</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>כתובת אימייל</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">סטודנט</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleInviteUser} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 ml-2" />
              שליחת הזמנה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}