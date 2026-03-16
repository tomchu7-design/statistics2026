import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Clock, User, MapPin, CheckCircle,
  Loader2, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { categoryConfig } from "@/components/shared/CategoryBadge";
import { toast } from "sonner";
import { format, addDays, startOfWeek, isSameDay, parseISO, isAfter, isBefore, addHours } from "date-fns";
import { he } from "date-fns/locale";

export default function OfficeHours() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTA, setSelectedTA] = useState("all");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [studentName, setStudentName] = useState(() => localStorage.getItem('studentName') || "");
  const [studentEmail, setStudentEmail] = useState(() => localStorage.getItem('studentEmail') || "");
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [booking, setBooking] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (!studentName) setStudentName(userData.full_name || "");
        if (!studentEmail) setStudentEmail(userData.email || "");
      } catch (e) {
        setUser(null);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const effectiveName = user?.full_name || studentName;
  const effectiveEmail = user?.email || studentEmail;

  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);

  const { data: availabilities = [], isLoading: loadingAvail } = useQuery({
    queryKey: ["ta-availability"],
    queryFn: async () => {
      const data = await base44.entities.TAAvailability.filter({ is_active: true }, "date");
      return data.filter(a => isAfter(parseISO(a.date), addDays(today, -1)));
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["all-appointments"],
    queryFn: async () => base44.entities.Appointment.filter({ status: "booked" }),
  });

  const { data: myAppointments = [] } = useQuery({
    queryKey: ["my-appointments", effectiveEmail],
    queryFn: async () => {
      if (!effectiveEmail) return [];
      return base44.entities.Appointment.filter(
        { student_email: effectiveEmail, status: "booked" }, "date"
      );
    },
    enabled: !!effectiveEmail,
  });

  const tas = [...new Map(availabilities.map(a => [a.ta_email, { email: a.ta_email, name: a.ta_name }])).values()];

  const filteredAvailabilities = availabilities.filter(a => {
    if (selectedTA !== "all" && a.ta_email !== selectedTA) return false;
    const availDate = parseISO(a.date);
    return !isBefore(availDate, weekStart) && !isAfter(availDate, weekEnd);
  });

  const generateSlots = (availability) => {
    const slots = [];
    const [startHour, startMin] = availability.start_time.split(':').map(Number);
    const [endHour, endMin] = availability.end_time.split(':').map(Number);
    const duration = availability.slot_duration || 20;
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + duration <= endMinutes) {
      const slotStart = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      const slotEndMinutes = currentMinutes + duration;
      const slotEnd = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`;

      const isBooked = appointments.some(app =>
        app.ta_email === availability.ta_email &&
        app.date === availability.date &&
        app.start_time === slotStart
      );
      const slotDateTime = new Date(`${availability.date}T${slotStart}`);
      const isPast = isBefore(slotDateTime, new Date());

      slots.push({ start: slotStart, end: slotEnd, isBooked, isPast, availability });
      currentMinutes += duration;
    }
    return slots;
  };

  const handleSelectSlot = (slot) => {
    if (slot.isBooked || slot.isPast) return;
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

  const handleBook = async () => {
    if (!selectedSlot || !bookingTopic) return;
    if (!effectiveName.trim() || !effectiveEmail.trim()) {
      toast.error("יש להזין שם ואימייל");
      return;
    }

    const activeBookings = myAppointments.filter(a =>
      isAfter(parseISO(a.date), addDays(today, -1))
    ).length;

    if (activeBookings >= 2) {
      toast.error("יש לך כבר 2 פגישות פעילות. בטל אחת מהן כדי לקבוע חדשה.");
      return;
    }

    setBooking(true);
    setShowBookingDialog(false);
    try {
    await base44.entities.Appointment.create({
        student_email: effectiveEmail,
        student_name: effectiveName,
        ta_email: selectedSlot.availability.ta_email,
        ta_name: selectedSlot.availability.ta_name,
        availability_id: selectedSlot.availability.id,
        date: selectedSlot.availability.date,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        topic: bookingTopic,
        notes: bookingNotes,
        status: "booked",
        reminder_sent: false,
      });

      // Save to localStorage for next time
      localStorage.setItem('studentName', effectiveName);
      localStorage.setItem('studentEmail', effectiveEmail);

      // Immediately update UI
      toast.success("הפגישה נקבעה בהצלחה!");
      setSelectedSlot(null);
      setBookingTopic("");
      setBookingNotes("");
      queryClient.invalidateQueries({ queryKey: ["all-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });

      // Send emails (non-blocking)
      const dateStr = format(parseISO(selectedSlot.availability.date), "EEEE, d בMMMM yyyy", { locale: he });
      const zoomDetails = selectedSlot.availability.zoom_meeting_id
        ? `מזהה פגישה: ${selectedSlot.availability.zoom_meeting_id}\nסיסמה: ${selectedSlot.availability.zoom_password || 'אין'}`
        : "לא הוזנו פרטי זום";

      try {
        await Promise.all([
          base44.integrations.Core.SendEmail({
            to: effectiveEmail,
            subject: `נקבעה שעת קבלה לקורס סטטיסטיקה`,
            body: `שלום,\n\nנקבעה שעת קבלה עם ${selectedSlot.availability.ta_name} בקורס סטטיסטיקה.\nהפגישה נקבעה לתאריך ${dateStr} בשעה ${selectedSlot.start}.\nההתחברות לשעת קבלה היא בזום.\nפרטי ההתחברות לפגישה:\n${zoomDetails}\n\nתודה, סגל הקורס`
          }),
          base44.integrations.Core.SendEmail({
            to: selectedSlot.availability.ta_email,
            subject: `נקבעה שעת קבלה חדשה`,
            body: `שלום ${selectedSlot.availability.ta_name},\n\nנקבעה שעת קבלה ע"י הסטודנט ${effectiveName} (${effectiveEmail}).\nהפגישה נקבעה לתאריך ${dateStr} בשעה ${selectedSlot.start}.\nפרטי ההתחברות לפגישה:\n${zoomDetails}\n\nבהצלחה!`
          }),
        ]);
      } catch (emailError) {
        console.warn("Email sending failed:", emailError.message);
      }
    } catch (error) {
      toast.error("שגיאה בקביעת הפגישה: " + error.message);
    }
    setBooking(false);
  };

  const handleCancelAppointment = async (appointment) => {
    const appointmentTime = new Date(`${appointment.date}T${appointment.start_time}`);
    if (isAfter(addHours(new Date(), 12), appointmentTime)) {
      toast.error("לא ניתן לבטל פגישה פחות מ-12 שעות לפני מועדה");
      return;
    }
    try {
      await base44.entities.Appointment.update(appointment.id, { status: "cancelled" });
      toast.success("הפגישה בוטלה");
      queryClient.invalidateQueries({ queryKey: ["all-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
          <Calendar className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">שעות קבלה</h1>
        <p className="text-slate-600">קבעו פגישה עם אחת המתרגלות</p>
      </div>

      {/* My Appointments */}
      {myAppointments.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              הפגישות שלי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myAppointments.map((apt) => (
                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{apt.ta_name}</p>
                      <p className="text-sm text-slate-500">
                        {format(parseISO(apt.date), "EEEE, d/M", { locale: he })} | {apt.start_time} - {apt.end_time}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleCancelAppointment(apt)}
                  >
                    <X className="w-4 h-4 ml-1" />
                    ביטול
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <Label className="text-sm text-slate-500 mb-1 block">בחירת מתרגלת</Label>
              <Select value={selectedTA} onValueChange={setSelectedTA}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="כל המתרגלות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המתרגלות</SelectItem>
                  {tas.map((ta) => (
                    <SelectItem key={ta.email} value={ta.email}>{ta.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekOffset(prev => prev - 1)} disabled={weekOffset <= 0}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600 min-w-[140px] text-center">
                {format(weekStart, "d/M", { locale: he })} - {format(weekEnd, "d/M", { locale: he })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setWeekOffset(prev => prev + 1)} disabled={weekOffset >= 20}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {loadingAvail ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredAvailabilities.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">אין שעות קבלה זמינות</h3>
            <p className="text-slate-500">לא נמצאו שעות קבלה לשבוע זה</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weekDays.map((day) => {
            const dayAvailabilities = filteredAvailabilities.filter(a => isSameDay(parseISO(a.date), day));
            if (dayAvailabilities.length === 0) return null;
            return (
              <Card key={day.toISOString()} className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {format(day, "EEEE, d/M", { locale: he })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dayAvailabilities.map((availability) => (
                    <div key={availability.id} className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-sm">{availability.ta_name}</span>
                        {availability.location && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="w-3 h-3 ml-1" />
                            {availability.location}
                          </Badge>
                        )}
                        {availability.zoom_meeting_id && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            ID: {availability.zoom_meeting_id}
                            {availability.zoom_password && ` | סיסמה: ${availability.zoom_password}`}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {generateSlots(availability).map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSlot(slot)}
                            disabled={slot.isBooked || slot.isPast}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              slot.isBooked || slot.isPast
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            <Clock className="w-3 h-3 inline ml-1" />
                            {slot.start}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>קביעת פגישה</DialogTitle>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{selectedSlot.availability.ta_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{format(parseISO(selectedSlot.availability.date), "EEEE, d בMMMM yyyy", { locale: he })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{selectedSlot.start} - {selectedSlot.end}</span>
                </div>
              </div>

              {/* Student info fields (always shown for non-logged-in users) */}
              {!user && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>שם מלא *</Label>
                    <Input
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="שם מלא"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>אימייל *</Label>
                    <Input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>נושא הפגישה *</Label>
                <Select value={bookingTopic} onValueChange={setBookingTopic}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחרו נושא" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).filter(([k]) => k !== "general").map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>הערות (אופציונלי)</Label>
                <Textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="פרטו במה תרצו לדבר..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>ביטול</Button>
            <Button
              onClick={handleBook}
              disabled={!bookingTopic || booking || (!user && (!studentName.trim() || !studentEmail.trim()))}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {booking
                ? <Loader2 className="w-4 h-4 animate-spin ml-2" />
                : <CheckCircle className="w-4 h-4 ml-2" />}
              אישור קביעת פגישה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}