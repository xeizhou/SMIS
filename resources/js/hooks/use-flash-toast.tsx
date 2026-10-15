import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

interface FlashProps {
    success?: string;
    error?: string;
    deleteError?: string;
    warning?: string;
    info?: string;
    status?: string;
    message?: string;
    toast?: FlashToast;
    uuid?: string;
    [key: string]: any;
}

/**
 * Sanitizes technical error messages to ensure database credentials, SQL queries,
 * or raw stack traces are never exposed to end-users.
 */
function sanitizeErrorMessage(msg: string): {
    title: string;
    description?: string;
} {
    const lower = msg.toLowerCase();

    if (
        lower.includes('sqlstate') ||
        lower.includes('foreign key constraint') ||
        lower.includes('integrity constraint')
    ) {
        return {
            title: 'Database Restriction',
            description:
                'This record cannot be modified or deleted because it is linked to other records in the system.',
        };
    }

    if (
        lower.includes('duplicate entry') ||
        lower.includes('unique constraint')
    ) {
        return {
            title: 'Duplicate Record',
            description:
                'A record with this information already exists. Duplicate entries are not allowed.',
        };
    }

    if (
        lower.includes('stack trace') ||
        lower.includes('call to undefined') ||
        lower.includes('syntax error') ||
        lower.includes('pdoexception') ||
        lower.includes('fatal error')
    ) {
        return {
            title: 'Action Failed',
            description:
                'An unexpected system error occurred while processing your request. Please try again.',
        };
    }

    return { title: msg };
}

/**
 * Dispatches a formatted toast alert through Sonner, properly converting
 * bullet points, multi-line explanations, and import summaries into clean UI.
 */
function displayAlert(
    type: 'success' | 'error' | 'warning' | 'info',
    rawMessage: string,
) {
    if (!rawMessage || typeof rawMessage !== 'string') return;

    // Check for technical error leak in error messages
    if (type === 'error') {
        const sanitized = sanitizeErrorMessage(rawMessage);
        if (sanitized.description) {
            toast.error(sanitized.title, {
                description: sanitized.description,
                duration: 6000,
            });
            return;
        }
    }

    // Handle import summary format delimited with '|||'
    if (rawMessage.includes('|||')) {
        const parts = rawMessage
            .split('|||')
            .map((s) => s.trim())
            .filter(Boolean);
        const main = parts[0] || 'Import Completed';
        const details = parts.slice(1);

        if (details.length > 0) {
            toast.warning(main, {
                description: (
                    <div className="mt-1 space-y-1 text-xs">
                        <p className="font-semibold text-foreground/80">
                            Details:
                        </p>
                        <ul className="max-h-36 list-disc space-y-0.5 overflow-y-auto pl-4">
                            {details.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ),
                duration: 8000,
            });
            return;
        }

        toast[type](main, {
            id: `alert-${type}-${main.slice(0, 40)}`,
            duration: 5000,
        });
        return;
    }

    // Handle multi-line messages with bullet lists (e.g. linked record restrictions)
    if (rawMessage.includes('\n')) {
        const lines = rawMessage
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
        const title = lines[0] || rawMessage;
        const bulletLines = lines.slice(1);

        if (bulletLines.length > 0) {
            toast[type](title, {
                id: `alert-${type}-${title.slice(0, 40)}`,
                description: (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
                        {bulletLines.map((line, idx) => {
                            // Strip leading markdown asterisks, dashes, or numbered lists
                            const cleanLine = line.replace(
                                /^[\*\-\•\d+\.]\s*/,
                                '',
                            );
                            return <li key={idx}>{cleanLine}</li>;
                        })}
                    </ul>
                ),
                duration: 7000,
            });
            return;
        }
    }

    // Standard single-line message
    toast[type](rawMessage, {
        id: `alert-${type}-${rawMessage.slice(0, 40)}`,
        duration: 5000,
    });
}

/**
 * Formats a validation error message into clean human-readable text,
 * transforming nested keys like items.0.itemName into 'Item #1: Item Name is required.'
 */
function formatValidationErrorMessage(field: string, text: string): string {
    const arrayMatch = field.match(/^([a-zA-Z0-9_-]+)\.(\d+)\.([a-zA-Z0-9_-]+)$/);
    if (arrayMatch) {
        const itemIndex = parseInt(arrayMatch[2], 10) + 1;
        const subfield = arrayMatch[3]
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .trim();
        const formattedSubfield = subfield.charAt(0).toUpperCase() + subfield.slice(1);

        if (text.toLowerCase().includes('is required') || text.toLowerCase().includes('required.')) {
            return `Item #${itemIndex}: ${formattedSubfield} is required.`;
        }
        return `Item #${itemIndex} (${formattedSubfield}): ${text}`;
    }

    return text;
}

/**
 * Handles multiple Laravel validation errors by converting them into
 * a formatted, readable list in a Sonner toast alert.
 */
function displayValidationErrors(errors: Record<string, any>) {
    if (!errors || typeof errors !== 'object') return;

    const seenMessages = new Set<string>();
    const uniqueMessages: string[] = [];

    for (const [field, msg] of Object.entries(errors)) {
        const text = Array.isArray(msg)
            ? msg[0]
            : typeof msg === 'string'
              ? msg
              : String(msg);
        if (!text) continue;
        const formatted = formatValidationErrorMessage(field, text);
        if (!seenMessages.has(formatted)) {
            seenMessages.add(formatted);
            uniqueMessages.push(formatted);
        }
    }

    if (uniqueMessages.length === 0) return;

    if (uniqueMessages.length === 1) {
        displayAlert('error', uniqueMessages[0]);
        return;
    }

    toast.error('Validation Error', {
        id: 'validation-error-toast',
        description: (
            <div className="mt-1 space-y-1 text-xs">
                <p className="font-semibold text-foreground/80">
                    Please correct the following fields:
                </p>
                <ul className="max-h-40 list-disc space-y-0.5 overflow-y-auto pl-4">
                    {uniqueMessages.map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                    ))}
                </ul>
            </div>
        ),
        duration: 7000,
    });
}

