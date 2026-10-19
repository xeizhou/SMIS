<?php

use App\Models\ServePo;
use App\Services\PurchaseOrderImportService;
use Illuminate\Http\UploadedFile;

function purchaseOrderCsvUpload(string $filename, array $rows): UploadedFile
{
    $stream = fopen('php://temp', 'r+');
    foreach ($rows as $row) {
        fputcsv($stream, $row);
    }
    rewind($stream);
    $contents = stream_get_contents($stream);
    fclose($stream);

    return UploadedFile::fake()->createWithContent($filename, $contents);
}

it('imports purchase orders from the 2025 Served PO layout', function () {
    $headers = [
        'P O. NO.', 'PO DATE', 'PO. RECEIVED DATE', 'INCLUSIVE DATE', 'DELIVERY TERM', 'DUE DATE',
        'TYPE OF DELIVERY', 'TYPE OF DELIVERY', '', 'PR#', 'PR DATE', 'PHILGEPS REFERENCE NO.',
        'MODE OF PROCUREMENT', 'TOTAL AMOUNT OF ABC', 'TOTAL AMOUNT OF P.O.',
        'TOTAL AMOUNT DIFFERENCE OF ABC-P.O.', 'FUND CLUSTER', 'ORS/BURS NO', 'ORS/BURS DATE',
        'RESPONSIBILITY CENTER', 'UACS OBJECTS CODE/ EXPENDITURES', 'SUPPLIER',
        'END USER (COLLEGES/DEPT./UNITS)', 'DATE FORWARDED TO SMU', 'COA PROCESSED DATE',
        'SCANNED COPY OF PO WITH COA STAMP', 'DATE FORWARDED TO SMU FRONT DESK', '', '',
    ];
    $continuationHeaders = array_fill(0, count($headers), '');
    $continuationHeaders[7] = 'COMPLETE';
    $continuationHeaders[8] = 'PARTIAL';

    $data = array_fill(0, count($headers), '');
    foreach ([
        0 => '2025-01-0001',
        1 => '1/8/2025',
        2 => '1/8/2025',
        3 => 'JAN 8-9',
        4 => '25',
        6 => 'SERVICES',
        7 => 'TRUE',
        8 => 'FALSE',
        9 => '2025-01-0002',
        10 => '1/6/2025',
        12 => 'SMALL VALUE PROCUREMENT',
        13 => '30000.00',
        14 => '28704.00',
        15 => '1296.00',
        16 => '01-RAF',
        17 => '02-101101-2025-01-0002',
        18 => '1/7/2025',
        19 => '101 PMMED',
        20 => '50299030',
        21 => 'KAIROS KITCHEN',
        22 => 'PMMED',
        23 => '1/8/2025',
        24 => '1/8/2025',
        26 => '1/9/2025',
    ] as $index => $value) {
        $data[$index] = $value;
    }

    $preamble = array_fill(0, count($headers), '');
    $preamble[1] = 'SERVE PO';

    $file = purchaseOrderCsvUpload('served-po.csv', [
        $preamble,
        $preamble,
        $preamble,
        $preamble,
        $headers,
        $continuationHeaders,
        $data,
    ]);

    $result = app(PurchaseOrderImportService::class)->importFile($file);

    expect($result['created'])->toBe(1);

    $po = ServePo::findOrFail('2025-01-0001');
    expect($po->po_date->format('Y-m-d'))->toBe('2025-01-08')
        ->and($po->po_received_date->format('Y-m-d'))->toBe('2025-01-08')
        ->and($po->inclusive_date)->toBe('JAN 8-9')
        ->and($po->procurement_type)->toBe('Services')
        ->and($po->mode_of_procurement)->toBe('SMALL VALUE PROCUREMENT')
        ->and((float) $po->total_amount_abc)->toBe(30000.0)
        ->and((float) $po->total_amount_po)->toBe(28704.0)
        ->and($po->pr_number)->toBe('2025-01-0002')
        ->and($po->ors_burs_no)->toBe('02-101101-2025-01-0002')
        ->and($po->uacs_object_code)->toBe('50299030')
        ->and($po->supplier->supplier_name)->toBe('KAIROS KITCHEN')
        ->and($po->end_user)->toBe('PMMED')
        ->and($po->date_forwarded_to_smu->format('Y-m-d'))->toBe('2025-01-08')
        ->and($po->date_forwarded_frontdesk->format('Y-m-d'))->toBe('2025-01-09');
});

