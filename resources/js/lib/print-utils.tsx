import { createRoot } from 'react-dom/client';
import React from 'react';

export const printComponent = (component: React.ReactNode) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
        document.body.removeChild(iframe);
        return;
    }

    // Initialize document
    iframeDoc.open();
    iframeDoc.write('<!DOCTYPE html><html><head></head><body><div id="print-root"></div></body></html>');
    iframeDoc.close();

    // Copy all style sheets and style tags from the parent window
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach((style) => {
        iframeDoc.head.appendChild(style.cloneNode(true));
    });

    const printContainer = iframeDoc.getElementById('print-root');
    if (!printContainer) return;

    const root = createRoot(printContainer);
    root.render(component);

    // Wait a bit for styles to be applied and component to be fully rendered
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Cleanup after print dialog is closed
        setTimeout(() => {
            root.unmount();
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 1000);
    }, 500);
};
