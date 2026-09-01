import React from 'react';

interface RrppeItem {
    id: number;
    itemName: string;
    itemDescription: string;
    quantity: number;
    propertyNo: string;
    cost: number | null;
    status: string | null;
    area: string | null;
    remarks: string | null;
}

interface RRPPEMonitoring {
    id: number;
    rrppeNo: string;
    dateReceived: string;
    endUserName: string | null;
    returnBy: string | null;
    createdAt?: string;
    updatedAt?: string;
    items?: RrppeItem[];
}

export default function RrppePrintTemplate({ rrppe }: { rrppe: RRPPEMonitoring }) {
    const dateReceived = rrppe.dateReceived
        ? new Date(rrppe.dateReceived).toLocaleDateString('en-US', {
              month: 'long',
              day: '2-digit',
              year: 'numeric',
          })
        : '_______________';

    const formatCurrency = (amount: number | string | null | undefined) => {
        if (amount === null || amount === undefined || amount === '') {
            return '—';
        }
        const num = Number(amount);
        if (isNaN(num)) {
            return '—';
        }
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(num);
    };

    return (
        <div className="py-8 bg-white text-black font-sans print:py-0">
            <style>
                {`
                    @media print {
                        body {
                            background: white;
                            margin: 0;
                            padding: 0;
                        }
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                    }
                    .custom-table {
                        border-collapse: collapse;
                        width: 100%;
                    }
                    .custom-table th, .custom-table td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    .custom-table th {
                        text-align: center;
                        font-weight: bold;
                    }
                `}
            </style>
            <div className="max-w-[210mm] mx-auto bg-white p-[20mm] shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <p className="text-sm font-semibold uppercase">Republic of the Philippines</p>
                    <h1 className="text-xl font-bold uppercase mt-2">Report of Returned Property, Plant and Equipment</h1>
                    <p className="text-sm">(RRPPE)</p>
                </div>

                {/* Meta Information */}
                <div className="flex justify-between items-end mb-4 text-sm">
                    <div>
                        <p>
                            <strong>Entity Name:</strong> _________________________
                        </p>
                        <p className="mt-2">
                            <strong>Fund Cluster:</strong> _________________________
                        </p>
                    </div>
                    <div>
                        <p>
                            <strong>RRPPE No.:</strong>{' '}
                            <span className="border-b border-black">{rrppe.rrppeNo}</span>
                        </p>
                        <p className="mt-2">
                            <strong>Date:</strong>{' '}
                            <span className="border-b border-black">{dateReceived}</span>
                        </p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="custom-table mt-4 text-sm">
                    <thead>
                        <tr>
                            <th rowSpan={2}>Item Name</th>
                            <th rowSpan={2}>Description</th>
                            <th rowSpan={2}>Property No.</th>
                            <th rowSpan={2}>Quantity</th>
                            <th rowSpan={2}>Cost</th>
                            <th rowSpan={2}>Area</th>
                            <th colSpan={2}>Status</th>
                        </tr>
                        <tr>
                            <th>Serviceable</th>
                            <th>Unserviceable / Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rrppe.items && rrppe.items.length > 0 ? (
                            rrppe.items.map((item, idx) => (
                                <tr key={item.id ?? idx}>
                                    <td className="text-center">{item.itemName ?? 'N/A'}</td>
                                    <td>{item.itemDescription}</td>
                                    <td className="text-center">{item.propertyNo ?? '—'}</td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-right">{formatCurrency(item.cost)}</td>
                                    <td className="text-center">{item.area ?? '—'}</td>
                                    <td className="text-center">{item.status === 'SERVICEABLE' ? '✔' : ''}</td>
                                    <td className="text-center">
                                        {item.status === 'UNSERVICEABLE' ? (
                                            <>
                                                ✔ <br /> <span className="text-xs italic">{item.remarks}</span>
                                            </>
                                        ) : (
                                            ''
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center py-4">
                                    No items recorded.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Signatures Section */}
                <div className="mt-12 flex justify-between text-sm">
                    <div className="w-1/2 pr-4">
                        <p className="mb-8 font-semibold">Returned By:</p>
                        <div className="text-center">
                            <p className="border-b border-black font-bold pb-1">
                                {rrppe.returnBy ?? '__________________________________'}
                            </p>
                            <p className="text-xs mt-1">Signature over Printed Name</p>
                            <p className="mt-6 border-b border-black w-full pb-1">
                                &nbsp;
                            </p>
                            <p className="text-xs mt-1">Position / Office</p>
                        </div>
                    </div>
                    <div className="w-1/2 pl-4">
                        <p className="mb-8 font-semibold">Received By:</p>
                        <div className="text-center">
                            <p className="border-b border-black font-bold pb-1">
                                {rrppe.endUserName ?? '__________________________________'}
                            </p>
                            <p className="text-xs mt-1">Signature over Printed Name</p>
                            <p className="mt-6 border-b border-black w-full pb-1">
                                &nbsp;
                            </p>
                            <p className="text-xs mt-1">Position / Office</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
