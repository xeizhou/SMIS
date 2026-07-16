import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <>
            <Head title="Test Page" />

            <div className="p-6">
                <h1 className="text-2xl font-bold">Test Page for RRSP Monitoring</h1>
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
            title: 'RRSP Monitoring',
            href: '/rrsp-monitoring',
        },
    ],
};