import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <>
            <Head title="Test Page" />

            <div className="p-6">
                <h1 className="text-2xl font-bold">Test Page for PO Letter Monitoring</h1>
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
            title: 'PO Letter Monitoring',
            href: '/po-letter-monitoring',
        },
    ],
};