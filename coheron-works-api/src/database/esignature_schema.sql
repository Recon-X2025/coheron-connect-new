-- ============================================
-- E-SIGNATURE MODULE (DocuSign Equivalent)
-- ============================================

-- E-Signature Documents
CREATE TABLE IF NOT EXISTS esign_documents (
    id SERIAL PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) CHECK (document_type IN ('contract', 'agreement', 'invoice', 'policy', 'nda', 'other')) DEFAULT 'other',
    file_url TEXT, -- URL to the document file (PDF, DOCX, etc.)
    file_path TEXT, -- Server path to the document
    file_size INTEGER, -- File size in bytes
    mime_type VARCHAR(100), -- e.g., 'application/pdf'
    status VARCHAR(20) CHECK (status IN ('draft', 'sent', 'in_progress', 'completed', 'declined', 'cancelled', 'expired')) DEFAULT 'draft',
    related_record_type VARCHAR(50), -- e.g., 'contract', 'invoice', 'employee'
    related_record_id INTEGER, -- ID of the related record
    created_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    message TEXT, -- Optional message to signers
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_frequency INTEGER DEFAULT 3, -- Days between reminders
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- E-Signature Signers (recipients who need to sign)
CREATE TABLE IF NOT EXISTS esign_signers (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES esign_documents(id) ON DELETE CASCADE NOT NULL,
    signer_order INTEGER NOT NULL, -- Order in which signers must sign (1, 2, 3, etc.)
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255) NOT NULL,
    signer_role VARCHAR(100), -- e.g., 'signer', 'witness', 'notary'
    status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'declined', 'expired')) DEFAULT 'pending',
    signed_at TIMESTAMP,
    declined_at TIMESTAMP,
    decline_reason TEXT,
    access_code VARCHAR(20), -- Optional access code for security
    authentication_method VARCHAR(50) CHECK (authentication_method IN ('email', 'sms', 'access_code', 'id_verification')) DEFAULT 'email',
    signature_data TEXT, -- Base64 encoded signature image/data
    signature_type VARCHAR(20) CHECK (signature_type IN ('draw', 'type', 'upload', 'stamp')) DEFAULT 'draw',
    ip_address VARCHAR(45), -- IP address when signed
    user_agent TEXT, -- Browser/user agent info
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- E-Signature Fields (where signatures/initials need to be placed on document)
CREATE TABLE IF NOT EXISTS esign_fields (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES esign_documents(id) ON DELETE CASCADE NOT NULL,
    signer_id INTEGER REFERENCES esign_signers(id) ON DELETE CASCADE,
    field_type VARCHAR(20) CHECK (field_type IN ('signature', 'initial', 'date', 'text', 'checkbox', 'radio')) NOT NULL,
    field_name VARCHAR(100), -- Label for the field
    page_number INTEGER NOT NULL,
    x_position DECIMAL(10, 2) NOT NULL, -- X coordinate on page
    y_position DECIMAL(10, 2) NOT NULL, -- Y coordinate on page
    width DECIMAL(10, 2) DEFAULT 200,
    height DECIMAL(10, 2) DEFAULT 50,
    required BOOLEAN DEFAULT true,
    value TEXT, -- Filled value
    filled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- E-Signature Audit Trail (complete history of all actions)
CREATE TABLE IF NOT EXISTS esign_audit_trail (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES esign_documents(id) ON DELETE CASCADE NOT NULL,
    signer_id INTEGER REFERENCES esign_signers(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- e.g., 'document_created', 'sent', 'viewed', 'signed', 'declined', 'reminder_sent'
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB, -- Additional metadata about the action
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- E-Signature Templates (reusable document templates)
CREATE TABLE IF NOT EXISTS esign_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(50),
    file_url TEXT,
    file_path TEXT,
    default_signers JSONB, -- Default signer configuration
    default_fields JSONB, -- Default field positions
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_esign_documents_status ON esign_documents(status);
CREATE INDEX IF NOT EXISTS idx_esign_documents_related_record ON esign_documents(related_record_type, related_record_id);
CREATE INDEX IF NOT EXISTS idx_esign_documents_created_by ON esign_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_esign_signers_document_id ON esign_signers(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_signers_status ON esign_signers(status);
CREATE INDEX IF NOT EXISTS idx_esign_signers_email ON esign_signers(signer_email);
CREATE INDEX IF NOT EXISTS idx_esign_fields_document_id ON esign_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_fields_signer_id ON esign_fields(signer_id);
CREATE INDEX IF NOT EXISTS idx_esign_audit_trail_document_id ON esign_audit_trail(document_id);
CREATE INDEX IF NOT EXISTS idx_esign_audit_trail_signer_id ON esign_audit_trail(signer_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_esign_documents_updated_at ON esign_documents;
CREATE TRIGGER update_esign_documents_updated_at BEFORE UPDATE ON esign_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_esign_signers_updated_at ON esign_signers;
CREATE TRIGGER update_esign_signers_updated_at BEFORE UPDATE ON esign_signers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_esign_fields_updated_at ON esign_fields;
CREATE TRIGGER update_esign_fields_updated_at BEFORE UPDATE ON esign_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_esign_templates_updated_at ON esign_templates;
CREATE TRIGGER update_esign_templates_updated_at BEFORE UPDATE ON esign_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

