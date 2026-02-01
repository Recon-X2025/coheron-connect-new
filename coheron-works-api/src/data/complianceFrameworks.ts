export interface ComplianceControlTemplate {
  control_id: string;
  title: string;
  description: string;
  category: string;
  evidence_required: string;
  risk_level: string;
  review_frequency: string;
}

export const soc2Controls: ComplianceControlTemplate[] = [
  { control_id: 'CC1.1', title: 'Demonstrates commitment to integrity and ethics', description: 'Demonstrates commitment to integrity and ethics', category: 'Control Environment', evidence_required: 'Code of conduct, ethics training records', risk_level: 'high', review_frequency: 'annually' },
  { control_id: 'CC1.2', title: 'Board exercises oversight responsibility', description: 'Board exercises oversight responsibility', category: 'Control Environment', evidence_required: 'Board meeting minutes, independence declarations', risk_level: 'high', review_frequency: 'annually' },
  { control_id: 'CC2.1', title: 'Obtains relevant quality information', description: 'Obtains relevant quality information', category: 'Information and Communication', evidence_required: 'Information quality policies, data governance docs', risk_level: 'medium', review_frequency: 'quarterly' },
  { control_id: 'CC3.1', title: 'Specifies suitable objectives', description: 'Specifies suitable objectives', category: 'Risk Assessment', evidence_required: 'Risk assessment documentation, objective statements', risk_level: 'high', review_frequency: 'annually' },
  { control_id: 'CC3.2', title: 'Identifies and analyzes risks', description: 'Identifies and analyzes risks', category: 'Risk Assessment', evidence_required: 'Risk register, risk analysis reports', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'CC4.1', title: 'Selects and develops monitoring activities', description: 'Selects and develops monitoring activities', category: 'Monitoring', evidence_required: 'Monitoring procedures, evaluation reports', risk_level: 'medium', review_frequency: 'quarterly' },
  { control_id: 'CC5.1', title: 'Selects and develops control activities', description: 'Selects and develops control activities', category: 'Control Activities', evidence_required: 'Control activity documentation, effectiveness tests', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'CC5.2', title: 'Selects and develops general controls over technology', description: 'Selects and develops general controls over technology', category: 'Control Activities', evidence_required: 'IT general controls documentation', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'CC6.1', title: 'Logical and physical access controls', description: 'Logical and physical access controls', category: 'Logical and Physical Access', evidence_required: 'Access control policies, access review logs', risk_level: 'critical', review_frequency: 'quarterly' },
  { control_id: 'CC6.2', title: 'System user registration and authorization', description: 'System user registration and authorization', category: 'Logical and Physical Access', evidence_required: 'User provisioning procedures, authorization records', risk_level: 'critical', review_frequency: 'quarterly' },
  { control_id: 'CC6.3', title: 'System user termination', description: 'System user termination', category: 'Logical and Physical Access', evidence_required: 'Offboarding checklists, access removal logs', risk_level: 'critical', review_frequency: 'quarterly' },
  { control_id: 'CC7.1', title: 'Detection and monitoring of security events', description: 'Detection and monitoring of security events', category: 'System Operations', evidence_required: 'SIEM logs, monitoring dashboards, alert configurations', risk_level: 'critical', review_frequency: 'monthly' },
  { control_id: 'CC7.2', title: 'Incident response procedures', description: 'Incident response procedures', category: 'System Operations', evidence_required: 'Incident response plan, incident logs, post-mortem reports', risk_level: 'critical', review_frequency: 'quarterly' },
  { control_id: 'CC8.1', title: 'Change management processes', description: 'Change management processes', category: 'Change Management', evidence_required: 'Change management policy, change logs, approval records', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'CC9.1', title: 'Risk mitigation through business processes', description: 'Risk mitigation through business processes', category: 'Risk Mitigation', evidence_required: 'BCP/DR plans, business impact analysis, test results', risk_level: 'high', review_frequency: 'annually' },
];

export const iso27001Controls: ComplianceControlTemplate[] = [
  { control_id: 'A.5.1', title: 'Information security policies', description: 'Information security policies', category: 'Organizational Controls', evidence_required: 'Information security policy document, distribution records', risk_level: 'high', review_frequency: 'annually' },
  { control_id: 'A.5.2', title: 'Information security roles and responsibilities', description: 'Information security roles and responsibilities', category: 'Organizational Controls', evidence_required: 'RACI matrix, role descriptions, appointment letters', risk_level: 'high', review_frequency: 'annually' },
  { control_id: 'A.6.1', title: 'Screening', description: 'Screening', category: 'People Controls', evidence_required: 'Background check reports, screening procedures', risk_level: 'medium', review_frequency: 'annually' },
  { control_id: 'A.6.3', title: 'Information security awareness and training', description: 'Information security awareness and training', category: 'People Controls', evidence_required: 'Training records, awareness program materials', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'A.7.1', title: 'Physical security perimeters', description: 'Physical security perimeters', category: 'Physical Controls', evidence_required: 'Physical security assessment, perimeter documentation', risk_level: 'medium', review_frequency: 'annually' },
  { control_id: 'A.8.1', title: 'User endpoint devices', description: 'User endpoint devices', category: 'Technological Controls', evidence_required: 'Endpoint protection policy, MDM configuration', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'A.8.2', title: 'Privileged access rights', description: 'Privileged access rights', category: 'Technological Controls', evidence_required: 'Privileged access register, PAM tool logs', risk_level: 'critical', review_frequency: 'quarterly' },
  { control_id: 'A.8.3', title: 'Information access restriction', description: 'Information access restriction', category: 'Technological Controls', evidence_required: 'Access control matrix, RBAC configuration', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'A.8.5', title: 'Secure authentication', description: 'Secure authentication', category: 'Technological Controls', evidence_required: 'Authentication policy, MFA configuration', risk_level: 'critical', review_frequency: 'quarterly' },
  { control_id: 'A.8.9', title: 'Configuration management', description: 'Configuration management', category: 'Technological Controls', evidence_required: 'Configuration baselines, hardening guides', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'A.8.15', title: 'Logging', description: 'Logging', category: 'Technological Controls', evidence_required: 'Logging policy, log retention configuration', risk_level: 'high', review_frequency: 'monthly' },
  { control_id: 'A.8.16', title: 'Monitoring activities', description: 'Monitoring activities', category: 'Technological Controls', evidence_required: 'Monitoring tool configuration, alert rules', risk_level: 'critical', review_frequency: 'monthly' },
  { control_id: 'A.8.24', title: 'Use of cryptography', description: 'Use of cryptography', category: 'Technological Controls', evidence_required: 'Cryptography policy, encryption standards', risk_level: 'high', review_frequency: 'annually' },
  { control_id: 'A.8.25', title: 'Secure development lifecycle', description: 'Secure development lifecycle', category: 'Technological Controls', evidence_required: 'SDLC policy, secure coding guidelines', risk_level: 'high', review_frequency: 'quarterly' },
  { control_id: 'A.5.23', title: 'Information security for cloud services', description: 'Information security for cloud services', category: 'Organizational Controls', evidence_required: 'Cloud security policy, provider assessments', risk_level: 'high', review_frequency: 'annually' },
];

export const complianceFrameworks: Record<string, ComplianceControlTemplate[]> = {
  soc2: soc2Controls,
  iso27001: iso27001Controls,
};
