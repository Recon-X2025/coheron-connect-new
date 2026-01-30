import { useState, useCallback } from 'react';

type ValidatorFn = (value: unknown) => string | undefined;

export type ValidationRules<T> = {
  [K in keyof T]?: ValidatorFn[];
};

// Built-in validators
export const required = (msg?: string): ValidatorFn => (value) => {
  if (value === undefined || value === null || value === '') {
    return msg || 'This field is required';
  }
  return undefined;
};

export const email = (msg?: string): ValidatorFn => (value) => {
  if (!value) return undefined;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(String(value))) {
    return msg || 'Please enter a valid email address';
  }
  return undefined;
};

export const minLength = (n: number, msg?: string): ValidatorFn => (value) => {
  if (!value) return undefined;
  if (String(value).length < n) {
    return msg || `Must be at least ${n} characters`;
  }
  return undefined;
};

export const maxLength = (n: number, msg?: string): ValidatorFn => (value) => {
  if (!value) return undefined;
  if (String(value).length > n) {
    return msg || `Must be at most ${n} characters`;
  }
  return undefined;
};

export const pattern = (regex: RegExp, msg?: string): ValidatorFn => (value) => {
  if (!value) return undefined;
  if (!regex.test(String(value))) {
    return msg || 'Invalid format';
  }
  return undefined;
};

function validateField(value: unknown, validators?: ValidatorFn[]): string | undefined {
  if (!validators) return undefined;
  for (const v of validators) {
    const err = v(value);
    if (err) return err;
  }
  return undefined;
}

export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  rules: ValidationRules<T>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [allValidated, setAllValidated] = useState(false);

  const handleChange = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setValues((current) => {
      const err = validateField(current[field], rules[field]);
      if (err) {
        setErrors((prev) => ({ ...prev, [field]: err }));
      }
      return current;
    });
  }, [rules]);

  const validate = useCallback((): boolean => {
    setAllValidated(true);
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    const newErrors: Partial<Record<keyof T, string>> = {};
    let valid = true;

    for (const key of Object.keys(rules) as (keyof T)[]) {
      allTouched[key] = true;
      const err = validateField(values[key], rules[key]);
      if (err) {
        newErrors[key] = err;
        valid = false;
      }
    }

    setTouched((prev) => ({ ...prev, ...allTouched }));
    setErrors(newErrors);
    return valid;
  }, [values, rules]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setAllValidated(false);
  }, [initialValues]);

  // Only expose errors for touched fields (or all after validate())
  const visibleErrors: Partial<Record<keyof T, string>> = {};
  for (const key of Object.keys(errors) as (keyof T)[]) {
    if (touched[key] || allValidated) {
      visibleErrors[key] = errors[key];
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors: visibleErrors,
    touched,
    handleChange,
    handleBlur,
    validate,
    isValid,
    resetForm,
  };
}
