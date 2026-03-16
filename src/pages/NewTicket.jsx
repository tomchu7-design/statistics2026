import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  MessageSquarePlus, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Loader2,
  X,
  FileText,
  Copy,
  Mail
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { categoryConfig } from "@/components/shared/CategoryBadge";
import { urgencyConfig } from "@/components/shared/UrgencyBadge";
import { toast } from "sonner";

export default function NewTicket() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialSubject = urlParams.get("subject") || "";

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [formData, setFormData] = useState({
    student_name: "",
    student_email: "",
    student_id: "",
    category: "",
    assigned_ta: "",
    subtopic: "",
    subject: initialSubject,
    description: "",
    attachment_url: "",
    email_consent: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData(prev => ({
          ...prev,
          student_name: userData.full_name || "",
          student_email: userData.email || "",
        }));
      } catch (e) {
        // User not logged in
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const generateTicketNumber = () => {
    const date = new Date();
    const prefix = date.getFullYear().toString().slice(-2) + 
                   (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${prefix}-${random}`;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקסימום 10MB)");
      return;
    }

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, attachment_url: file_url }));
      toast.success("הקובץ הועלה בהצלחה");
    } catch (error) {
      toast.error("שגיאה בהעלאת הקובץ");
    }
    setUploadingFile(false);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.student_name.trim()) newErrors.student_name = "שדה חובה";
    if (!formData.student_email.trim()) newErrors.student_email = "שדה חובה";
    if (!formData.category) newErrors.category = "יש לבחור קטגוריה";
    if (!formData.subject.trim()) newErrors.subject = "שדה חובה";
    if (!formData.description.trim()) newErrors.description = "שדה חובה";
    if (!formData.email_consent) newErrors.email_consent = "יש לאשר את ההסכמה";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const newTicketNumber = generateTicketNumber();
      
      await base44.entities.Ticket.create({
        ...formData,
        urgency: "medium",
        ticket_number: newTicketNumber,
        status: "new",
        assigned_tas: [],
      });

      // Create initial log entry
      await base44.entities.TicketLog.create({
        ticket_id: newTicketNumber,
        action: "created",
        actor_email: formData.student_email,
        actor_name: formData.student_name,
        details: "פנייה נוצרה",
      });

      setTicketNumber(newTicketNumber);
      setSubmitted(true);

      // Email to staff via backend function (service role)
      try {
        await base44.functions.invoke('notifyStaff', {
          type: "ticket",
          ticketNumber: newTicketNumber,
          studentName: formData.student_name,
          studentEmail: formData.student_email,
          studentId: formData.student_id,
          category: formData.category,
          categoryLabel: categoryConfig[formData.category]?.label || formData.category,
          subtopic: formData.subtopic,
          subject: formData.subject,
          description: formData.description,
          attachmentUrl: formData.attachment_url,
          assignedTa: formData.assigned_ta,
          emailConsent: formData.email_consent,
        });
      } catch (e) {
        console.error("Staff email failed:", e.message);
      }

    } catch (error) {
      toast.error("שגיאה בשליחת הפנייה. אנא נסו שוב.");
    }
    setSubmitting(false);
  };

  const copyTicketNumber = () => {
    navigator.clipboard.writeText(ticketNumber);
    toast.success("מספר הפנייה הועתק");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">הפנייה נשלחה בהצלחה!</h1>
            <p className="text-slate-600 mb-6">קיבלנו את פנייתך וצוות הקורס יחזור אליך בהקדם</p>
            
            <div className="bg-white rounded-xl p-6 border border-green-200 mb-6 inline-block">
              <p className="text-sm text-slate-500 mb-2">מספר הפנייה שלך</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono font-bold text-slate-900">{ticketNumber}</span>
                <Button variant="ghost" size="icon" onClick={copyTicketNumber}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-right mb-6 max-w-md mx-auto">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">אישור נשלח למייל</AlertTitle>
              <AlertDescription className="text-blue-700">
                שלחנו אישור קבלה לכתובת {formData.student_email}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to={createPageUrl("MyTickets")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <FileText className="w-4 h-4 ml-2" />
                  צפייה בפניות שלי
                </Button>
              </Link>
              <Link to={createPageUrl("Home")}>
                <Button variant="outline">
                  <ArrowRight className="w-4 h-4 ml-2" />
                  חזרה לדף הבית
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
          <MessageSquarePlus className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">פתיחת פנייה חדשה</h1>
        <p className="text-slate-600">מלאו את הפרטים וצוות הקורס יחזור אליכם בהקדם</p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">פרטים אישיים</h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student_name">שם מלא *</Label>
                  <Input
                    id="student_name"
                    value={formData.student_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, student_name: e.target.value }))}
                    className={errors.student_name ? "border-red-300" : ""}
                  />
                  {errors.student_name && <p className="text-red-500 text-sm">{errors.student_name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="student_email">אימייל *</Label>
                  <Input
                    id="student_email"
                    type="email"
                    value={formData.student_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, student_email: e.target.value }))}
                    className={errors.student_email ? "border-red-300" : ""}
                  />
                  {errors.student_email && <p className="text-red-500 text-sm">{errors.student_email}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student_id">תעודת זהות (אופציונלי)</Label>
                <Input
                  id="student_id"
                  value={formData.student_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  placeholder="9 ספרות"
                  className="max-w-xs"
                />
              </div>
            </div>

            {/* Ticket Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">פרטי הפנייה</h3>
              
              <div className="space-y-2">
                <Label>מתרגלת</Label>
                <Select
                  value={formData.assigned_ta}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_ta: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחרו מתרגלת (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="תום">תום</SelectItem>
                    <SelectItem value="יהל">יהל</SelectItem>
                    <SelectItem value="ג׳יהאן">ג׳יהאן</SelectItem>
                    <SelectItem value="דניאל">דניאל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>קטגוריה *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className={errors.category ? "border-red-300" : ""}>
                    <SelectValue placeholder="בחרו קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).filter(([k]) => k !== "general").map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtopic">תת-נושא (אופציונלי)</Label>
                <Input
                  id="subtopic"
                  value={formData.subtopic}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtopic: e.target.value }))}
                  placeholder="לדוגמה: תרגיל 3, שאלה 5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">נושא הפנייה *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className={errors.subject ? "border-red-300" : ""}
                  placeholder="תארו בקצרה את הפנייה"
                />
                {errors.subject && <p className="text-red-500 text-sm">{errors.subject}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">תיאור מפורט *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className={`min-h-[150px] ${errors.description ? "border-red-300" : ""}`}
                  placeholder="פרטו את השאלה או הבעיה שלכם..."
                />
                {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label>קובץ מצורף (אופציונלי)</Label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-blue-300 transition-colors">
                  {formData.attachment_url ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-slate-700">קובץ הועלה בהצלחה</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, attachment_url: "" }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                      {uploadingFile ? (
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-600">לחצו להעלאת קובץ</p>
                          <p className="text-sm text-slate-400">עד 10MB</p>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Consent */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="email_consent"
                  checked={formData.email_consent}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, email_consent: checked }))}
                  className={errors.email_consent ? "border-red-300" : ""}
                />
                <div className="space-y-1">
                  <Label htmlFor="email_consent" className="cursor-pointer">
                    אני מאשר/ת שייתכן ויצרו איתי קשר במייל *
                  </Label>
                  {errors.email_consent && <p className="text-red-500 text-sm">{errors.email_consent}</p>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                    שולח...
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="w-5 h-5 ml-2" />
                    שליחת פנייה
                  </>
                )}
              </Button>
              <Link to={createPageUrl("Home")} className="sm:w-auto">
                <Button type="button" variant="outline" className="w-full h-12">
                  ביטול
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}