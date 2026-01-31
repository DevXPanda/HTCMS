-- Migration: Create water_connection_documents table
-- This table stores documents uploaded for water connections

-- Create water_connection_documents table
CREATE TABLE IF NOT EXISTS water_connection_documents (
  id SERIAL PRIMARY KEY,
  "waterConnectionId" INTEGER NOT NULL,
  "documentType" VARCHAR(50) NOT NULL,
  "documentName" VARCHAR(255) NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "filePath" VARCHAR(500) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "uploadedBy" INTEGER,
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT fk_water_connection_document_connection 
    FOREIGN KEY ("waterConnectionId") 
    REFERENCES water_connections(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_water_connection_document_uploader 
    FOREIGN KEY ("uploadedBy") 
    REFERENCES users(id) 
    ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_water_connection_documents_connection ON water_connection_documents("waterConnectionId");
CREATE INDEX IF NOT EXISTS idx_water_connection_documents_type ON water_connection_documents("documentType");
CREATE INDEX IF NOT EXISTS idx_water_connection_documents_uploaded_by ON water_connection_documents("uploadedBy");

-- Add comments
COMMENT ON TABLE water_connection_documents IS 'Documents uploaded for water connections';
COMMENT ON COLUMN water_connection_documents."waterConnectionId" IS 'Foreign key to water_connections table';
COMMENT ON COLUMN water_connection_documents."documentType" IS 'Type of document (e.g., APPLICATION_FORM, ID_PROOF, ADDRESS_PROOF, METER_INSTALLATION, etc.)';
COMMENT ON COLUMN water_connection_documents."documentName" IS 'Display name of the document';
COMMENT ON COLUMN water_connection_documents."fileName" IS 'Stored filename on server';
COMMENT ON COLUMN water_connection_documents."filePath" IS 'Full path to the file';
COMMENT ON COLUMN water_connection_documents."fileSize" IS 'File size in bytes';
COMMENT ON COLUMN water_connection_documents."mimeType" IS 'MIME type of the file';
COMMENT ON COLUMN water_connection_documents."uploadedBy" IS 'User who uploaded the document';
