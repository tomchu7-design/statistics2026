import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STAFF_EMAIL = "statisticshaifa26@gmail.com";

function toHtml(lines) {
  return lines.filter(line => line !== null && line !== undefined).join('<br>');
}

async function sendEmail(base44, to, subject, body) {
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body });
    console.log(`Email sent to: ${to}`);
  } catch (e) {
    console.error(`Failed to send email to ${to}: ${e.message}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    if (payload.type === "appointment") {
      const { studentName, studentEmail, taName, taEmail, dateStr, startTime, endTime, zoomDetails } = payload;

      const studentBody = toHtml([
        `שלום ${studentName},`,
        ``,
        `נקבעה שעת קבלה עם ${taName} בקורס סטטיסטיקה.`,
        ``,
        `תאריך: ${dateStr}`,
        `שעה: ${startTime} - ${endTime}`,
        ``,
        `ההתחברות לשעת קבלה היא בזום.`,
        `פרטי ההתחברות לפגישה:`,
        ...(zoomDetails || '').split('\n'),
        ``,
        `תודה, סגל הקורס`,
      ]);

      const taBody = toHtml([
        `שלום ${taName},`,
        ``,
        `נקבעה שעת קבלה חדשה על ידי סטודנט.`,
        ``,
        `שם הסטודנט: ${studentName}`,
        `מייל: ${studentEmail}`,
        `תאריך: ${dateStr}`,
        `שעה: ${startTime} - ${endTime}`,
        ``,
        `פרטי ההתחברות לפגישה:`,
        ...(zoomDetails || '').split('\n'),
        ``,
        `בהצלחה!`,
      ]);

      await sendEmail(base44, studentEmail, `נקבעה שעת קבלה לקורס סטטיסטיקה`, studentBody);
      await sendEmail(base44, taEmail, `נקבעה שעת קבלה חדשה לקורס סטטיסטיקה`, taBody);

    } else {
      // type === "ticket"
      const { ticketNumber, studentName, studentEmail, studentId, category, categoryLabel, subtopic, subject, description, attachmentUrl, assignedTa, emailConsent } = payload;

      const staffBody = toHtml([
        `מספר פנייה: ${ticketNumber}`,
        ``,
        `שם הסטודנט: ${studentName}`,
        `מייל למענה: ${studentEmail}`,
        studentId ? `תעודת זהות: ${studentId}` : null,
        `קטגוריה: ${categoryLabel || category}`,
        subtopic ? `תת-נושא: ${subtopic}` : null,
        `מתרגלת: ${assignedTa || 'לא צוין'}`,
        ``,
        `נושא הפנייה: ${subject}`,
        ``,
        `תוכן הפנייה:`,
        `---`,
        ...(description || '').split('\n'),
        `---`,
        attachmentUrl ? `קובץ מצורף: ${attachmentUrl}` : null,
      ]);

      const studentBody = toHtml([
        `שלום ${studentName},`,
        ``,
        `פנייתך לסגל קורס סטטיסטיקה התקבלה ותיענה בהקדם.`,
        ``,
        `מספר פנייה: ${ticketNumber}`,
        `נושא: ${subject}`,
        `קטגוריה: ${categoryLabel || category}`,
        assignedTa ? `מתרגלת: ${assignedTa}` : null,
        ``,
        `אנא שמרי את מספר הפנייה לצורך מעקב.`,
        `מענה לפנייתך יישלח ישירות למייל זה.`,
        ``,
        `תודה, סגל הקורס`,
      ]);

      await sendEmail(base44, STAFF_EMAIL, `פנייה חדשה #${ticketNumber} - ${subject}`, staffBody);

      if (emailConsent && studentEmail) {
        await sendEmail(base44, studentEmail, `פנייתך התקבלה - מספר ${ticketNumber}`, studentBody);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('notifyStaff error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});