/**
 * Process a flash object from Inertia props and trigger appropriate Sonner toasts.
 */
function processFlashProps(
    flash: FlashProps | undefined,
    processedUuids: Set<string>,
) {
    if (!flash) return;

    const uuid = flash.uuid || JSON.stringify(flash);
    if (processedUuids.has(uuid)) return;
    processedUuids.add(uuid);

    // 1. Explicit toast object
    if (flash.toast && flash.toast.type && flash.toast.message) {
        displayAlert(flash.toast.type, flash.toast.message);
        return;
    }

    // 2. Error and deleteError
    const errorMessage = flash.error || flash.deleteError;
    if (errorMessage) {
        displayAlert('error', errorMessage);
        return;
    }

    // 3. Warning
    if (flash.warning) {
        displayAlert('warning', flash.warning);
        return;
    }

    // 4. Success
    if (flash.success) {
        displayAlert('success', flash.success);
        return;
    }

    // 5. Info / Status / General message
    const infoMessage = flash.message || flash.status || flash.info;
    if (infoMessage) {
        displayAlert('info', infoMessage);
        return;
    }
}

/**
 * Central hook for handling flash toasts and validation alerts via Sonner.
 */
export function useFlashToast(): void {
    const processedUuids = useRef<Set<string>>(new Set());

    useEffect(() => {
        // 1. Check initial page load payload embedded in the root element
        try {
            const rootEl = document.getElementById('app');
            const raw = rootEl?.getAttribute('data-page');
            if (raw) {
                const parsed = JSON.parse(raw);
                processFlashProps(parsed?.props?.flash, processedUuids.current);
            }
        } catch {
            // Ignore parse failures
        }

        // 2. Listen to router 'success' events (fired on every successful Inertia visit)
        const unregisterSuccess = router.on('success', (event) => {
            const page = (event as any).detail?.page;
            processFlashProps(page?.props?.flash, processedUuids.current);
        });

        // 3. Listen to router 'flash' events (legacy or custom flash payloads)
        const unregisterFlash = router.on('flash', (event) => {
            const flash = (event as any).detail?.flash;
            processFlashProps(flash, processedUuids.current);
        });

        // 4. Listen to router 'error' events (fired on HTTP 422 validation failures)
        const unregisterError = router.on('error', (event) => {
            const errors = (event as any).detail?.errors;
            displayValidationErrors(errors);
        });

        return () => {
            unregisterSuccess();
            unregisterFlash();
            unregisterError();
        };
    }, []);
}
