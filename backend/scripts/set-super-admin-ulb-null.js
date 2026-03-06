/**
 * One-time: allow users.ulb_id to be NULL, then set ulb_id = NULL for the
 * designated super admin (user id 7) so they retain system-wide access (all ULBs).
 * All other admins with ulb_id set are restricted to their assigned ULB.
 *
 * Usage: node backend/scripts/set-super-admin-ulb-null.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { sequelize } from '../config/database.js';
import { User } from '../models/index.js';

const SUPER_ADMIN_USER_ID = 7;

async function main() {
  try {
    // 1. Make users.ulb_id nullable (DB may have NOT NULL from an earlier migration)
    await sequelize.query(
      'ALTER TABLE users ALTER COLUMN ulb_id DROP NOT NULL;'
    );
    console.log('users.ulb_id is now nullable.');

    const user = await User.findByPk(SUPER_ADMIN_USER_ID);
    if (!user) {
      console.error(`User with id ${SUPER_ADMIN_USER_ID} not found.`);
      process.exit(1);
    }
    await User.update(
      { ulb_id: null },
      { where: { id: SUPER_ADMIN_USER_ID } }
    );
    console.log(`Super admin set: user id ${SUPER_ADMIN_USER_ID} (${user.firstName} ${user.lastName}) now has ulb_id = NULL and will see all ULBs.`);
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
