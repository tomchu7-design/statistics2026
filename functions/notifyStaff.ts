import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STAFF_EMAIL = "statisticshaifa26@gmail.com";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    if (payload.type === "appointment") {
      const { studentName, studentEmail, taName, dateStr, startTime, endTime, topicLabel, notes, zoomLink } = payload;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: STAFF_EMAIL,
        subject: `פגישה חדשה נקבעה - ${studentName}`,
        body: `פגישה חדשה נקבעה במערכת שעות הקבלה:

סטודנט/ית: ${studentName} (${studentEmail})
מתרגלת: ${taName}
תאריך: ${dateStr}
שעה: ${startTime} - ${endTime}
נושא: ${topicLabel}
${notes ? `הערות: ${notes}` : ''}
${zoomLink ? `קישור זום: ${zoomLink}` : ''}`
      });
    } else {
      // type === "ticket"
      const { ticketNumber, studentName, studentEmail, studentId, category, categoryLabel, subtopic, subject, description, attachmentUrl } = payload;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: STAFF_EMAIL,
        subject: `פנייה חדשה ${ticketNumber} - ${categoryLabel || category}`,
        body: `פנייה חדשה התקבלה במערכת:

מספר פנייה: ${ticketNumber}
מאת: ${studentName}
אימייל: ${studentEmail}
${studentId ? `ת.ז: ${studentId}` : ''}

קטגוריה: ${categoryLabel || category}
${subtopic ? `תת-נושא: ${subtopic}` : ''}
נושא: ${subject}

תוכן הפנייה:
${description}

${attachmentUrl ? `קובץ מצורף: ${attachmentUrl}` : ''}

---
ניתן לטפל בפנייה דרך מערכת הדשבורד`
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});