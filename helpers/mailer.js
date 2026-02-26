import { createTransport } from 'nodemailer';
import { getBankDetails } from './qr.js';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const transporter = createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

export async function sendRegistrationEmail({ name, email, phone, hikeName, price, reference, qrDataUri }) {
  const banks = getBankDetails();
  const paymentHtml = price && reference ? `
      <hr>
      <h3>Payment Details</h3>
      <p><strong>Amount:</strong> &#8382;${escapeHtml(String(price))}</p>
      <p><strong>Reference:</strong> ${escapeHtml(reference)}</p>
      <p><strong>IBAN (BOG):</strong> ${escapeHtml(banks.bog.iban)}</p>
      <p><strong>IBAN (TBC):</strong> ${escapeHtml(banks.tbc.iban)}</p>
      <p><strong>Recipient:</strong> ${escapeHtml(banks.bog.holder)}</p>
      ${qrDataUri ? `<p>Scan QR to pay:</p><img src="${qrDataUri}" alt="Payment QR" width="250">` : ''}
  ` : '';

  // Email to admin
  await transporter.sendMail({
    from: `"Wanderer Registration" <${process.env.EMAIL_USER}>`,
    to: 'Wandererinfo24@gmail.com',
    replyTo: email,
    subject: `New Registration: ${hikeName}`,
    text: `New registration for ${hikeName}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}${reference ? `\nReference: ${reference}\nAmount: ${price}` : ''}`,
    html: `
      <h2>New Hike Registration</h2>
      <p><strong>Hike:</strong> ${escapeHtml(hikeName)}</p>
      <hr>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
      ${paymentHtml}
    `
  });

  // Confirmation email to customer
  if (email) {
    await transporter.sendMail({
      from: `"Wanderer" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Registration Confirmed: ${hikeName}`,
      html: `
        <h2>Registration Confirmed!</h2>
        <p>Thank you, <strong>${escapeHtml(name)}</strong>! Your registration for <strong>${escapeHtml(hikeName)}</strong> has been received.</p>
        ${paymentHtml}
        <hr>
        <p style="color:#888;font-size:0.9em;">Wanderer — Hiking Tourism in Georgia</p>
      `
    });
  }
}

export async function sendOrderEmails({ order, qrDataUri }) {
  const banks = getBankDetails();
  const itemRows = order.items.map(item =>
    `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>&#8382;${(item.price * item.quantity).toFixed(2)}</td></tr>`
  ).join('');

  const paymentHtml = order.paymentMethod === 'bank_transfer' ? `
    <h3>Bank Transfer Details</h3>
    <p><strong>Amount:</strong> &#8382;${order.total.toFixed(2)}</p>
    <p><strong>Reference:</strong> ${escapeHtml(order.id)}</p>
    <p><strong>IBAN (BOG):</strong> ${escapeHtml(banks.bog.iban)}</p>
    <p><strong>IBAN (TBC):</strong> ${escapeHtml(banks.tbc.iban)}</p>
    <p><strong>Recipient:</strong> ${escapeHtml(banks.bog.holder)}</p>
    ${qrDataUri ? `<p>Scan QR to pay:</p><img src="${qrDataUri}" alt="Payment QR" width="250">` : ''}
  ` : `<p><strong>Payment:</strong> ${escapeHtml(order.paymentMethod)}</p>`;

  const orderHtml = `
    <h2>Order ${escapeHtml(order.id)}</h2>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
      <tr><th>Product</th><th>Qty</th><th>Subtotal</th></tr>
      ${itemRows}
      <tr><td colspan="2" style="text-align:right;"><strong>Total</strong></td><td><strong>&#8382;${order.total.toFixed(2)}</strong></td></tr>
    </table>
  `;

  // Email to admin
  await transporter.sendMail({
    from: `"Wanderer Shop" <${process.env.EMAIL_USER}>`,
    to: 'Wandererinfo24@gmail.com',
    replyTo: order.customer.email,
    subject: `New Order: ${order.id}`,
    html: `
      ${orderHtml}
      <hr>
      <h3>Customer</h3>
      <p><strong>Name:</strong> ${escapeHtml(order.customer.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(order.customer.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(order.customer.phone)}</p>
      ${order.customer.address ? `<p><strong>Address:</strong> ${escapeHtml(order.customer.address)}</p>` : ''}
      ${paymentHtml}
    `
  });

  // Email to customer
  await transporter.sendMail({
    from: `"Wanderer" <${process.env.EMAIL_USER}>`,
    to: order.customer.email,
    subject: `Order Confirmation: ${order.id}`,
    html: `
      <h2>Thank you for your order!</h2>
      <p>Hi <strong>${escapeHtml(order.customer.name)}</strong>, your order has been received.</p>
      ${orderHtml}
      <hr>
      ${paymentHtml}
      <hr>
      <p style="color:#888;font-size:0.9em;">Wanderer — Hiking Tourism in Georgia</p>
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
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <hr>
      <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `
  });
}
