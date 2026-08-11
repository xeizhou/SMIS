<?php

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;

public function exportExcel(Request $request)
{
    [$query, $cutoffDate, $fundClusterId] = $this->reportQuery($request);
    [$fundClusterLabel, $asOfLabel] = $this->reportTitleParts($request, $cutoffDate, $fundClusterId);

    $items = $query->get();

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Physical Count Inventories');

    // Report header
    $sheet->setCellValue('A1', 'REPORT OF PHYSICAL COUNT INVENTORIES');
    $sheet->mergeCells('A1:D1');
    $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
    $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

    $sheet->setCellValue('A2', 'FUND CLUSTER: ' . $fundClusterLabel);
    $sheet->getStyle('A2')->getFont()->setBold(true);

    $sheet->setCellValue('A3', 'AS OF: ' . ($asOfLabel ?: '________________'));
    $sheet->getStyle('A3')->getFont()->setBold(true);

    // Table headings (row 5)
    $headings = ['Item Description', 'Unit', 'Quantity per Stock Card', 'Quantity per Physical Count'];
    $sheet->fromArray($headings, null, 'A5');
    $sheet->getStyle('A5:D5')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
    $sheet->getStyle('A5:D5')->getFill()
        ->setFillType(Fill::FILL_SOLID)
        ->getStartColor()->setRGB('370001');

    // Table rows
    $row = 6;
    foreach ($items as $item) {
        $sheet->setCellValue("A{$row}", $item->item_name . ($item->item_description ? ' - ' . $item->item_description : ''));
        $sheet->setCellValue("B{$row}", $item->unit_short_name);
        $sheet->setCellValue("C{$row}", $item->balance_per_stock_card);
        $sheet->setCellValue("D{$row}", '');
        $row++;
    }

    foreach (range('A', 'D') as $col) {
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    $filename = 'Report_of_Physical_Count_Inventories_' . now()->format('Ymd_His') . '.xlsx';

    return response()->streamDownload(function () use ($spreadsheet) {
        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
    }, $filename, [
        'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]);
}