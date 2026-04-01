import { sendMail } from '../utils/mailer.js';
import { getEmailTemplate } from '../utils/emailTemplates.js';
import { ROLE_EVENT_MAPPING } from '../config/emailEvents.js';
import { User } from '../models/User.js';

/**
 * Sends a role-based email based on event and role definitions.
 * @param {string} event - The system event (e.g. PAYMENT_CREATED, DEMAND_GENERATED)
 * @param {object} eventData - Custom data for the email templates
 * @param {string|number|null} citizenUserId - User ID if specific citizen/user needs to be notified
 */
export const sendRoleBasedEmail = async (event, eventData, citizenUserId = null) => {
  try {
    const rolesToNotify = ROLE_EVENT_MAPPING[event];
    if (!rolesToNotify || rolesToNotify.length === 0) return;

    for (const role of rolesToNotify) {
      if (role === 'citizen') {
        if (citizenUserId) {
          const citizen = await User.findByPk(citizenUserId);
          if (citizen && citizen.email) {
            const template = getEmailTemplate(event, role, eventData);
            // Send email in background (no await here or wrapped in try/catch)
            sendMail({
              to: citizen.email,
              subject: template.subject,
              text: template.message,
              html: template.html,
            }).catch(e => console.error('Failed to send email to citizen:', e));
          }
        }
      } else {
        const users = await User.findAll({ where: { role, isActive: true } });
        const template = getEmailTemplate(event, role, eventData);
        
        for (const user of users) {
          if (user.email) {
            // Send email in background
            sendMail({
              to: user.email,
              subject: template.subject,
              text: template.message,
              html: template.html,
            }).catch(e => console.error(`Failed to send email to ${role}:`, e));
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed executing role based email for event ${event}:`, error);
  }
};
