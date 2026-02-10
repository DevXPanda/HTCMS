import { Payment, Demand, D2DCRecord, Property } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { Op } from 'sequelize';

async function backfillD2DCRecords() {
    try {
        console.log('Starting D2DC Record backfill...');

        // Find all completed payments for D2DC demands
        const payments = await Payment.findAll({
            where: {
                status: 'completed'
            },
            include: [
                {
                    model: Demand,
                    as: 'demand',
                    where: { serviceType: 'D2DC' }
                },
                {
                    model: Property,
                    as: 'property'
                }
            ]
        });

        console.log(`Found ${payments.length} D2DC payments to check.`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const payment of payments) {
            // Check if D2DCRecord already exists
            const existingRecord = await D2DCRecord.findOne({
                where: {
                    paymentId: payment.id,
                    type: 'PAYMENT_COLLECTION'
                }
            });

            if (existingRecord) {
                skippedCount++;
                continue;
            }

            // Create missing D2DCRecord
            // We need collectorId, if payment.collectedBy is null (e.g. online), we might need a fallback or skip? 
            // D2DC module implies physical collection mostly, but let's check.
            // Schema says collectorId is NOT NULL in D2DCRecord. 
            // Payment.collectedBy is nullable. Payment.receivedBy is also nullable.
            // If collectedBy is null, we might use receivedBy. If both null (unlikely for D2DC but possible), we might default to an admin or skip.

            const collectorId = payment.collectedBy || payment.receivedBy;

            if (!collectorId) {
                console.warn(`Skipping payment ${payment.paymentNumber} (ID: ${payment.id}) - No collector/receiver identified.`);
                continue;
            }

            await D2DCRecord.create({
                type: 'PAYMENT_COLLECTION',
                collectorId: collectorId,
                propertyId: payment.propertyId,
                wardId: payment.property.wardId,
                demandId: payment.demandId,
                paymentId: payment.id,
                amount: payment.amount,
                timestamp: payment.paymentDate || payment.createdAt,
                remarks: `Backfilled from Payment ${payment.paymentNumber}`
            });

            createdCount++;
        }

        console.log(`Backfill complete.`);
        console.log(`Created: ${createdCount}`);
        console.log(`Skipped (Already Existed): ${skippedCount}`);

    } catch (error) {
        console.error('Error during backfill:', error);
    } finally {
        await sequelize.close();
    }
}

// Execute
backfillD2DCRecords();
