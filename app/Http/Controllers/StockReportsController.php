<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\FundCluster;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class StockReportsController extends Controller
{
    /**
     * Display the Stock Card Summary Report (inventory report).
     *
     * Balance is computed the same way as the Stock Items List
     * (RECEIVE adds, ISSUE subtracts, joined through the default
     * stock_item_unit pivot), but here it's additionally bounded by
     * an optional Cut-off Date — only transactions dated on or
     * before that date are included in the running balance. Without
     * a cut-off date, all transactions to date are counted.
     */
    public function index(Request $request)
    {
        $cutoffDate = $request->input('cutoff_date'); // 'YYYY-MM-DD' or null
        $fundClusterId = $request->input('fund_cluster_id'); // null/all or a fund_cluster_id

        $query = DB::table('stock_items as i')
            ->join('stock_item_unit as siu', function ($join) {
                $join->on('siu.stock_no', '=', 'i.stock_no')
                    ->where('siu.is_default', '=', true);
            })
            ->join('units as u', 'u.unitID', '=', 'siu.unitID')
            ->leftJoin('transactions as t', function ($join) use ($cutoffDate) {
                $join->on('t.stock_no', '=', 'i.stock_no');
                if ($cutoffDate) {
                    $join->where('t.transaction_date', '<=', $cutoffDate);
                }
            })
            ->select(
                'i.stock_no',
                'i.item_name',
                'i.description as item_description',
                'u.unit_short_name',
                DB::raw("COALESCE(SUM(
                    CASE
                        WHEN t.transaction_type = 'RECEIVE' THEN t.quantity
                        WHEN t.transaction_type = 'ISSUE' THEN -t.quantity
                        ELSE 0
                    END
                ), 0) as balance_per_stock_card")
            )
            ->when($fundClusterId && $fundClusterId !== 'all', function ($q) use ($fundClusterId, $cutoffDate) {
                $q->whereExists(function ($sub) use ($fundClusterId, $cutoffDate) {
                    $sub->select(DB::raw(1))
                        ->from('transactions as t2')
                        ->whereColumn('t2.stock_no', 'i.stock_no')
                        ->where('t2.fund_cluster', $fundClusterId);
                    if ($cutoffDate) {
                        $sub->where('t2.transaction_date', '<=', $cutoffDate);
                    }
                });
            })
            ->groupBy(
                'i.stock_no',
                'i.item_name',
                'i.description',
                'u.unit_short_name'
            )
            ->orderBy('i.item_name');

        $items = $query->paginate(15)->withQueryString();

        $fundClusters = FundCluster::orderBy('fund_cluster_id')->get(['fund_cluster_id', 'fund_description']);

        return Inertia::render('stock-reports/index', [
            'items' => $items,
            'fundClusters' => $fundClusters,
            'filters' => [
                'cutoff_date' => $cutoffDate,
                'fund_cluster_id' => $fundClusterId ?? 'all',
            ],
        ]);
    }

    /**
     * Shared query builder for the report data, reused by index(),
     * printPdf(), and exportExcel() so all three stay in sync.
     */
    private function reportQuery(Request $request)
    {
        $cutoffDate = $request->input('cutoff_date');
        $fundClusterId = $request->input('fund_cluster_id');

        $query = DB::table('stock_items as i')
            ->join('stock_item_unit as siu', function ($join) {
                $join->on('siu.stock_no', '=', 'i.stock_no')
                    ->where('siu.is_default', '=', true);
            })
            ->join('units as u', 'u.unitID', '=', 'siu.unitID')
            ->leftJoin('transactions as t', function ($join) use ($cutoffDate) {
                $join->on('t.stock_no', '=', 'i.stock_no');
                if ($cutoffDate) {
                    $join->where('t.transaction_date', '<=', $cutoffDate);
                }
            })
            ->select(
                'i.stock_no',
                'i.item_name',
                'i.description as item_description',
                'u.unit_short_name',
                DB::raw("COALESCE(SUM(
                    CASE
                        WHEN t.transaction_type = 'RECEIVE' THEN t.quantity
                        WHEN t.transaction_type = 'ISSUE' THEN -t.quantity
                        ELSE 0
                    END
                ), 0) as balance_per_stock_card")
            )
            ->when($fundClusterId && $fundClusterId !== 'all', function ($q) use ($fundClusterId, $cutoffDate) {
                $q->whereExists(function ($sub) use ($fundClusterId, $cutoffDate) {
                    $sub->select(DB::raw(1))
                        ->from('transactions as t2')
                        ->whereColumn('t2.stock_no', 'i.stock_no')
                        ->where('t2.fund_cluster', $fundClusterId);
                    if ($cutoffDate) {
                        $sub->where('t2.transaction_date', '<=', $cutoffDate);
                    }
                });
            })
            ->groupBy(
                'i.stock_no',
                'i.item_name',
                'i.description',
                'u.unit_short_name'
            )
            ->orderBy('i.item_name');

        return [$query, $cutoffDate, $fundClusterId];
    }

    private function reportTitleParts(Request $request, $cutoffDate, $fundClusterId)
    {
        $fundClusterLabel = ($fundClusterId && $fundClusterId !== 'all')
            ? $fundClusterId
            : 'ALL';

        $asOfLabel = $cutoffDate
            ? \Carbon\Carbon::parse($cutoffDate)->format('F d, Y')
            : '';

        return [$fundClusterLabel, $asOfLabel];
    }

    /**
     * Stream the Report of Physical Count Inventories PDF inline
     * (used by both the "Print" button and "Export PDF" — the query
     * param `download=1` switches between inline stream and forced
     * download).
     */
    public function printPdf(Request $request)
    {
        [$query, $cutoffDate, $fundClusterId] = $this->reportQuery($request);
        [$fundClusterLabel, $asOfLabel] = $this->reportTitleParts($request, $cutoffDate, $fundClusterId);

        $items = $query->get();

        $pdf = Pdf::loadView('pdf.stock-report', [
            'items' => $items,
            'fundClusterLabel' => $fundClusterLabel,
            'asOfLabel' => $asOfLabel,
        ]);

        $pdf->setPaper('A4', 'portrait');

        $dompdf = $pdf->getDomPDF();
        $dompdf->render();

        $canvas = $dompdf->getCanvas();
        $fontMetrics = $dompdf->getFontMetrics();
        $font = $fontMetrics->getFont('Arial', 'normal');
        $fontSize = 10;

        $canvas->page_text(
            $canvas->get_width() - 100,
            $canvas->get_height() - 30,
            "Page {PAGE_NUM} of {PAGE_COUNT}",
            $font,
            $fontSize,
            [0.6, 0.2, 0.1]
        );

        $dompdf->render();

        $filename = 'Report_of_Physical_Count_Inventories_' . now()->format('Ymd_His') . '.pdf';

        return $request->boolean('download')
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    /**
     * Export the same report data as an Excel workbook, built directly
     * with PhpSpreadsheet (no maatwebsite/excel dependency).
     */
    public function exportExcel(Request $request)
    {
        [$query, $cutoffDate, $fundClusterId] = $this->reportQuery($request);
        [$fundClusterLabel, $asOfLabel] = $this->reportTitleParts($request, $cutoffDate, $fundClusterId);

        $items = $query->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Physical Count Inventories');

        $sheet->setCellValue('A1', 'REPORT OF PHYSICAL COUNT INVENTORIES');
        $sheet->mergeCells('A1:D1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

        $sheet->setCellValue('A2', 'FUND CLUSTER: ' . $fundClusterLabel);
        $sheet->getStyle('A2')->getFont()->setBold(true);

        $sheet->setCellValue('A3', 'AS OF: ' . ($asOfLabel ?: '________________'));
        $sheet->getStyle('A3')->getFont()->setBold(true);

        $headings = ['Item Description', 'Unit', 'Quantity per Stock Card', 'Quantity per Physical Count'];
        $sheet->fromArray($headings, null, 'A5');
        $sheet->getStyle('A5:D5')->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A5:D5')->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setRGB('370001');

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
}