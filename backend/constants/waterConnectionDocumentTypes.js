/**
 * Water Connection Document Types
 * Defines the types of documents that can be uploaded for water connections
 */

// All available document types
export const WATER_CONNECTION_DOCUMENT_TYPES = {
  APPLICATION_FORM: 'APPLICATION_FORM',
  ID_PROOF: 'ID_PROOF',
  ADDRESS_PROOF: 'ADDRESS_PROOF',
  PROPERTY_DEED: 'PROPERTY_DEED',
  METER_INSTALLATION_CERTIFICATE: 'METER_INSTALLATION_CERTIFICATE',
  CONNECTION_AGREEMENT: 'CONNECTION_AGREEMENT',
  NOC: 'NOC', // No Objection Certificate
  OTHER: 'OTHER'
};

// Mandatory document types (required for connection approval)
export const MANDATORY_DOCUMENT_TYPES = [
  WATER_CONNECTION_DOCUMENT_TYPES.APPLICATION_FORM,
  WATER_CONNECTION_DOCUMENT_TYPES.ID_PROOF,
  WATER_CONNECTION_DOCUMENT_TYPES.ADDRESS_PROOF
];

// Document type labels for display
export const DOCUMENT_TYPE_LABELS = {
  [WATER_CONNECTION_DOCUMENT_TYPES.APPLICATION_FORM]: 'Application Form',
  [WATER_CONNECTION_DOCUMENT_TYPES.ID_PROOF]: 'ID Proof',
  [WATER_CONNECTION_DOCUMENT_TYPES.ADDRESS_PROOF]: 'Address Proof',
  [WATER_CONNECTION_DOCUMENT_TYPES.PROPERTY_DEED]: 'Property Deed',
  [WATER_CONNECTION_DOCUMENT_TYPES.METER_INSTALLATION_CERTIFICATE]: 'Meter Installation Certificate',
  [WATER_CONNECTION_DOCUMENT_TYPES.CONNECTION_AGREEMENT]: 'Connection Agreement',
  [WATER_CONNECTION_DOCUMENT_TYPES.NOC]: 'No Objection Certificate (NOC)',
  [WATER_CONNECTION_DOCUMENT_TYPES.OTHER]: 'Other'
};

/**
 * Check if all mandatory documents are uploaded
 * @param {Array} uploadedDocuments - Array of uploaded document objects
 * @returns {Object} - { isValid: boolean, missing: Array<string> }
 */
export function validateMandatoryDocuments(uploadedDocuments) {
  const uploadedTypes = uploadedDocuments.map(doc => doc.documentType);
  const missing = MANDATORY_DOCUMENT_TYPES.filter(type => !uploadedTypes.includes(type));
  
  return {
    isValid: missing.length === 0,
    missing: missing.map(type => DOCUMENT_TYPE_LABELS[type])
  };
}