it('imports purchase orders from the 2026 PIR Monitoring layout with repeated column labels', function () {
    $headers = [
        'SUPPLIER', 'P.O. NO.', 'UNIT/OFFICE', 'P.O. DATE', 'DELIVERY TERM', 'FUND CLUSTER',
        'P.R. NO.', 'P.R. DATE', 'ORS/BUR NO.', 'ORS/BUR DATE', 'PO AMOUNT', 'ITEM DESCRIPTION',
        'OPERATINAL IMPACT', 'DATE FORWARDED', 'FORWARDED BY',
        'NOTIFY THE END-USER (VIA EMAIL)', 'DATE NOIFIED THE END-USER', 'DATE CLAIMED', 'CLAIMED BY',
        'DATE RECEIVED BY SUPPPLIER', 'DATE FORWARDED', 'FORWARDED BY', 'DATE RETURNED FROM COA',
        'COA DATE', 'CLAIM DATE', 'CLAIMED BY', 'NOTIFY THE END-USER (VIA EMAIL)',
        'DATE NOTIFIED THE END-USER', 'INVOICE NO.', 'INVOICE DATE', 'DELIVERY RECIEPT',
        'DATE COMPLETED', 'ICS NO.', 'RIS NO.', 'INSPECTED BY', 'INSPECTION DATE',
        'NOTIFY TO CLAIM THE RECEIPT', 'NOTIFY THE END-USER (VIA EMAIL)',
        'RECEIPT RECEIVING DATE', 'CLAIMED BY', 'ITEM/S RECEIVING DATE', 'CLAIMED BY',
        'IAR NO.', 'DATE FORWARDED TO FINANCE', 'STATUS', 'LINK (COMPLETE DOCUMENTS)', 'REMARKS',
    ];
    $groupHeaders = array_fill(0, count($headers), '');
    $groupHeaders[3] = 'FROM OVPAD';
    $groupHeaders[19] = "SUPPLIER'S SIGNATURE";
    $groupHeaders[20] = 'FOR COA';

    $data = array_fill(0, count($headers), '');
    foreach ([
        0 => 'Vendor One',
        1 => '2026-01-0001',
        2 => 'SSU',
        3 => '1/15/2026',
        4 => '30',
        5 => '01-RAF',
        6 => '2026-01-0002',
        7 => '1/10/2026',
        8 => '06-101101-2026-01-0001',
        9 => '1/16/2026',
        10 => '₱1,200.00',
        12 => 'HIGH',
        13 => '1/18/2026',
        14 => 'Forwarded By One',
        15 => 'vpad@example.test',
        16 => '1/20/2026',
        19 => '1/21/2026',
        20 => '1/22/2026',
        21 => 'Forwarded By Two',
        22 => '1/23/2026',
        23 => '1/24/2026',
        24 => '1/25/2026',
        25 => 'Claimed By COA',
        26 => 'coa@example.test',
        27 => '1/26/2026',
        28 => 'INV-1',
        29 => '1/27/2026',
        30 => 'DR-1',
        31 => '1/28/2026',
        32 => 'ICS-1',
        33 => 'RIS-1',
        34 => 'Inspector One',
        35 => '1/29/2026',
        36 => '1/30/2026',
        37 => 'release@example.test',
        38 => '1/31/2026',
        39 => 'Receipt Claimer',
        40 => '2/1/2026',
        41 => 'Items Claimer',
        42 => 'IAR-1',
        43 => '2/2/2026',
        44 => 'COMPLETED',
        46 => 'Imported from PIR sheet',
    ] as $index => $value) {
        $data[$index] = $value;
    }

    $file = purchaseOrderCsvUpload('pir-monitoring.csv', [$groupHeaders, $headers, $data]);

    $result = app(PurchaseOrderImportService::class)->importFile($file);

    expect($result['created'])->toBe(1);

    $po = ServePo::findOrFail('2026-01-0001');
    expect($po->po_date->format('Y-m-d'))->toBe('2026-01-15')
        ->and($po->total_amount_po)->toBe('1200.00')
        ->and($po->pr_number)->toBe('2026-01-0002')
        ->and($po->ors_burs_no)->toBe('06-101101-2026-01-0001')
        ->and($po->operational_impact)->toBe('HIGH')
        ->and($po->date_forwarded_to_end_user->format('Y-m-d'))->toBe('2026-01-18')
        ->and($po->end_user_forwarded_by)->toBe('Forwarded By One')
        ->and($po->po_vpad_notified_via)->toBe('vpad@example.test')
        ->and($po->po_vpad_notified_date->format('Y-m-d'))->toBe('2026-01-20')
        ->and($po->date_received_by_supplier->format('Y-m-d'))->toBe('2026-01-21')
        ->and($po->date_forwarded_coa->format('Y-m-d'))->toBe('2026-01-22')
        ->and($po->forwarded_by_coa)->toBe('Forwarded By Two')
        ->and($po->claimed_by_coa)->toBe('Claimed By COA')
        ->and($po->coa_stamp_notified_via)->toBe('coa@example.test')
        ->and($po->receipt_claimed_notified_date->format('Y-m-d'))->toBe('2026-01-30')
        ->and($po->receipt_claimed_notified_via)->toBe('release@example.test')
        ->and($po->delivery_receipt)->toBe('DR-1')
        ->and($po->items_receiving_date->format('Y-m-d'))->toBe('2026-02-01')
        ->and($po->items_claimed_by)->toBe('Items Claimer')
        ->and($po->date_forwarded_to_finance->format('Y-m-d'))->toBe('2026-02-02')
        ->and($po->workflow_remarks)->toBe('Imported from PIR sheet');

    $inspection = $po->inspectionEntries()->firstOrFail();
    expect($inspection->iar_number)->toBe('IAR-1')
        ->and($inspection->inspected_by)->toBe('Inspector One')
        ->and($inspection->inspection_date->format('Y-m-d'))->toBe('2026-01-29');
});
