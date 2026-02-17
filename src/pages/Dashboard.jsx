import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Filter,
  Search,
  ChevronLeft,
  Clock,
  User,
  AlertCircle,
  Loader2,
  Eye,
  MessageCircle,
  UserPlus,
  Mail,
  Send,
  StickyNote,
  CheckCircle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import CategoryBadge, { categoryConfig } from "@/components/shared/CategoryBadge";
import StatusBadge, { statusConfig } from "@/components/shared/StatusBadge";
import UrgencyBadge from "@/components/shared/UrgencyBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    urgency: "all",
    search: "",
  });
  
  // Dialog states
  const [newMessage, setNewMessage] = useState("");
  const [newInternalNote, setNewInternalNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTAs, setSelectedTAs] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);

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
  const isStaff = isAdmin || user?.staff_role === "ta";

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ["staff-tickets"],
    queryFn: async () => {
      const data = await base44.entities.Ticket.list("-created_date");
      return data;
    },
    enabled: isStaff,
  });

  const { data: staffUsers = [] } = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === "admin" || u.staff_role === "ta" || u.staff_role === "admin");
    },
    enabled: isStaff,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      const data = await base44.entities.TicketMessage.filter(
        { ticket_id: selectedTicket.id },
        "created_date"
      );
      return data;
    },
    enabled: !!selectedTicket?.id,
  });

  const { data: ticketLogs = [] } = useQuery({
    queryKey: ["ticket-logs", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      const data = await base44.entities.TicketLog.filter(
        { ticket_id: selectedTicket.id },
        "-created_date"
      );
      return data;
    },
    enabled: !!selectedTicket?.id,
  });

  // Filter tickets based on role
  const filteredTickets = tickets.filter(ticket => {
    // Regular TA can only see assigned tickets or unassigned tickets
    if (!isAdmin) {
      const isAssignedToMe = ticket.assigned_tas?.includes(user?.email);
      const isUnassigned = !ticket.assigned_tas || ticket.assigned_tas.length === 0;
      if (!isAssignedToMe && !isUnassigned) {
        return false;
      }
    }

    // Apply filters
    if (filters.status !== "all" && ticket.status !== filters.status) return false;
    if (filters.category !== "all" && ticket.category !== filters.category) return false;
    if (filters.urgency !== "all" && ticket.urgency !== filters.urgency) return false;
    if (filters.search && !ticket.subject.toLowerCase().includes(filters.search.toLowerCase()) &&
        !ticket.ticket_number?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    
    return true;
  });

  // Stats
  const stats = {
    total: filteredTickets.length,
    new: filteredTickets.filter(t => t.status === "new").length,
    in_progress: filteredTickets.filter(t => t.status === "in_progress").length,
    waiting: filteredTickets.filter(t => t.status === "waiting_for_student").length,
    resolved: filteredTickets.filter(t => t.status === "resolved").length,
  };

  const handleSendMessage = async (isInternal = false) => {
    const message = isInternal ? newInternalNote : newMessage;
    if (!message.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      await base44.entities.TicketMessage.create({
        ticket_id: selectedTicket.id,
        author_email: user.email,
        author_name: user.full_name,
        message,
        is_internal_note: isInternal,
        is_staff: true,
      });

      await base44.entities.TicketLog.create({
        ticket_id: selectedTicket.id,
        action: "message_added",
        actor_email: user.email,
        actor_name: user.full_name,
        details: isInternal ? "הוספת הערה פנימית" : "הוספת תגובה",
      });

      // Send email to student if it's not an internal note
      if (!isInternal && selectedTicket.email_consent) {
        try {
          await base44.integrations.Core.SendEmail({
            to: selectedTicket.student_email,
            subject: `תגובה חדשה לפנייה ${selectedTicket.ticket_number} - קורס סטטיסטיקה`,
            body: `שלום ${selectedTicket.student_name},

קיבלת תגובה חדשה לפנייה שלך:

מספר פנייה: ${selectedTicket.ticket_number}
נושא: ${selectedTicket.subject}

תגובה מ${user.full_name}:
${message}

---
בברכה,
צוות קורס סטטיסטיקה`
          });
        } catch (emailError) {
          console.log("Email to student could not be sent");
        }
      }

      if (isInternal) {
        setNewInternalNote("");
      } else {
        setNewMessage("");
      }
      refetchMessages();
      toast.success(isInternal ? "ההערה נשמרה" : "התגובה נשלחה");
    } catch (error) {
      toast.error("שגיאה בשליחה");
    }
    setSendingMessage(false);
  };

  const handleStatusChange = async (status) => {
    if (!selectedTicket) return;

    try {
      await base44.entities.Ticket.update(selectedTicket.id, { status });
      
      await base44.entities.TicketLog.create({
        ticket_id: selectedTicket.id,
        action: "status_changed",
        actor_email: user.email,
        actor_name: user.full_name,
        details: `שינוי סטטוס ל: ${statusConfig[status]?.label}`,
      });

      setSelectedTicket(prev => ({ ...prev, status }));
      queryClient.invalidateQueries(["staff-tickets"]);
      toast.success("הסטטוס עודכן");
    } catch (error) {
      toast.error("שגיאה בעדכון הסטטוס");
    }
  };

  const handleAssign = async () => {
    if (!selectedTicket || selectedTAs.length === 0) return;

    try {
      await base44.entities.Ticket.update(selectedTicket.id, { 
        assigned_tas: selectedTAs 
      });

      await base44.entities.TicketLog.create({
        ticket_id: selectedTicket.id,
        action: "assigned",
        actor_email: user.email,
        actor_name: user.full_name,
        details: `הוקצה ל: ${selectedTAs.join(", ")}`,
      });

      setSelectedTicket(prev => ({ ...prev, assigned_tas: selectedTAs }));
      setShowAssignDialog(false);
      queryClient.invalidateQueries(["staff-tickets"]);
      toast.success("הפנייה הוקצתה");
    } catch (error) {
      toast.error("שגיאה בהקצאה");
    }
  };

  const handleForwardEmail = (ticket) => {
    const subject = encodeURIComponent(`פנייה ${ticket.ticket_number}: ${ticket.subject}`);
    const body = encodeURIComponent(`
פנייה מספר: ${ticket.ticket_number}
מאת: ${ticket.student_name} (${ticket.student_email})
קטגוריה: ${categoryConfig[ticket.category]?.label || ticket.category}
דחיפות: ${ticket.urgency}

תוכן הפנייה:
${ticket.description}

---
הועבר על ידי: ${user?.full_name}
    `.trim());

    const to = ticket.assigned_tas?.join(",") || "";
    window.open(`mailto:${to}?subject=${subject}&body=${body}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">אין הרשאה</h2>
            <p className="text-slate-600">דף זה מיועד לצוות הקורס בלבד</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8" />
            דשבורד פניות
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "ניהול כל הפניות" : "הפניות שלי ופניות חדשות"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-500">סה"כ</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.new}</p>
            <p className="text-sm text-blue-600">חדשות</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{stats.in_progress}</p>
            <p className="text-sm text-amber-600">בטיפול</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.waiting}</p>
            <p className="text-sm text-purple-600">ממתין</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-sm text-green-600">טופל</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש לפי נושא או מספר פנייה..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pr-10"
              />
            </div>
            <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {Object.entries(categoryConfig).filter(([k]) => k !== "general").map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.urgency} onValueChange={(v) => setFilters(prev => ({ ...prev, urgency: v }))}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="דחיפות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הדחיפויות</SelectItem>
                <SelectItem value="low">נמוכה</SelectItem>
                <SelectItem value="medium">בינונית</SelectItem>
                <SelectItem value="high">גבוהה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      {loadingTickets ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">לא נמצאו פניות</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-right">מספר</TableHead>
                  <TableHead className="text-right">נושא</TableHead>
                  <TableHead className="text-right">סטודנט</TableHead>
                  <TableHead className="text-right">קטגוריה</TableHead>
                  <TableHead className="text-right">דחיפות</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow 
                    key={ticket.id}
                    className={`cursor-pointer hover:bg-slate-50 ${
                      ticket.status === "new" ? "bg-blue-50/30" : ""
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">{ticket.subject}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{ticket.student_name}</p>
                        <p className="text-xs text-slate-500">{ticket.student_email}</p>
                      </div>
                    </TableCell>
                    <TableCell><CategoryBadge category={ticket.category} size="sm" showIcon={false} /></TableCell>
                    <TableCell><UrgencyBadge urgency={ticket.urgency} size="sm" /></TableCell>
                    <TableCell><StatusBadge status={ticket.status} size="sm" /></TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {format(new Date(ticket.created_date), "d/M/yy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">
                    {selectedTicket.ticket_number}
                  </Badge>
                  <StatusBadge status={selectedTicket.status} />
                  <UrgencyBadge urgency={selectedTicket.urgency} />
                </div>
                <DialogTitle className="text-xl">{selectedTicket.subject}</DialogTitle>
              </DialogHeader>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                  {/* Ticket Info */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedTicket.student_name}</p>
                        <p className="text-sm text-slate-500">{selectedTicket.student_email}</p>
                      </div>
                    </div>
                    <CategoryBadge category={selectedTicket.category} />
                    <p className="mt-3 text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                    {selectedTicket.attachment_url && (
                      <a 
                        href={selectedTicket.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        צפייה בקובץ מצורף
                      </a>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      הודעות ותגובות
                    </h4>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {messages.filter(m => !m.is_internal_note).map((msg) => (
                        <div 
                          key={msg.id}
                          className={`p-4 rounded-lg ${
                            msg.is_staff 
                              ? "bg-blue-50 border border-blue-100" 
                              : "bg-slate-50 border border-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">{msg.author_name}</span>
                            {msg.is_staff && <Badge variant="secondary" className="text-xs">צוות</Badge>}
                            <span className="text-xs text-slate-400 mr-auto">
                              {format(new Date(msg.created_date), "d/M HH:mm")}
                            </span>
                          </div>
                          <p className="text-slate-700 text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply Box */}
                    <div className="space-y-2 pt-2 border-t">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="כתבו תגובה לסטודנט..."
                        className="min-h-[80px]"
                      />
                      <Button 
                        onClick={() => handleSendMessage(false)}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 ml-2" />
                        שליחת תגובה
                      </Button>
                    </div>
                  </div>

                  {/* Internal Notes */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <StickyNote className="w-4 h-4" />
                      הערות פנימיות (לצוות בלבד)
                    </h4>

                    <div className="space-y-3 max-h-40 overflow-y-auto">
                      {messages.filter(m => m.is_internal_note).map((msg) => (
                        <div key={msg.id} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{msg.author_name}</span>
                            <span className="text-xs text-slate-400">
                              {format(new Date(msg.created_date), "d/M HH:mm")}
                            </span>
                          </div>
                          <p className="text-slate-700 text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Textarea
                        value={newInternalNote}
                        onChange={(e) => setNewInternalNote(e.target.value)}
                        placeholder="הערה פנימית..."
                        className="min-h-[60px]"
                      />
                      <Button 
                        variant="outline"
                        onClick={() => handleSendMessage(true)}
                        disabled={!newInternalNote.trim() || sendingMessage}
                      >
                        <StickyNote className="w-4 h-4 ml-2" />
                        הוספת הערה
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Status Change */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">עדכון סטטוס</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <Button
                          key={key}
                          variant={selectedTicket.status === key ? "default" : "outline"}
                          className={`w-full justify-start ${selectedTicket.status === key ? "bg-blue-600" : ""}`}
                          onClick={() => handleStatusChange(key)}
                        >
                          <config.icon className="w-4 h-4 ml-2" />
                          {config.label}
                        </Button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Assignment (Admin only) */}
                  {isAdmin && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">הקצאה למתרגל</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {selectedTicket.assigned_tas?.length > 0 ? (
                            selectedTicket.assigned_tas.map(ta => (
                              <Badge key={ta} variant="secondary">{ta}</Badge>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">לא הוקצה</p>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            setSelectedTAs(selectedTicket.assigned_tas || []);
                            setShowAssignDialog(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 ml-2" />
                          עריכת הקצאה
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleForwardEmail(selectedTicket)}
                        >
                          <Mail className="w-4 h-4 ml-2" />
                          העברה במייל
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Activity Log */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">יומן פעילות</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {ticketLogs.map((log) => (
                          <div key={log.id} className="text-xs border-b pb-2">
                            <p className="font-medium">{log.details}</p>
                            <p className="text-slate-400">
                              {log.actor_name} • {format(new Date(log.created_date), "d/M HH:mm")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הקצאת פנייה למתרגלים</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {staffUsers.map((staff) => (
              <div key={staff.email} className="flex items-center gap-3">
                <Checkbox
                  checked={selectedTAs.includes(staff.email)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTAs(prev => [...prev, staff.email]);
                    } else {
                      setSelectedTAs(prev => prev.filter(e => e !== staff.email));
                    }
                  }}
                />
                <div>
                  <p className="font-medium">{staff.full_name}</p>
                  <p className="text-sm text-slate-500">{staff.email}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleAssign} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="w-4 h-4 ml-2" />
              שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}