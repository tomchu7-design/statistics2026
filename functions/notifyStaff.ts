import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { ticketNumber, studentName, studentEmail, studentId, category, categoryLabel, subtopic, subject, description, attachmentUrl } = await req.json();

    await base44.integrations.Core.SendEmail({
      to: "statisticshaifa26@gmail.com",
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

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});