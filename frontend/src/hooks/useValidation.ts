/**
 * Custom hook for form validation using Zod
 */
import { useState } from 'react';
import { z } from 'zod';
import { formatZodError } from '../schemas/validation';

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Hook for validating form data with Zod schemas
 */
export function useValidation<T extends z.ZodType<any, any>>() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate data against a Zod schema
   */
  const validate = (schema: T, data: unknown): ValidationResult<z.infer<T>> => {
    try {
      const validated = schema.parse(data);
      setErrors({});
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod errors to field-specific error messages
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });
        setErrors(fieldErrors);
        return { success: false, error: formatZodError(error) };
      }
      return { success: false, error: 'Erreur de validation' };
    }
  };

  /**
   * Validate a single field
   */
  const validateField = (schema: T, fieldName: string, value: unknown): boolean => {
    try {
      // Use schema.shape if available (for object schemas)
      if ('shape' in schema && schema.shape) {
        const fieldSchema = (schema.shape as any)[fieldName];
        if (fieldSchema) {
          fieldSchema.parse(value);
          // Clear error for this field
          setErrors((prev) => {
            const next = { ...prev };
            delete next[fieldName];
            return next;
          });
          return true;
        }
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: error.issues[0]?.message || 'Erreur de validation',
        }));
        return false;
      }
      return false;
    }
  };

  /**
   * Clear all validation errors
   */
  const clearErrors = () => {
    setErrors({});
  };

  /**
   * Clear error for a specific field
   */
  const clearFieldError = (fieldName: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  /**
   * Get error message for a specific field
   */
  const getFieldError = (fieldName: string): string | undefined => {
    return errors[fieldName];
  };

  /**
   * Check if there are any validation errors
   */
  const hasErrors = (): boolean => {
    return Object.keys(errors).length > 0;
  };

  return {
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasErrors,
    errors,
  };
}
