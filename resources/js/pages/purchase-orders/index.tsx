import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <>
            <Head title="Test Page" />

            <div className="p-6">
                <h1 className="text-2xl font-bold">Test Page for Purchase Order Monitoring</h1>
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
            title: 'Purchase Order Monitoring',
            href: '/purchase-orders',
        },
    ],
};