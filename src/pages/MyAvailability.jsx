import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, 
  Clock, 
  Plus,
  Trash2,
  MapPin,
  AlertCircle,
  Loader2,
  User,
  CheckCircle,
  X,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, parseISO, isAfter, addDays, isSameDay } from "date-fns";
import { he } from "date-fns/locale";

export default function MyAvailability() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAvailability, setNewAvailability] = useState({
    date: "",
    start_time: "09:00",
    end_time: "12:00",
    slot_duration: 15,
    location: "",
    zoom_meeting_id: "",
    zoom_password: "",
  });

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

  const isStaff = user?.role === "admin" || user?.staff_role === "ta" || user?.staff_role === "admin";

  const { data: myAvailabilities = [], isLoading: loadingAvail, refetch: refetchAvail } = useQuery({
    queryKey: ["my-availability", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const data = await base44.entities.TAAvailability.filter(
        { ta_email: user.email },
        "date"
      );
      // Filter to show only future dates
      return data.filter(a => isAfter(parseISO(a.date), addDays(new Date(), -1)));
    },
    enabled: !!user?.email && isStaff,
  });

  const { data: myAppointments = [], refetch: refetchAppointments } = useQuery({
    queryKey: ["ta-appointments", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const data = await base44.entities.Appointment.filter(
        { ta_email: user.email, status: "booked" },
        "date"
      );
      return data.filter(a => isAfter(parseISO(a.date), addDays(new Date(), -1)));
    },
    enabled: !!user?.email && isStaff,
  });

  const handleAddAvailability = async () => {
    if (!newAvailability.date || !newAvailability.start_time || !newAvailability.end_time) {
      toast.error("יש למלא את כל השדות");
      return;
    }

    try {
      await base44.entities.TAAvailability.create({
        ta_email: user.email,
        ta_name: user.full_name,
        ...newAvailability,
        is_active: true,
      });

      setShowAddDialog(false);
      setNewAvailability({
        date: "",
        start_time: "09:00",
        end_time: "12:00",
        slot_duration: 15,
        location: "",
        zoom_meeting_id: "",
        zoom_password: "",
      });
      refetchAvail();
      toast.success("הזמינות נוספה בהצלחה");
    } catch (error) {
      toast.error("שגיאה בהוספת הזמינות");
    }
  };

  const handleDeleteAvailability = async (id) => {
    // Check if there are any booked appointments
    const bookedOnThis = myAppointments.filter(a => a.availability_id === id);
    if (bookedOnThis.length > 0) {
      toast.error("לא ניתן למחוק זמינות עם פגישות מאושרות");
      return;
    }

    try {
      await base44.entities.TAAvailability.delete(id);
      refetchAvail();
      toast.success("הזמינות נמחקה");
    } catch (error) {
      toast.error("שגיאה במחיקת הזמינות");
    }
  };

  const handleCancelAppointment = async (appointment) => {
    try {
      await base44.entities.Appointment.update(appointment.id, { status: "cancelled" });

      // Send cancellation email
      try {
        await base44.integrations.Core.SendEmail({
          to: appointment.student_email,
          subject: "ביטול פגישה - קורס סטטיסטיקה",
          body: `שלום ${appointment.student_name},

לצערנו הפגישה שנקבעה בוטלה על ידי המתרגל.

תאריך: ${format(parseISO(appointment.date), "EEEE, d בMMMM yyyy", { locale: he })}
שעה: ${appointment.start_time}

אנא קבעו פגישה חדשה בזמן נוח אחר.

בברכה,
צוות קורס סטטיסטיקה`
        });
      } catch (e) {
        console.log("Email could not be sent");
      }

      refetchAppointments();
      toast.success("הפגישה בוטלה ונשלחה הודעה לסטודנט");
    } catch (error) {
      toast.error("שגיאה בביטול הפגישה");
    }
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

  // Group appointments by date
  const appointmentsByDate = myAppointments.reduce((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = [];
    acc[apt.date].push(apt);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-8 h-8" />
            הזמינות שלי
          </h1>
          <p className="text-slate-600 mt-1">ניהול שעות קבלה ופגישות</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 ml-2" />
          הוספת זמינות
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{myAvailabilities.length}</p>
            <p className="text-sm text-emerald-600">ימי זמינות</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{myAppointments.length}</p>
            <p className="text-sm text-blue-600">פגישות מאושרות</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      {myAppointments.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              פגישות קרובות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(appointmentsByDate).sort().map(([date, apts]) => (
                <div key={date}>
                  <h4 className="font-medium text-slate-700 mb-2">
                    {format(parseISO(date), "EEEE, d בMMMM", { locale: he })}
                  </h4>
                  <div className="space-y-2">
                    {apts.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((apt) => (
                      <div 
                        key={apt.id}
                        className="flex items-center justify-between bg-white p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{apt.student_name}</p>
                            <p className="text-sm text-slate-500">
                              {apt.start_time} - {apt.end_time} | {apt.student_email}
                            </p>
                            {apt.notes && (
                              <p className="text-sm text-slate-600 mt-1">הערה: {apt.notes}</p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleCancelAppointment(apt)}
                        >
                          <X className="w-4 h-4 ml-1" />
                          ביטול
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            שעות הקבלה שלי
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAvail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : myAvailabilities.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">לא הוגדרו שעות קבלה</p>
              <Button 
                variant="outline" 
                className="mt-3"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="w-4 h-4 ml-2" />
                הוספת זמינות
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myAvailabilities.map((avail) => {
                const appointmentsCount = myAppointments.filter(a => a.availability_id === avail.id).length;
                
                return (
                  <div 
                    key={avail.id}
                    className="flex items-center justify-between bg-slate-50 p-4 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(parseISO(avail.date), "EEEE, d בMMMM yyyy", { locale: he })}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {avail.start_time} - {avail.end_time}
                          </span>
                          <span>| {avail.slot_duration} דק' לפגישה</span>
                          {avail.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {avail.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {appointmentsCount > 0 && (
                        <Badge className="bg-blue-100 text-blue-700">
                          {appointmentsCount} פגישות
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteAvailability(avail.id)}
                        disabled={appointmentsCount > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Availability Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת זמינות חדשה</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>תאריך *</Label>
              <Input
                type="date"
                value={newAvailability.date}
                onChange={(e) => setNewAvailability(prev => ({ ...prev, date: e.target.value }))}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שעת התחלה *</Label>
                <Input
                  type="time"
                  value={newAvailability.start_time}
                  onChange={(e) => setNewAvailability(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>שעת סיום *</Label>
                <Input
                  type="time"
                  value={newAvailability.end_time}
                  onChange={(e) => setNewAvailability(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>משך פגישה (דקות)</Label>
              <Select
                value={String(newAvailability.slot_duration)}
                onValueChange={(v) => setNewAvailability(prev => ({ ...prev, slot_duration: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 דקות</SelectItem>
                  <SelectItem value="15">15 דקות</SelectItem>
                  <SelectItem value="20">20 דקות</SelectItem>
                  <SelectItem value="30">30 דקות</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>מיקום (אופציונלי)</Label>
              <Input
                value={newAvailability.location}
                onChange={(e) => setNewAvailability(prev => ({ ...prev, location: e.target.value }))}
                placeholder="חדר 123 / זום"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meeting ID (זום)</Label>
                <Input
                  value={newAvailability.zoom_meeting_id}
                  onChange={(e) => setNewAvailability(prev => ({ ...prev, zoom_meeting_id: e.target.value }))}
                  placeholder="123 456 7890"
                />
              </div>
              <div className="space-y-2">
                <Label>סיסמה (זום)</Label>
                <Input
                  value={newAvailability.zoom_password}
                  onChange={(e) => setNewAvailability(prev => ({ ...prev, zoom_password: e.target.value }))}
                  placeholder="123456"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleAddAvailability} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4 ml-2" />
              הוספה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}