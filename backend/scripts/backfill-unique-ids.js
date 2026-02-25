/**
 * One-time backfill: assign structured unique IDs to existing properties,
 * water connections, and shops; seed ward_sequences for future generation.
 * Run after applying migration 20250223000001_ward_sequences.sql
 *
 * Usage: node backend/scripts/backfill-unique-ids.js
 * Or from repo root: node --experimental-vm-modules backend/scripts/backfill-unique-ids.js
 */

import { sequelize } from '../config/database.js';
import { Property, WaterConnection, Shop, WardSequence } from '../models/index.js';

const PROPERTY_TYPE_CODE = {
  residential: 'PR',
  commercial: 'PC',
  industrial: 'PI',
  agricultural: 'PA',
  mixed: 'PC'
};

function pad3(n) {
  return String(n).padStart(3, '0');
}
function pad4(n) {
  return String(n).padStart(4, '0');
}

async function backfillProperties() {
  const properties = await Property.findAll({ order: [['id', 'ASC']], attributes: ['id', 'wardId', 'propertyType', 'propertyNumber'] });
  if (properties.length === 0) return { updated: 0, seeded: 0 };

  const byKey = {};
  for (const p of properties) {
    const typeCode = PROPERTY_TYPE_CODE[p.propertyType] || 'PC';
    const key = `${p.wardId}-${typeCode}`;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(p);
  }

  const toUpdate = [];
  const seedRows = [];

  for (const key of Object.keys(byKey)) {
    const parts = key.split('-');
    const wardId = parseInt(parts[0], 10);
    const typeCode = parts[1] || 'PC';
    const list = byKey[key];
    const moduleKey = `PROPERTY_${typeCode}`;
    const ward3 = pad3(wardId);
    let maxSerial = 0;
    list.forEach((p, idx) => {
      const serial = idx + 1;
      maxSerial = serial;
      const newNumber = `${typeCode}${ward3}${pad4(serial)}`;
      toUpdate.push({ id: p.id, propertyNumber: newNumber });
    });
    seedRows.push({ moduleKey, wardId, lastSequence: maxSerial });
  }

  for (const { id, propertyNumber } of toUpdate) {
    await Property.update({ propertyNumber }, { where: { id } });
  }

  for (const row of seedRows) {
    const [moduleKey, wardId] = [row.moduleKey, row.wardId];
    const existing = await WardSequence.findOne({ where: { moduleKey, wardId } });
    if (existing) {
      const next = Math.max((existing.lastSequence || 0), row.lastSequence);
      await existing.update({ lastSequence: next });
    } else {
      await WardSequence.create({ moduleKey, wardId, lastSequence: row.lastSequence });
    }
  }

  return { updated: toUpdate.length, seeded: seedRows.length };
}

async function backfillWaterConnections() {
  const connections = await WaterConnection.findAll({
    include: [{ model: Property, as: 'property', attributes: ['wardId'] }],
    order: [['id', 'ASC']]
  });
  if (connections.length === 0) return { updated: 0, seeded: 0 };

  const byWard = {};
  for (const c of connections) {
    const wardId = c.property?.wardId;
    if (wardId == null) continue;
    if (!byWard[wardId]) byWard[wardId] = [];
    byWard[wardId].push(c);
  }
  for (const k of Object.keys(byWard)) {
    byWard[k].sort((a, b) => a.id - b.id);
  }

  const toUpdate = [];
  const seedRows = [];

  for (const wardId of Object.keys(byWard).map(Number)) {
    const list = byWard[wardId];
    const ward3 = pad3(wardId);
    list.forEach((c, idx) => {
      const serial = idx + 1;
      toUpdate.push({ id: c.id, connectionNumber: `WT${ward3}${pad4(serial)}` });
    });
    seedRows.push({ moduleKey: 'WATER', wardId, lastSequence: list.length });
  }

  for (const { id, connectionNumber } of toUpdate) {
    await WaterConnection.update({ connectionNumber }, { where: { id } });
  }

  for (const row of seedRows) {
    const existing = await WardSequence.findOne({ where: { moduleKey: row.moduleKey, wardId: row.wardId } });
    if (existing) {
      await existing.update({ lastSequence: Math.max((existing.lastSequence || 0), row.lastSequence) });
    } else {
      await WardSequence.create({ moduleKey: row.moduleKey, wardId: row.wardId, lastSequence: row.lastSequence });
    }
  }

  return { updated: toUpdate.length, seeded: seedRows.length };
}

async function backfillShops() {
  const shops = await Shop.findAll({ order: [['id', 'ASC']], attributes: ['id', 'wardId', 'shopNumber'] });
  if (shops.length === 0) return { updated: 0, seeded: 0 };

  const byWard = {};
  for (const s of shops) {
    if (!byWard[s.wardId]) byWard[s.wardId] = [];
    byWard[s.wardId].push(s);
  }

  const toUpdate = [];
  const seedRows = [];

  for (const wardId of Object.keys(byWard).map(Number)) {
    const list = byWard[wardId];
    const ward3 = pad3(wardId);
    list.forEach((s, idx) => {
      const serial = idx + 1;
      toUpdate.push({ id: s.id, shopNumber: `ST${ward3}${pad4(serial)}` });
    });
    seedRows.push({ moduleKey: 'SHOP', wardId, lastSequence: list.length });
  }

  for (const { id, shopNumber } of toUpdate) {
    await Shop.update({ shopNumber }, { where: { id } });
  }

  for (const row of seedRows) {
    const existing = await WardSequence.findOne({ where: { moduleKey: row.moduleKey, wardId: row.wardId } });
    if (existing) {
      await existing.update({ lastSequence: Math.max((existing.lastSequence || 0), row.lastSequence) });
    } else {
      await WardSequence.create({ moduleKey: row.moduleKey, wardId: row.wardId, lastSequence: row.lastSequence });
    }
  }

  return { updated: toUpdate.length, seeded: seedRows.length };
}

async function main() {
  try {
    await sequelize.authenticate();


    const propResult = await backfillProperties();


    const waterResult = await backfillWaterConnections();


    const shopResult = await backfillShops();



  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
