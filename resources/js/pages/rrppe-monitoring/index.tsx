// resources/js/pages/rrppe-monitoring/index.tsx

import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <>
            <Head title="RRPPE Monitoring" />

            <div className="p-6">
                <h1 className="text-2xl font-bold">Test Page for RRPPE Monitoring</h1>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Property',
            href: '#',
        },
        {
            title: 'RRPPE Monitoring',
            href: '/rrppe-monitoring',
        },
    ],
};