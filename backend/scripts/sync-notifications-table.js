/**
 * Create notifications table if not exists.
 * Run once: node scripts/sync-notifications-table.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../config/database.js';
import { Notification } from '../models/Notification.js';

async function run() {
  try {
    await Notification.sync({ alter: false });
    console.log('Notifications table ready.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
