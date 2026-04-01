import { EMAIL_EVENTS } from '../config/emailEvents.js';

export const getEmailTemplate = (event, role, eventData) => {
  let subject = 'HTCMS Notification';
  let message = 'You have a new notification.';
  let html = `<p>You have a new notification.</p>`;

  switch (event) {
    case EMAIL_EVENTS.PAYMENT_CREATED:
      if (role === 'admin' || role === 'officer') {
        subject = 'New Payment Created';
        message = `A new payment has been created. Payment ID: ${eventData.paymentId}. Amount: ${eventData.amount}`;
        html = `
          <h3>New Payment Created</h3>
          <p><strong>Payment ID:</strong> ${eventData.paymentId}</p>
          <p><strong>Amount:</strong> ${eventData.amount}</p>
          <p><strong>Method:</strong> ${eventData.paymentMethod || 'N/A'}</p>
          <p>Please review the payment details in the admin portal.</p>
        `;
      }
      break;

    case EMAIL_EVENTS.PAYMENT_APPROVED:
      if (role === 'collector') {
        subject = 'Payment Approved';
        message = `Payment ${eventData.paymentId} has been approved.`;
        html = `
          <h3>Payment Approved</h3>
          <p>The following payment has been approved:</p>
          <p><strong>Payment ID:</strong> ${eventData.paymentId}</p>
          <p><strong>Amount:</strong> ${eventData.amount}</p>
          <p>You can proceed with the next steps for this collection.</p>
        `;
      }
      break;

    case EMAIL_EVENTS.PAYMENT_SUCCESS:
      if (role === 'citizen') {
        subject = 'Payment Successful';
        message = `Your payment of ${eventData.amount} for ${eventData.paymentId} was successful. Thank you.`;
        html = `
          <h3>Payment Successful</h3>
          <p>Dear Citizen,</p>
          <p>Your payment of <strong>${eventData.amount}</strong> was successful.</p>
          <p><strong>Payment ID:</strong> ${eventData.paymentId}</p>
          <p>Thank you for your prompt payment.</p>
        `;
      }
      break;

    case EMAIL_EVENTS.DEMAND_GENERATED:
      if (role === 'citizen') {
        subject = 'New Demand Generated';
        message = `A new demand has been generated. Demand ID: ${eventData.demandId}. Amount Due: ${eventData.amountDue}.`;
        html = `
          <h3>New Demand Generated</h3>
          <p>Dear Citizen,</p>
          <p>A new demand has been generated for your record.</p>
          <p><strong>Demand ID:</strong> ${eventData.demandId}</p>
          <p><strong>Amount Due:</strong> ${eventData.amountDue}</p>
          <p>Please login to your citizen portal to view and pay the demand.</p>
        `;
      }
      break;
  }

  return { subject, message, html };
};
