import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { categoryConfig } from "@/components/shared/CategoryBadge";
import { toast } from "sonner";
import { format, addDays, startOfWeek, isSameDay, parseISO, isAfter, isBefore, addHours } from "date-fns";
import { he } from "date-fns/locale";

export default function OfficeHours() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTA, setSelectedTA] = useState("all");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

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

  // Get availability for next 2 weeks
  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);

  const { data: availabilities = [], isLoading: loadingAvail } = useQuery({
    queryKey: ["ta-availability"],
    queryFn: async () => {
      const data = await base44.entities.TAAvailability.filter({ is_active: true }, "date");
      return data.filter(a => {
        const availDate = parseISO(a.date);
        return isAfter(availDate, addDays(today, -1));
      });
    },
  });

  const { data: appointments = [], refetch: refetchAppointments } = useQuery({
    queryKey: ["all-appointments"],
    queryFn: async () => {
      const data = await base44.entities.Appointment.filter({ status: "booked" });
      return data;
    },
  });

  const { data: myAppointments = [] } = useQuery({
    queryKey: ["my-appointments", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const data = await base44.entities.Appointment.filter(
        { student_email: user.email, status: "booked" },
        "date"
      );
      return data;
    },
    enabled: !!user?.email,
  });

  // Get unique TAs
  const tas = [...new Map(availabilities.map(a => [a.ta_email, { email: a.ta_email, name: a.ta_name }])).values()];

  // Filter availabilities
  const filteredAvailabilities = availabilities.filter(a => {
    if (selectedTA !== "all" && a.ta_email !== selectedTA) return false;
    const availDate = parseISO(a.date);
    return !isBefore(availDate, weekStart) && !isAfter(availDate, weekEnd);
  });

  // Generate time slots for an availability
  const generateSlots = (availability) => {
    const slots = [];
    const [startHour, startMin] = availability.start_time.split(':').map(Number);
    const [endHour, endMin] = availability.end_time.split(':').map(Number);
    const duration = availability.slot_duration || 15;

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + duration <= endMinutes) {
      const slotStart = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
      const slotEndMinutes = currentMinutes + duration;
      const slotEnd = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`;
      
      // Check if slot is already booked
      const isBooked = appointments.some(app => 
        app.ta_email === availability.ta_email &&
        app.date === availability.date &&
        app.start_time === slotStart
      );

      // Check if slot is in the past
      const slotDateTime = new Date(`${availability.date}T${slotStart}`);
      const isPast = isBefore(slotDateTime, new Date());

      slots.push({
        start: slotStart,
        end: slotEnd,
        isBooked,
        isPast,
        availability,
      });

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

    // Check max bookings
    const activeBookings = myAppointments.filter(a => 
      isAfter(parseISO(a.date), addDays(today, -1))
    ).length;

    if (activeBookings >= 2) {
      toast.error("יש לך כבר 2 פגישות פעילות. בטל אחת מהן כדי לקבוע חדשה.");
      return;
    }

    try {
      await base44.entities.Appointment.create({
        student_email: user.email,
        student_name: user.full_name,
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

      // Send confirmation email to student with zoom link
      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `אישור פגישה עם ${selectedSlot.availability.ta_name}`,
          body: `שלום ${user.full_name},

פגישתך נקבעה בהצלחה!

מתרגלת: ${selectedSlot.availability.ta_name}
תאריך: ${format(parseISO(selectedSlot.availability.date), "EEEE, d בMMMM yyyy", { locale: he })}
שעה: ${selectedSlot.start} - ${selectedSlot.end}
נושא: ${categoryConfig[bookingTopic]?.label || bookingTopic}
${selectedSlot.availability.zoom_link ? `קישור זום: ${selectedSlot.availability.zoom_link}` : ''}

תזכורת תישלח אליך 24 שעות לפני הפגישה.

בברכה,
צוות קורס סטטיסטיקה`
        });
      } catch (e) {
        console.log("Email could not be sent to student");
      }

      // Send notification to TA
      try {
        await base44.integrations.Core.SendEmail({
          to: selectedSlot.availability.ta_email,
          subject: `פגישה חדשה נקבעה - ${user.full_name}`,
          body: `שלום ${selectedSlot.availability.ta_name},

סטודנט/ית קבע/ה פגישה איתך:

סטודנט/ית: ${user.full_name} (${user.email})
תאריך: ${format(parseISO(selectedSlot.availability.date), "EEEE, d בMMMM yyyy", { locale: he })}
שעה: ${selectedSlot.start} - ${selectedSlot.end}
נושא: ${categoryConfig[bookingTopic]?.label || bookingTopic}
${bookingNotes ? `הערות: ${bookingNotes}` : ''}

תוכלי לראות את הפגישה בדשבורד שלך.

בברכה,
מערכת שעות קבלה`
        });
      } catch (e) {
        console.log("Email could not be sent to TA");
      }

      toast.success("הפגישה נקבעה בהצלחה!");
      setShowBookingDialog(false);
      setSelectedSlot(null);
      setBookingTopic("");
      setBookingNotes("");
      queryClient.invalidateQueries(["all-appointments"]);
      queryClient.invalidateQueries(["my-appointments"]);
    } catch (error) {
      toast.error("שגיאה בקביעת הפגישה");
    }
  };

  const handleCancelAppointment = async (appointment) => {
    // Check cancellation policy (12 hours before)
    const appointmentTime = new Date(`${appointment.date}T${appointment.start_time}`);
    const minCancelTime = addHours(new Date(), 12);

    if (isAfter(minCancelTime, appointmentTime)) {
      toast.error("לא ניתן לבטל פגישה פחות מ-12 שעות לפני מועדה");
      return;
    }

    try {
      await base44.entities.Appointment.update(appointment.id, { status: "cancelled" });
      toast.success("הפגישה בוטלה");
      queryClient.invalidateQueries(["all-appointments"]);
      queryClient.invalidateQueries(["my-appointments"]);
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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">יש להתחבר תחילה</h2>
            <p className="text-slate-600 mb-6">כדי לקבוע שעות קבלה, יש להתחבר למערכת</p>
            <Button onClick={() => base44.auth.redirectToLogin()} className="bg-blue-600 hover:bg-blue-700">
              התחברות למערכת
            </Button>
          </CardContent>
        </Card>
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
        <p className="text-slate-600">קבעו פגישה עם אחד המתרגלים</p>
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
                <div 
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border"
                >
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
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <Label className="text-sm text-slate-500 mb-1 block">בחירת מתרגל/ת</Label>
              <Select value={selectedTA} onValueChange={setSelectedTA}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="כל המתרגלים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המתרגלים</SelectItem>
                  {tas.map((ta) => (
                    <SelectItem key={ta.email} value={ta.email}>{ta.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setWeekOffset(prev => prev - 1)}
                disabled={weekOffset <= 0}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600 min-w-[140px] text-center">
                {format(weekStart, "d/M", { locale: he })} - {format(weekEnd, "d/M", { locale: he })}
              </span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setWeekOffset(prev => prev + 1)}
                disabled={weekOffset >= 3}
              >
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
            const dayAvailabilities = filteredAvailabilities.filter(a => 
              isSameDay(parseISO(a.date), day)
            );

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
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-sm">{availability.ta_name}</span>
                        {availability.location && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="w-3 h-3 ml-1" />
                            {availability.location}
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
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
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
                {selectedSlot.availability.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{selectedSlot.availability.location}</span>
                  </div>
                )}
              </div>

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
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleBook}
              disabled={!bookingTopic}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="w-4 h-4 ml-2" />
              אישור קביעת פגישה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}