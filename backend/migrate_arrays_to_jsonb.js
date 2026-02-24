import { sequelize } from './config/database.js';

async function migrateArraysToJsonb() {
    try {
        console.log('Starting migration: ARRAY to JSONB for toilet tables...');

        // For each ARRAY column, we:
        // 1. Add a new JSONB column
        // 2. Copy the data
        // 3. Drop the old column
        // 4. Rename the new column

        // ── toilet_maintenance.photos ──
        console.log('Migrating toilet_maintenance.photos...');
        await sequelize.query(`ALTER TABLE toilet_maintenance ADD COLUMN IF NOT EXISTS photos_new JSONB DEFAULT '[]'`);
        await sequelize.query(`UPDATE toilet_maintenance SET photos_new = to_jsonb(photos) WHERE photos IS NOT NULL`);
        await sequelize.query(`ALTER TABLE toilet_maintenance DROP COLUMN photos`);
        await sequelize.query(`ALTER TABLE toilet_maintenance RENAME COLUMN photos_new TO photos`);
        console.log('  Done: toilet_maintenance.photos');

        // ── toilet_maintenance.materialsUsed ──
        console.log('Migrating toilet_maintenance.materialsUsed...');
        // Check if it's already JSONB
        const [maintCols] = await sequelize.query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'toilet_maintenance' AND column_name = 'materialsUsed'`);
        if (maintCols.length && maintCols[0].data_type === 'ARRAY') {
            await sequelize.query(`ALTER TABLE toilet_maintenance ADD COLUMN IF NOT EXISTS "materialsUsed_new" JSONB DEFAULT '[]'`);
            await sequelize.query(`UPDATE toilet_maintenance SET "materialsUsed_new" = to_jsonb("materialsUsed") WHERE "materialsUsed" IS NOT NULL`);
            await sequelize.query(`ALTER TABLE toilet_maintenance DROP COLUMN "materialsUsed"`);
            await sequelize.query(`ALTER TABLE toilet_maintenance RENAME COLUMN "materialsUsed_new" TO "materialsUsed"`);
            console.log('  Done: toilet_maintenance.materialsUsed');
        } else {
            console.log('  Skipped: materialsUsed is already JSONB');
        }

        // ── toilet_inspections.photos ──
        console.log('Migrating toilet_inspections.photos...');
        const [inspCols] = await sequelize.query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'toilet_inspections' AND column_name = 'photos'`);
        if (inspCols.length && inspCols[0].data_type === 'ARRAY') {
            await sequelize.query(`ALTER TABLE toilet_inspections ADD COLUMN IF NOT EXISTS photos_new JSONB DEFAULT '[]'`);
            await sequelize.query(`UPDATE toilet_inspections SET photos_new = to_jsonb(photos) WHERE photos IS NOT NULL`);
            await sequelize.query(`ALTER TABLE toilet_inspections DROP COLUMN photos`);
            await sequelize.query(`ALTER TABLE toilet_inspections RENAME COLUMN photos_new TO photos`);
            console.log('  Done: toilet_inspections.photos');
        } else {
            console.log('  Skipped: already JSONB');
        }

        // ── toilet_complaints.photos ──
        console.log('Migrating toilet_complaints.photos...');
        const [compCols] = await sequelize.query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'toilet_complaints' AND column_name = 'photos'`);
        if (compCols.length && compCols[0].data_type === 'ARRAY') {
            await sequelize.query(`ALTER TABLE toilet_complaints ADD COLUMN IF NOT EXISTS photos_new JSONB DEFAULT '[]'`);
            await sequelize.query(`UPDATE toilet_complaints SET photos_new = to_jsonb(photos) WHERE photos IS NOT NULL`);
            await sequelize.query(`ALTER TABLE toilet_complaints DROP COLUMN photos`);
            await sequelize.query(`ALTER TABLE toilet_complaints RENAME COLUMN photos_new TO photos`);
            console.log('  Done: toilet_complaints.photos');
        } else {
            console.log('  Skipped: already JSONB');
        }

        // ── toilet_facilities.amenities ──
        console.log('Migrating toilet_facilities.amenities...');
        const [facAmenCols] = await sequelize.query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'toilet_facilities' AND column_name = 'amenities'`);
        if (facAmenCols.length && facAmenCols[0].data_type === 'ARRAY') {
            await sequelize.query(`ALTER TABLE toilet_facilities ADD COLUMN IF NOT EXISTS amenities_new JSONB DEFAULT '[]'`);
            await sequelize.query(`UPDATE toilet_facilities SET amenities_new = to_jsonb(amenities) WHERE amenities IS NOT NULL`);
            await sequelize.query(`ALTER TABLE toilet_facilities DROP COLUMN amenities`);
            await sequelize.query(`ALTER TABLE toilet_facilities RENAME COLUMN amenities_new TO amenities`);
            console.log('  Done: toilet_facilities.amenities');
        } else {
            console.log('  Skipped: already JSONB');
        }

        // ── toilet_facilities.photos ──
        console.log('Migrating toilet_facilities.photos...');
        const [facPhotoCols] = await sequelize.query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'toilet_facilities' AND column_name = 'photos'`);
        if (facPhotoCols.length && facPhotoCols[0].data_type === 'ARRAY') {
            await sequelize.query(`ALTER TABLE toilet_facilities ADD COLUMN IF NOT EXISTS photos_new JSONB DEFAULT '[]'`);
            await sequelize.query(`UPDATE toilet_facilities SET photos_new = to_jsonb(photos) WHERE photos IS NOT NULL`);
            await sequelize.query(`ALTER TABLE toilet_facilities DROP COLUMN photos`);
            await sequelize.query(`ALTER TABLE toilet_facilities RENAME COLUMN photos_new TO photos`);
            console.log('  Done: toilet_facilities.photos');
        } else {
            console.log('  Skipped: already JSONB');
        }

        console.log('\nMigration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

migrateArraysToJsonb();
