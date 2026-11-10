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

const FULL_PAGE_ROWS = 16; // item rows on a page without signatures
const LAST_PAGE_ROWS = 12; // max (and padded minimum) item rows on the page with signatures
const RECEIVER_NAME = 'ATTY. ROMMIL P. NUÑEZ';

export default function RrspPrintTemplate({ rrsp }: { rrsp: RrspMonitoring }) {
    const dateReceived = rrsp.dateReceived
        ? new Date(rrsp.dateReceived).toLocaleDateString('en-US', {
              month: 'long',
              day: '2-digit',
              year: 'numeric',
          })
        : '';

    const items = rrsp.items ?? [];
    const office = Array.from(new Set(items.map((i) => i.area).filter(Boolean))).join(', ');

    // Split items into pages. The last page stays short so the signatures always fit on it.
    const pages: RrspItem[][] = [];
    let rest = items;
    while (rest.length > LAST_PAGE_ROWS) {
        pages.push(rest.slice(0, FULL_PAGE_ROWS));
        rest = rest.slice(FULL_PAGE_ROWS);
    }
    pages.push(rest);

    const remarksFor = (item: RrspItem) =>
        item.remarks ||
        (item.status === 'UNSERVICEABLE' ? 'Unserviceable' : item.status === 'SERVICEABLE' ? 'Serviceable' : '');

    return (
        <div className="bg-white py-8 text-black print:py-0" style={{ fontFamily: "'Aptos Narrow','Arial Narrow',Arial,sans-serif" }}>
            <style>
                {`
                    @media print {
                        body { background: white; margin: 0; padding: 0; }
                        @page { size: A4; margin: 8mm; }
                    }
                    .rrsp-table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 11pt; }
                    .rrsp-table th, .rrsp-table td { border: 1px solid #000; padding: 1px 4px; text-align: center; height: 18px; word-wrap: break-word; }
                    .rrsp-table tr { break-inside: avoid; page-break-inside: avoid; }
                    .rrsp-table th { font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; }
                    .rrsp-sign { break-inside: avoid; page-break-inside: avoid; }
                `}
            </style>

            {pages.map((pageItems, pageIdx) => {
                const isLast = pageIdx === pages.length - 1;
                const emptyRows = isLast ? Math.max(0, LAST_PAGE_ROWS - pageItems.length) : 0;

                return (
                    <div
                        key={pageIdx}
                        className="mx-auto max-w-[190mm] bg-white print:max-w-none"
                        style={isLast ? undefined : { breakAfter: 'page', pageBreakAfter: 'always' }}
                    >
                        {/* Logo + Header */}
                        <div className="flex h-[72px] items-center justify-center">
                            <img src="/usep-logo.png" alt="USeP Logo" className="h-[66px] w-auto object-contain" />
                        </div>
                        <h2 className="text-center text-[14pt] font-bold" style={{ fontFamily: "Cinzel,'Times New Roman',serif" }}>
                            University of Southeastern Philippines
                        </h2>
                        <p className="text-center text-[12pt] italic" style={{ fontFamily: "'Times New Roman',serif" }}>
                            Supply Management Unit
                        </p>

                        {/* Title */}
                        <div className="mt-2 border border-black py-0.5 text-center text-[16pt] font-bold">
                            RECEIPT OF RETURNED SEMI-EXPENDABLE PROPERTY
                        </div>

                        <div className="mt-1 border-2 border-black">
                            {/* Entity / No. / Office / Date */}
                            <div className="flex border-b border-black text-[11pt]">
                                <div className="w-[63%] border-r border-black px-1 font-bold">
                                    <p>
                                        Entity Name: <span className="italic underline">University of Southeastern Philippines</span>
                                    </p>
                                    <p className="border-t border-black">
                                        Office: <span className="font-normal">{office}</span>
                                    </p>
                                </div>
                                <div className="w-[37%] font-bold">
                                    <p className="border-b border-black px-1">
                                        RRSP No.: <span className="font-normal">{rrsp.rrspNo}</span>
                                    </p>
                                    <p className="px-1">
                                        DATE: <span className="font-normal">{dateReceived}</span>
                                    </p>
                                </div>
                            </div>

                            <p className="border-b border-black py-1 text-center text-[11pt] font-bold">
                                This is to acknowledge receipt of the return Property, Plant, and Equipment
                            </p>

                            {/* Items Table */}
                            <table className="rrsp-table">
                                <colgroup>
                                    <col style={{ width: '35.5%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '21%' }} />
                                    <col style={{ width: '14.5%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={{ borderLeft: 0 }}>Item Description</th>
                                        <th style={{ fontSize: '10pt' }}>Quantity</th>
                                        <th>ICS No.</th>
                                        <th>End-User</th>
                                        <th style={{ borderRight: 0 }}>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.map((item, idx) => (
                                        <tr key={item.id ?? idx}>
                                            <td style={{ borderLeft: 0, textAlign: 'left' }}>
                                                {[item.itemName, item.itemDescription].filter(Boolean).join(' - ')}
                                            </td>
                                            <td>{item.quantity}</td>
                                            <td>{item.propertyNo ?? ''}</td>
                                            <td>{rrsp.endUserName ?? ''}</td>
                                            <td style={{ borderRight: 0, fontSize: '9pt' }}>{remarksFor(item)}</td>
                                        </tr>
                                    ))}
                                    {Array.from({ length: emptyRows }).map((_, i) => (
                                        <tr key={`empty-${i}`}>
                                            <td style={{ borderLeft: 0 }}>&nbsp;</td>
                                            <td />
                                            <td />
                                            <td />
                                            <td style={{ borderRight: 0 }} />
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Signatures: last page only */}
                            {isLast && (
                                <div className="rrsp-sign flex border-t-2 border-black px-2 pt-1 text-[11pt]">
                                    <div className="w-1/2 pr-4">
                                        <p>Returned by:</p>
                                        <div className="mt-4 border-b border-black text-center font-bold">
                                            {rrsp.returnBy ?? <>&nbsp;</>}
                                        </div>
                                        <p className="border-b border-black text-center">End-User</p>
                                        <p className="mt-4 border-b border-black text-center">&nbsp;</p>
                                        <p className="mb-2 text-center">Date</p>
                                    </div>
                                    <div className="w-1/2 pl-4">
                                        <p className="text-center">Received by:</p>
                                        <div className="mt-4 border-b border-black text-center font-bold">{RECEIVER_NAME}</div>
                                        <p className="border-b border-black text-center text-[9pt]">
                                            Head, Property and/ or Supply Division Unit
                                        </p>
                                        <p className="mt-4 border-b border-black text-center">&nbsp;</p>
                                        <p className="mb-2 text-center">Date</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}