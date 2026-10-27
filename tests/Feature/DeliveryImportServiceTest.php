<?php

use App\Models\Delivery;
use App\Services\DeliveryImportService;
use Illuminate\Http\UploadedFile;

function deliveryMonitoringCsvUpload(string $filename, array $rows): UploadedFile
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

it('imports the SMU delivery monitoring CSV format and preserves multiple records for a PO', function () {
    $headers = [
        'PO NUMBER',
        'SUPPLIER',
        'Date of Delivery',
        'PO Date Recieved',
        'Delivery Term',
        'Due Date',
        'No. of Days (LD)',
        'RECIEVED BY',
        '',
        'END-USER',
        'PLACE OF DELIVERY',
        'STATUS',
        'REMARKS',
        'DATA ENTRY TIMESTAMP',
        'TOTAL AMOUNT DELIVERED',
        'PO TOTAL AMOUNT',
        'FOLDER LINK',
    ];
    $receiverSubheaders = array_fill(0, count($headers), '');
    $receiverSubheaders[7] = 'PERSON1';
    $receiverSubheaders[8] = 'PERSON2';

    $firstDelivery = [
        '2025-11-1311',
        'E and K I.T. SOLUTIONS',
        '1/5/2026',
        '12/11/2025',
        '30 DAYS',
        '1/10/2026',
        '5',
        'BOBET',
        'ALVIN',
        'RMD',
        'SMU',
        'PARTIAL',
        'with DR and INVOICE; need installation',
        '1/16/2026 08:17:22',
        '625,000.00',
        '625,000.00',
        'Upload/View Image',
    ];
    $secondDelivery = $firstDelivery;
    $secondDelivery[2] = '1/6/2026';
    $secondDelivery[7] = 'JASMIN';
    $secondDelivery[8] = 'RAP';
    $secondDelivery[11] = 'COMPLETE';
    $secondDelivery[13] = '1/17/2026 09:30:00';
    $secondDelivery[14] = '600,000.00';

    $file = deliveryMonitoringCsvUpload('delivery-monitoring.csv', [
        ['SMU DELIVERY MONITORING 2026'],
        $headers,
        $receiverSubheaders,
        array_fill(0, count($headers), ''),
        $firstDelivery,
        $secondDelivery,
    ]);

    $service = app(DeliveryImportService::class);
    $result = $service->importFile($file);

    expect($result['created'])->toBe(2)
        ->and(Delivery::where('po_number', '2025-11-1311')->count())->toBe(2);

    $first = Delivery::where('po_number', '2025-11-1311')
        ->where('data_entry_timestamp', '2026-01-16 08:17:22')
        ->firstOrFail();
    expect($first->delivery_date->format('Y-m-d'))->toBe('2026-01-05')
        ->and($first->received_by_1)->toBe('BOBET')
        ->and($first->received_by_2)->toBe('ALVIN')
        ->and($first->status)->toBe('PARTIAL')
        ->and((float) $first->total_amount_delivered)->toBe(625000.0)
        ->and((float) $first->po_total_amount)->toBe(625000.0)
        ->and($first->folder_link)->toBe('Upload/View Image');

    $second = Delivery::where('po_number', '2025-11-1311')
        ->where('data_entry_timestamp', '2026-01-17 09:30:00')
        ->firstOrFail();
    expect($second->received_by_1)->toBe('JASMIN')
        ->and($second->received_by_2)->toBe('RAP')
        ->and($second->status)->toBe('COMPLETE')
        ->and((float) $second->total_amount_delivered)->toBe(600000.0);

    $repeatResult = $service->importFile($file);
    expect($repeatResult['created'])->toBe(0)
        ->and($repeatResult['updated'])->toBe(2)
        ->and(Delivery::where('po_number', '2025-11-1311')->count())->toBe(2);
});

it('uses the SMU delivery CSV columns in its template preview', function () {
    $preview = app(DeliveryImportService::class)->getTemplatePreview();

    expect($preview['headers'])->toBe([
        'PO NUMBER',
        'Supplier',
        'Date of Delivery',
        'PO Date Recieved',
        'Delivery Term',
        'Due Date',
        'No. of Days (LD)',
        'RECIEVED BY PERSON1',
        'RECIEVED BY PERSON2',
        'END-USER',
        'PLACE OF DELIVERY',
        'STATUS',
        'Remarks',
        'DATA ENTRY TIMESTAMP',
        'TOTAL AMOUNT DELIVERED',
        'PO TOTAL AMOUNT',
        'FOLDER LINK',
    ])->and(count($preview['rows']))->toBe(3);

    foreach ($preview['rows'] as $row) {
        expect(count($row))->toBe(count($preview['headers']));
    }
});
