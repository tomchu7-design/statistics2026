import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  MessageSquarePlus, 
  ChevronLeft,
  Clock,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
  MessageCircle,
  Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import CategoryBadge from "@/components/shared/CategoryBadge";
import StatusBadge, { statusConfig } from "@/components/shared/StatusBadge";
import UrgencyBadge from "@/components/shared/UrgencyBadge";
import { toast } from "sonner";

export default function MyTickets() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState("");
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

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ["my-tickets", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const data = await base44.entities.Ticket.filter(
        { student_email: user.email },
        "-created_date"
      );
      return data;
    },
    enabled: !!user?.email,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["ticket-messages", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      const data = await base44.entities.TicketMessage.filter(
        { ticket_id: selectedTicket.id, is_internal_note: false },
        "created_date"
      );
      return data;
    },
    enabled: !!selectedTicket?.id,
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      await base44.entities.TicketMessage.create({
        ticket_id: selectedTicket.id,
        author_email: user.email,
        author_name: user.full_name,
        message: newMessage,
        is_internal_note: false,
        is_staff: false,
      });

      // Update ticket status if it was waiting for student
      if (selectedTicket.status === "waiting_for_student") {
        await base44.entities.Ticket.update(selectedTicket.id, {
          status: "in_progress",
        });
        queryClient.invalidateQueries(["my-tickets"]);
      }

      setNewMessage("");
      refetchMessages();
      toast.success("ההודעה נשלחה");
    } catch (error) {
      toast.error("שגיאה בשליחת ההודעה");
    }
    setSendingMessage(false);
  };

  const handleMarkResolved = async () => {
    if (!selectedTicket) return;

    try {
      await base44.entities.Ticket.update(selectedTicket.id, {
        status: "resolved",
      });
      queryClient.invalidateQueries(["my-tickets"]);
      setSelectedTicket(prev => ({ ...prev, status: "resolved" }));
      toast.success("הפנייה סומנה כטופלה");
    } catch (error) {
      toast.error("שגיאה בעדכון הסטטוס");
    }
  };

  if (loading || loadingTickets) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">יש להתחבר תחילה</h2>
            <p className="text-slate-600 mb-6">כדי לצפות בפניות שלך, יש להתחבר למערכת</p>
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-blue-600 hover:bg-blue-700">
              התחברות למערכת
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">הפניות שלי</h1>
          <p className="text-slate-600 mt-1">צפו בסטטוס הפניות שפתחתם</p>
        </div>
        <Link to={createPageUrl("NewTicket")}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <MessageSquarePlus className="w-4 h-4 ml-2" />
            פנייה חדשה
          </Button>
        </Link>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">אין פניות</h3>
            <p className="text-slate-500 mb-6">עדיין לא פתחתם פניות לצוות הקורס</p>
            <Link to={createPageUrl("NewTicket")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <MessageSquarePlus className="w-4 h-4 ml-2" />
                פתיחת פנייה חדשה
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card 
              key={ticket.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                ticket.status === "resolved" ? "opacity-70" : ""
              } ${selectedTicket?.id === ticket.id ? "ring-2 ring-blue-500" : "border-slate-200"}`}
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {ticket.ticket_number}
                      </Badge>
                      <StatusBadge status={ticket.status} size="sm" />
                    </div>
                    
                    <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                      {ticket.subject}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                      {ticket.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={ticket.category} size="sm" showIcon={false} />
                      <UrgencyBadge urgency={ticket.urgency} size="sm" />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.created_date).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>
                  
                  <ChevronLeft className="w-5 h-5 text-slate-400 hidden sm:block" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">
                    {selectedTicket.ticket_number}
                  </Badge>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <DialogTitle className="text-xl">{selectedTicket.subject}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Ticket Info */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <CategoryBadge category={selectedTicket.category} />
                    <UrgencyBadge urgency={selectedTicket.urgency} />
                  </div>
                  
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                  
                  {selectedTicket.attachment_url && (
                    <a 
                      href={selectedTicket.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <Paperclip className="w-4 h-4" />
                      צפייה בקובץ מצורף
                    </a>
                  )}
                  
                  <p className="text-xs text-slate-400">
                    נפתח: {new Date(selectedTicket.created_date).toLocaleString('he-IL')}
                  </p>
                </div>

                {/* Messages */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    הודעות ({messages.length})
                  </h4>

                  {messages.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {messages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={`p-4 rounded-lg ${
                            msg.is_staff 
                              ? "bg-blue-50 border border-blue-100" 
                              : "bg-slate-50 border border-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">
                              {msg.author_name}
                            </span>
                            {msg.is_staff && (
                              <Badge variant="secondary" className="text-xs">צוות</Badge>
                            )}
                            <span className="text-xs text-slate-400 mr-auto">
                              {new Date(msg.created_date).toLocaleString('he-IL')}
                            </span>
                          </div>
                          <p className="text-slate-700 text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">אין הודעות עדיין</p>
                  )}

                  {/* New Message */}
                  {selectedTicket.status !== "resolved" && (
                    <div className="space-y-3 pt-4 border-t">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="כתבו הודעה..."
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendingMessage}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {sendingMessage ? (
                            <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          ) : (
                            <Send className="w-4 h-4 ml-2" />
                          )}
                          שליחה
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={handleMarkResolved}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 ml-2" />
                          סמן כטופל
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}