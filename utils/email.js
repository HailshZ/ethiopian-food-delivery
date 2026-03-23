// utils/email.js – Email notifications using Nodemailer
const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send order confirmation email
async function sendOrderConfirmation(order, user, settings) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('📧 SMTP not configured – skipping email for order', order._id);
      return;
    }

    if (!user.email) {
      console.log('📧 User has no email – skipping order confirmation email for order', order._id);
      return;
    }

    const transporter = createTransporter();
    const currency = (settings && settings.currencySymbol) || 'ETB';
    const systemName = (settings && settings.systemName) || 'EthioFood Delivery';

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${currency} ${item.totalPrice.toFixed(2)}</td>
      </tr>
    `).join('');

    const discountLine = order.discount > 0 ? `
      <tr>
        <td colspan="2" style="padding: 10px; text-align: right; color: #078930;"><strong>Discount (${order.promoCode})</strong></td>
        <td style="padding: 10px; text-align: right; color: #078930;"><strong>-${currency} ${order.discount.toFixed(2)}</strong></td>
      </tr>
    ` : '';

    const html = `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #078930, #056b24); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 Order Confirmed!</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">${systemName}</p>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #eee;">
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Thank you for your order! Here are your order details:</p>
        
        <div style="background: #f8f9fb; border-radius: 8px; padding: 15px; margin: 15px 0;">
          <p style="margin: 0;"><strong>Order ID:</strong> ${order._id}</p>
          <p style="margin: 5px 0 0;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8f9fb;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            ${discountLine}
            <tr>
              <td colspan="2" style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 16px;">Total</td>
              <td style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 16px; color: #078930;">${currency} ${(order.finalAmount || order.totalAmount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="background: #f0fdf0; border-left: 4px solid #078930; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <p style="margin: 0; font-weight: 600; color: #078930;">📍 Delivery Address</p>
          <p style="margin: 5px 0 0;">${order.shippingAddress.street}, ${order.shippingAddress.city} ${order.shippingAddress.zipCode}</p>
        </div>

        <p style="color: #666;">Estimated delivery time: <strong>45 minutes</strong></p>
        <p style="color: #666;">You can track your order in real-time from your orders page.</p>
      </div>
      <div style="background: #1a1a2e; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 12px;">&copy; ${new Date().getFullYear()} ${systemName}. All rights reserved.</p>
      </div>
    </div>
    `;

    const info = await transporter.sendMail({
      from: `"${systemName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: `Order Confirmed – ${systemName} #${order._id.toString().slice(-6)}`,
      html: html
    });

    console.log('📧 Order confirmation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('📧 Email error:', error.message);
    // Don't throw – email failure shouldn't break the order flow
  }
}

module.exports = { sendOrderConfirmation };
