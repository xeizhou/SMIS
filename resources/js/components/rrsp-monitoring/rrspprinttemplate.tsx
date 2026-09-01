import React from 'react';

interface RrspItem {
    id: number;
    itemName: string;
    itemDescription: string;
    quantity: number;
    propertyNo: string | null;
    kindOfSemiExpendable: string | null;
    status: string | null;
    area: string | null;
    remarks?: string | null;
}

interface RrspMonitoring {
    id: string;
    rrspNo: string;
    dateReceived: string | null;
    endUserName: string | null;
    returnBy: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    items?: RrspItem[];
}

export default function RrspPrintTemplate({ rrsp }: { rrsp: RrspMonitoring }) {
    const dateReceived = rrsp.dateReceived
        ? new Date(rrsp.dateReceived).toLocaleDateString('en-US', {
              month: 'long',
              day: '2-digit',
              year: 'numeric',
          })
        : '_______________';

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
                    <h1 className="text-xl font-bold uppercase mt-2">Report of Receipt of Semi-Expendable Property</h1>
                    <p className="text-sm">(RRSP)</p>
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
                            <strong>RRSP No.:</strong>{' '}
                            <span className="border-b border-black inline-block w-48 pl-2">{rrsp.rrspNo}</span>
                        </p>
                        <p className="mt-2">
                            <strong>Date:</strong>{' '}
                            <span className="border-b border-black inline-block w-48 pl-2">{dateReceived}</span>
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
                            <th rowSpan={2}>Area</th>
                            <th colSpan={2}>Status</th>
                        </tr>
                        <tr>
                            <th>Serviceable</th>
                            <th>Unserviceable / Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rrsp.items && rrsp.items.length > 0 ? (
                            rrsp.items.map((item, idx) => (
                                <tr key={item.id ?? idx}>
                                    <td className="text-center">{item.itemName ?? 'N/A'}</td>
                                    <td>{item.itemDescription}</td>
                                    <td className="text-center">{item.propertyNo ?? '—'}</td>
                                    <td className="text-center">{item.quantity}</td>
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
                                <td colSpan={7} className="text-center py-4">
                                    No items recorded.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Signatures Section */}
                <div className="mt-12 flex justify-between text-sm">
                    <div className="w-1/2 pr-4">
                        <p className="mb-8 font-semibold">Received From:</p>
                        <div className="text-center">
                            <p className="border-b border-black font-bold pb-1">
                                {rrsp.returnBy ?? '__________________________________'}
                            </p>
                            <p className="text-xs mt-1">Signature over Printed Name</p>
                            <p className="mt-6 border-b border-black w-full pb-1">
                                &nbsp;
                            </p>
                            <p className="text-xs mt-1">Position / Office</p>
                        </div>
                    </div>
                    <div className="w-1/2 pl-4">
                        <p className="mb-8 font-semibold">Received By (End User):</p>
                        <div className="text-center">
                            <p className="border-b border-black font-bold pb-1">
                                {rrsp.endUserName ?? '__________________________________'}
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
