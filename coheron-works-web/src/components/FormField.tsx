import React from 'react';
import './FormField.css';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  helperText,
  children,
  htmlFor,
}) => {
  const className = `form-field${error ? ' has-error' : ''}`;

  return (
    <div className={className}>
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      {children}
      {error && <div className="field-error">{error}</div>}
      {!error && helperText && <div className="field-helper">{helperText}</div>}
    </div>
  );
};

export default FormField;
