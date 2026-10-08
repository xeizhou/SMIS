import { FocusEvent, ChangeEvent, useEffect } from 'react';

type SetErrorFunction = any;
type ClearErrorsFunction = any;

export function useNativeValidation(errors: Record<string, string>, setError: SetErrorFunction, clearErrors: ClearErrorsFunction) {
    useEffect(() => {
        const allInputs = document.querySelectorAll('input, textarea');
        allInputs.forEach((el) => {
            const name = el.getAttribute('name');
            if (name && errors[name]) {
                el.setAttribute('aria-invalid', 'true');
            } else {
                el.removeAttribute('aria-invalid');
            }
        });
    }, [errors]);

    const handleBlur = (e: any) => {
        const target = e.target as any;
        const { name, value, required } = target;
        const pattern = target.pattern || target.getAttribute('data-pattern');
        const title = target.title || target.getAttribute('data-title');
        
        // Skip elements without a name attribute or file inputs (files are handled separately)
        if (!name || target.type === 'file') return;

        let error = '';
        if (target.validity && target.validity.badInput) {
            error = title || 'Invalid characters detected.';
        } else if (required && !value.trim()) {
            const label = document.querySelector(`label[for="${target.id || name}"]`)?.textContent?.replace(' *', '')?.replace('*', '') || 'This field';
            error = `${label} is required.`;
        } else if (value && pattern) {
            const regex = new RegExp(pattern);
            if (!regex.test(value)) {
                error = title || 'Invalid format.';
            }
        }

        if (error) {
            setError(name, error);
        } else {
            clearErrors(name);
        }
    };

    const handleChange = (e: any) => {
        const target = e.target as any;
        const { name, value, required } = target;
        const pattern = target.pattern || target.getAttribute('data-pattern');

        // Only clear the error if it becomes valid, don't show new errors while typing
        if (name && errors[name]) {
            let hasError = false;
            if (target.validity && target.validity.badInput) {
                hasError = true;
            } else if (required && !value.trim()) {
                hasError = true;
            } else if (value && pattern) {
                const regex = new RegExp(pattern);
                if (!regex.test(value)) {
                    hasError = true;
                }
            }
            
            if (!hasError) {
                clearErrors(name);
            }
        }
    };

    return { handleBlur, handleChange };
}
