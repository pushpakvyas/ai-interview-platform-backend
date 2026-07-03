import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("⚠️ Failed to send email:", err.message);
    return false;
  }
}

export const emailTemplates = {
  interviewScheduled: (candidateName, technology, date, time, loginUrl) => ({
    subject: "Your interview has been scheduled",
    html: `<p>Hi ${candidateName},</p><p>Your ${technology} interview has been scheduled on <b>${date}</b> at <b>${time}</b>.</p>${
      loginUrl ? `<p>Log in to the platform to prepare and take your interview: <a href="${loginUrl}">${loginUrl}</a></p>` : ""
    }`,
  }),
  candidateWelcome: (candidateName, email, tempPassword, loginUrl) => ({
    subject: "Your AI Interview Platform account",
    html: `<p>Hi ${candidateName},</p><p>An account has been created for you on the AI Interview Platform.</p>
      <p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${tempPassword}</p>
      <p>Log in here: <a href="${loginUrl}">${loginUrl}</a></p>
      <p>Please keep these credentials safe.</p>`,
  }),
  credentialsAndInterview: (candidateName, email, tempPassword, technology, date, time, loginUrl) => ({
    subject: "Your interview has been scheduled — account details inside",
    html: `<p>Hi ${candidateName},</p><p>An account has been created for you on the AI Interview Platform, and your ${technology} interview has been scheduled on <b>${date}</b> at <b>${time}</b>.</p>
      <p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${tempPassword}</p>
      <p>Log in here to prepare and take your interview: <a href="${loginUrl}">${loginUrl}</a></p>
      <p>Please keep these credentials safe.</p>`,
  }),
  interviewRescheduled: (candidateName, technology, date, time) => ({
    subject: "Your interview has been rescheduled",
    html: `<p>Hi ${candidateName},</p><p>Your ${technology} interview has been rescheduled to <b>${date}</b> at <b>${time}</b>.</p>`,
  }),
  interviewCancelled: (candidateName, technology) => ({
    subject: "Your interview has been cancelled",
    html: `<p>Hi ${candidateName},</p><p>Your ${technology} interview has been cancelled. Please contact the admin for more information.</p>`,
  }),
  interviewReminder: (candidateName, technology, time) => ({
    subject: "Interview reminder",
    html: `<p>Hi ${candidateName},</p><p>This is a reminder that your ${technology} interview is scheduled today at <b>${time}</b>.</p>`,
  }),
  resultGenerated: (candidateName, technology, overallScore) => ({
    subject: "Your interview result is ready",
    html: `<p>Hi ${candidateName},</p><p>Your result for the ${technology} interview is ready. Overall score: <b>${overallScore}/100</b>.</p>`,
  }),
};
