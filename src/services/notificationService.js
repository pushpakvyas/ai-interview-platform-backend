import Notification from "../models/Notification.js";
import { sendEmail } from "./emailService.js";

export async function createNotification({ user, type, title, message, relatedInterview, sendAsEmail = false, emailHtml }) {
  const notification = await Notification.create({
    user,
    type,
    title,
    message,
    relatedInterview,
  });

  if (sendAsEmail && emailHtml) {
    const sent = await sendEmail({ to: emailHtml.to, subject: emailHtml.subject, html: emailHtml.html });
    if (sent) {
      notification.emailSent = true;
      await notification.save();
    }
  }

  return notification;
}
