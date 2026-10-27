<?php

use App\Models\PoLetterMonitoring;
use App\Services\PoLetterImportService;
use Illuminate\Http\UploadedFile;

function poLetterMonitoringCsvUpload(string $filename, array $rows): UploadedFile
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

it('imports the consolidated PO letter CSV format and preserves repeated PO/type rows', function () {
    $headers = [
        'REFERENCE NO.',
        'SUPPLIER',
        'P.O NUMBER',
        'P.O DATE',
        'DATE RECEIVED BY THE SUPPLIER',
        'DELIVERY TERM',
        'DUE DATE',
        'OFFICE/ END-USER',
        'TYPE OF LETTER',
        'DATE RECEIVED BY THE SMU',
        'DATE FORWARDED TO OVPAD',
        'RECEIVED BY',
        'STATUS OF THE LETTER',
        'LINK',
        'DATE FORWARDED TO THE END-USER',
        'REMARKS',
    ];
    $firstLetter = [
        '',
        'GAMBHEER FRIANNE CONSUMER GOODS TRADING',
        '2025-07-0841',
        '07/18/2025',
        '08/13/2025',
        '30 Days',
        '09/12/2025',
        'VPAd',
        'EXTENSION',
        '09/10/2025',
        '09/10/2025',
        'VY',
        'APPROVED',
        '[VIEW HERE]',
        '09/11/2025',
        'Additional 25days',
    ];
    $secondLetter = $firstLetter;
    $secondLetter[9] = '10/09/2025';
    $secondLetter[10] = '10/16/2025';
    $secondLetter[15] = '';
    $unsupportedLetter = $firstLetter;
    $unsupportedLetter[2] = '2025-07-0842';
    $unsupportedLetter[8] = 'Justification Letter';

    $file = poLetterMonitoringCsvUpload('po-letters.csv', [
        ['', '', 'REGULAR P.O'],
        ['', '', 'CONSOLIDATED'],
        $headers,
        $firstLetter,
        $secondLetter,
        $unsupportedLetter,
    ]);

    $service = app(PoLetterImportService::class);
    $result = $service->importFile($file);

    expect($result['created'])->toBe(2)
        ->and($result['updated'])->toBe(0)
        ->and(count($result['skipped']))->toBe(1)
        ->and($result['skipped'][0])->toContain('Row #6')
        ->and(PoLetterMonitoring::where('po_number', '2025-07-0841')
            ->where('type_of_letter', 'EXTENSION')
            ->count())->toBe(2);

    $letter = PoLetterMonitoring::where('po_number', '2025-07-0841')
        ->orderBy('id')
        ->firstOrFail();
    expect($letter->reference_no)->toBeNull()
        ->and($letter->supplier->supplier_name)->toBe('GAMBHEER FRIANNE CONSUMER GOODS TRADING')
        ->and($letter->po_date->format('Y-m-d'))->toBe('2025-07-18')
        ->and($letter->date_received_by_smu->format('Y-m-d'))->toBe('2025-09-10')
        ->and($letter->office_end_user)->toBe('VPAd')
        ->and((int) $letter->getRawOriginal('delivery_term'))->toBe(30)
        ->and($letter->getRawOriginal('due_date'))->toBe('2025-09-12')
        ->and($letter->date_forwarded_to_ovpad->format('Y-m-d'))->toBe('2025-09-10')
        ->and($letter->date_forwarded_to_end_user->format('Y-m-d'))->toBe('2025-09-11')
        ->and($letter->received_by)->toBe('VY')
        ->and($letter->status_of_the_letter)->toBe('APPROVED')
        ->and($letter->document_link)->toBe('[VIEW HERE]')
        ->and($letter->remarks)->toBe('Additional 25days');

    $repeatResult = $service->importFile($file);
    expect($repeatResult['created'])->toBe(0)
        ->and($repeatResult['updated'])->toBe(2)
        ->and(PoLetterMonitoring::where('po_number', '2025-07-0841')
            ->where('type_of_letter', 'EXTENSION')
            ->count())->toBe(2);
});

it('uses the consolidated PO letter CSV columns in its template preview', function () {
    $preview = app(PoLetterImportService::class)->getTemplatePreview();

    expect($preview['headers'])->toBe([
        'REFERENCE NO.',
        'SUPPLIER',
        'P.O NUMBER',
        'P.O DATE',
        'DATE RECEIVED BY THE SUPPLIER',
        'DELIVERY TERM',
        'DUE DATE',
        'OFFICE/ END-USER',
        'TYPE OF LETTER',
        'DATE RECEIVED BY THE SMU',
        'DATE FORWARDED TO OVPAD',
        'RECEIVED BY',
        'STATUS OF THE LETTER',
        'LINK',
        'DATE FORWARDED TO THE END-USER',
        'REMARKS',
    ])->and(count($preview['rows']))->toBe(4);

    foreach ($preview['rows'] as $row) {
        expect(count($row))->toBe(count($preview['headers']));
    }

    ob_start();
    app(PoLetterImportService::class)->downloadTemplate()->sendContent();
    $downloadedCsv = ob_get_clean();
    $downloadedRows = array_map('str_getcsv', explode("\n", trim($downloadedCsv)));

    expect($downloadedRows[0])->toBe(['', '', 'REGULAR P.O'])
        ->and($downloadedRows[1])->toBe(['', '', 'CONSOLIDATED'])
        ->and($downloadedRows[2])->toBe($preview['headers']);
});
