import { createTransport } from 'nodemailer';

const transporter = createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendRegistrationEmail({ name, email, phone, hikeName }) {
  await transporter.sendMail({
    from: `"Wanderer Registration" <${process.env.EMAIL_USER}>`,
    to: 'Wandererinfo24@gmail.com',
    replyTo: email,
    subject: `New Registration: ${hikeName}`,
    text: `New registration for ${hikeName}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}`,
    html: `
      <h2>New Hike Registration</h2>
      <p><strong>Hike:</strong> ${hikeName}</p>
      <hr>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
    `
  });
}

export async function sendContactEmail({ name, email, subject, message }) {
  await transporter.sendMail({
    from: `"Wanderer Contact Form" <${process.env.EMAIL_USER}>`,
    to: 'Wandererinfo24@gmail.com',
    replyTo: email,
    subject: `Contact: ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `
  });
}
