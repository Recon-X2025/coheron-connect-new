export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
}

interface FieldClassification {
  entity: string;
  field: string;
  classification: DataClassification;
}

const classificationRegistry: FieldClassification[] = [
  // User PII
  { entity: 'User', field: 'email', classification: DataClassification.CONFIDENTIAL },
  { entity: 'User', field: 'password_hash', classification: DataClassification.RESTRICTED },
  { entity: 'User', field: 'two_factor_secret', classification: DataClassification.RESTRICTED },
  { entity: 'User', field: 'password_history', classification: DataClassification.RESTRICTED },

  // Employee PII
  { entity: 'Employee', field: 'email', classification: DataClassification.CONFIDENTIAL },
  { entity: 'Employee', field: 'phone', classification: DataClassification.CONFIDENTIAL },
  { entity: 'Employee', field: 'address', classification: DataClassification.CONFIDENTIAL },
  { entity: 'Employee', field: 'bank_details', classification: DataClassification.RESTRICTED },
  { entity: 'Employee', field: 'salary', classification: DataClassification.RESTRICTED },
  { entity: 'Employee', field: 'pan_number', classification: DataClassification.RESTRICTED },
  { entity: 'Employee', field: 'aadhaar_number', classification: DataClassification.RESTRICTED },

  // Financial
  { entity: 'Invoice', field: 'total_amount', classification: DataClassification.CONFIDENTIAL },
  { entity: 'JournalEntry', field: 'amount', classification: DataClassification.CONFIDENTIAL },
  { entity: 'Payroll', field: 'net_salary', classification: DataClassification.RESTRICTED },
  { entity: 'Payroll', field: 'gross_salary', classification: DataClassification.RESTRICTED },

  // Partner/Customer PII
  { entity: 'Partner', field: 'email', classification: DataClassification.CONFIDENTIAL },
  { entity: 'Partner', field: 'phone', classification: DataClassification.CONFIDENTIAL },
  { entity: 'Partner', field: 'tax_id', classification: DataClassification.RESTRICTED },
  { entity: 'Partner', field: 'gstin', classification: DataClassification.RESTRICTED },
];

export function getFieldClassification(entity: string, field: string): DataClassification {
  const entry = classificationRegistry.find(c => c.entity === entity && c.field === field);
  return entry?.classification ?? DataClassification.INTERNAL;
}

export function getRestrictedFields(entity: string): string[] {
  return classificationRegistry
    .filter(c => c.entity === entity && (c.classification === DataClassification.RESTRICTED || c.classification === DataClassification.CONFIDENTIAL))
    .map(c => c.field);
}

export function isFieldSensitive(entity: string, field: string): boolean {
  const classification = getFieldClassification(entity, field);
  return classification === DataClassification.CONFIDENTIAL || classification === DataClassification.RESTRICTED;
}
