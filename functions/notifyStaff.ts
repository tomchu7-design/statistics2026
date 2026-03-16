import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STAFF_EMAIL = "statisticshaifa26@gmail.com";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    if (payload.type === "appointment") {
      const { studentName, studentEmail, taName, taEmail, dateStr, startTime, endTime, zoomDetails } = payload;

      await Promise.all([
        base44.asServiceRole.integrations.Core.SendEmail({
          to: studentEmail,
          subject: `נקבעה שעת קבלה לקורס סטטיסטיקה`,
          body: `שלום,\n\nנקבעה שעת קבלה עם ${taName} בקורס סטטיסטיקה.\nהפגישה נקבעה לתאריך ${dateStr} בשעה ${startTime}.\nההתחברות לשעת קבלה היא בזום.\nפרטי ההתחברות לפגישה:\n${zoomDetails}\n\nתודה, סגל הקורס`
        }),
        base44.asServiceRole.integrations.Core.SendEmail({
          to: taEmail,
          subject: `נקבעה שעת קבלה חדשה לקורס סטטיסטיקה`,
          body: `שלום ${taName},\n\nנקבעה שעת קבלה ע"י הסטודנט ${studentName} (${studentEmail}).\nהפגישה נקבעה לתאריך ${dateStr} בשעה ${startTime}.\nפרטי ההתחברות לפגישה:\n${zoomDetails}\n\nבהצלחה!`
        })
      ]);
    } else {
      // type === "ticket"
      const { ticketNumber, studentName, studentEmail, studentId, category, categoryLabel, subtopic, subject, description, attachmentUrl, assignedTa, emailConsent } = payload;

      const staffBody = [
        `מספר פנייה: ${ticketNumber}`,
        `שם הסטודנט: ${studentName}`,
        `מייל למענה: ${studentEmail}`,
        studentId ? `תעודת זהות: ${studentId}` : null,
        `קטגוריה: ${categoryLabel || category}`,
        subtopic ? `תת-נושא: ${subtopic}` : null,
        assignedTa ? `מתרגלת: ${assignedTa}` : `מתרגלת: לא צוין`,
        ``,
        `נושא הפנייה: ${subject}`,
        ``,
        `תוכן הפנייה:`,
        description,
        attachmentUrl ? `\nקובץ מצורף: ${attachmentUrl}` : null,
      ].filter(line => line !== null).join('\n');

      const studentBody = [
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
      ].filter(line => line !== null).join('\n');

      const emailTasks = [
        base44.asServiceRole.integrations.Core.SendEmail({
          to: STAFF_EMAIL,
          subject: `פנייה חדשה #${ticketNumber} - ${subject}`,
          body: staffBody,
        })
      ];

      if (emailConsent && studentEmail) {
        emailTasks.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            to: studentEmail,
            subject: `פנייתך התקבלה - מספר ${ticketNumber}`,
            body: studentBody,
          })
        );
      }

      await Promise.all(emailTasks);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});