<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\FundCluster;
use Barryvdh\DomPDF\Facade\Pdf;

class StockItemsListController extends Controller
{
    /**
     * Display the Stock Items List (inventory / stock card report).
     *
     * NOTE: `stock_items` no longer has a direct `unitID` column — units
     * are now linked via the `stock_item_unit` pivot table (an item can
     * have multiple valid units, one flagged `is_default`). This report
     * joins through that pivot and only shows the unit marked default.
     * If a stock item has no unit marked default, it's excluded from this
     * report (inner join) — flagging that as a data-quality signal rather
     * than silently falling back to an arbitrary unit.
     *
     * "Issued" / "Unissued" filter: an item is considered "issued" if it
     * has at least one ISSUE transaction logged against it, and "unissued"
     * if it has none. This is inferred from transaction history, since
     * there's no dedicated status column for it.
     *
     * Transactions now carry a `stock_no` FK back to `stock_items`, so
     * this report joins on that directly instead of matching on the
     * item_name/description text snapshot (which could collide when two
     * items shared the same name+description).
     */
    public function index(Request $request)
        {
            $search = $request->input('search');
            $issuedStatus = $request->input('issued_status'); // 'issued' | 'unissued' | null/all
            $fundClusterId = $request->input('fund_cluster_id'); // null/all or a fund_cluster_id

            $query = DB::table('stock_items as i')
                ->join('stock_item_unit as siu', function ($join) {
                    $join->on('siu.stock_no', '=', 'i.stock_no')
                        ->where('siu.is_default', '=', true);
                })
                ->join('units as u', 'u.unitID', '=', 'siu.unitID')
                ->leftJoin('transactions as t', 't.stock_no', '=', 'i.stock_no')
                ->select(
                    'i.stock_no',
                    'i.item_name',
                    'i.description as item_description',
                    'u.unitID',
                    'u.unit_name',
                    'u.unit_short_name',
                    DB::raw("COALESCE(SUM(
                        CASE
                            WHEN t.transaction_type = 'RECEIVE' THEN t.quantity
                            WHEN t.transaction_type = 'ISSUE' THEN -t.quantity
                            ELSE 0
                        END
                    ), 0) as balance_per_stock_card"),
                    DB::raw("SUM(CASE WHEN t.transaction_type = 'ISSUE' THEN 1 ELSE 0 END) as issue_count"),
                    DB::raw("MAX(t.transaction_date) as last_transaction_date"),
                    DB::raw("MAX(t.transactionID) as last_transaction_id"),
                    DB::raw("GROUP_CONCAT(DISTINCT t.fund_cluster) as fund_cluster_ids")
                )
                ->when($search, function ($q) use ($search) {
                    $q->where(function ($sub) use ($search) {
                        $sub->where('i.item_name', 'like', "%{$search}%")
                            ->orWhere('i.stock_no', 'like', "%{$search}%");
                    });
                })
                ->when($fundClusterId && $fundClusterId !== 'all', function ($q) use ($fundClusterId) {
                    $q->whereExists(function ($sub) use ($fundClusterId) {
                        $sub->select(DB::raw(1))
                            ->from('transactions as t2')
                            ->whereColumn('t2.stock_no', 'i.stock_no')
                            ->where('t2.fund_cluster', $fundClusterId);
                    });
                })
                ->groupBy(
                    'i.stock_no',
                    'i.item_name',
                    'i.description',
                    'u.unitID',
                    'u.unit_name',
                    'u.unit_short_name'
                )
                ->orderByRaw('last_transaction_id IS NULL')
                ->orderByDesc('last_transaction_id');

            $issueCountExpr = "SUM(CASE WHEN t.transaction_type = 'ISSUE' THEN 1 ELSE 0 END)";

            if ($issuedStatus === 'issued') {
                $query->havingRaw("{$issueCountExpr} > 0");
            } elseif ($issuedStatus === 'unissued') {
                $query->havingRaw("{$issueCountExpr} = 0");
            }

            $items = $query->paginate(10)->withQueryString();

            // Attach human-readable fund cluster descriptions per row.
            $fundClusters = FundCluster::orderBy('fund_cluster_id')->get(['fund_cluster_id', 'fund_description']);
            $fundClusterMap = $fundClusters->keyBy('fund_cluster_id');

            $items->getCollection()->transform(function ($row) use ($fundClusterMap) {
                $ids = $row->fund_cluster_ids ? array_unique(explode(',', $row->fund_cluster_ids)) : [];
                $row->fund_clusters = array_values(array_map(function ($id) use ($fundClusterMap) {
                    return [
                        'fund_cluster_id' => $id,
                        'fund_description' => $fundClusterMap->get($id)?->fund_description,
                    ];
                }, $ids));
                unset($row->fund_cluster_ids);
                return $row;
            });

            return Inertia::render('stock-items-list/index', [
                'items' => $items,
                'fundClusters' => $fundClusters,
                'filters' => [
                    'search' => $search,
                    'issued_status' => $issuedStatus ?? 'all',
                    'fund_cluster_id' => $fundClusterId ?? 'all',
                ],
            ]);
        }

    public function printCards(Request $request)
    {
        // Printing many stock cards means rendering (and, for the page
        // footer, RE-rendering) a potentially very large PDF. Herd's
        // default PHP limits (commonly 30-60s / 128-256M) are tuned for
        // ordinary requests and get hit well before DomPDF finishes on
        // a few hundred pages. Raise them just for this request rather
        // than globally in php.ini.
        set_time_limit(300);
        ini_set('memory_limit', '512M');

        $search = $request->input('search');
        $isUnissued = $request->boolean('unissued'); // Passed as true/false from our new React button
        $fundClusterId = $request->input('fund_cluster');

        // 1. Fetch the filtered items using the exact same logic as your index method
        $query = DB::table('stock_items as i')
            ->join('stock_item_unit as siu', function ($join) {
                $join->on('siu.stock_no', '=', 'i.stock_no')
                    ->where('siu.is_default', '=', true);
            })
            ->join('units as u', 'u.unitID', '=', 'siu.unitID')
            ->leftJoin('transactions as t', 't.stock_no', '=', 'i.stock_no')
            ->select(
                'i.*', // Grabs stock_no, item_name, description, reorder_point (if exists)
                'u.unit_name',
                'u.unit_short_name',
                DB::raw("GROUP_CONCAT(DISTINCT t.fund_cluster) as fund_cluster_ids")
            )
            ->when($search && $search !== 'None', function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('i.item_name', 'like', "%{$search}%")
                        ->orWhere('i.stock_no', 'like', "%{$search}%");
                });
            })
            ->when($fundClusterId && $fundClusterId !== 'None', function ($q) use ($fundClusterId) {
                $q->whereExists(function ($sub) use ($fundClusterId) {
                    $sub->select(DB::raw(1))
                        ->from('transactions as t2')
                        ->whereColumn('t2.stock_no', 'i.stock_no')
                        ->where('t2.fund_cluster', $fundClusterId);
                });
            })
            ->groupBy(
                'i.stock_no',
                'i.item_name',
                'i.description',
                'u.unitID',
                'u.unit_name',
                'u.unit_short_name'
                // NOTE: If you get a strict mode group-by error for other columns in `i.*`,
                // list the explicit columns here instead of i.* (e.g., 'i.reorder_point').
            );

        $issueCountExpr = "SUM(CASE WHEN t.transaction_type = 'ISSUE' THEN 1 ELSE 0 END)";
        if ($isUnissued) {
            $query->havingRaw("{$issueCountExpr} = 0");
        }

        $items = $query->get();

        // 2. Fetch ALL transactions for the filtered items to calculate running balance.
        // Matched by stock_no now, not name/description text.
        $stockNos = $items->pluck('stock_no')->filter()->unique()->values()->toArray();

        $transactions = DB::table('transactions')
            ->whereIn('stock_no', $stockNos)
            ->orderBy('transaction_date', 'asc')
            ->orderBy('transactionID', 'asc')
            ->get();

        // Group transactions by stock_no ONCE, up front. The previous
        // version called $transactions->filter() inside the items loop —
        // an O(n_items × n_transactions) scan. With hundreds of items and
        // thousands of transactions across the whole system, that alone
        // could take longer than DomPDF's actual rendering. groupBy() is
        // a single O(n_transactions) pass; the per-item lookup below is
        // then a fast O(1) collection fetch.
        $transactionsByStock = $transactions->groupBy('stock_no');

        // 3. Process the ledger for each item
        foreach ($items as $item) {
            // Determine the Fund Cluster label for the card header
            if ($fundClusterId && $fundClusterId !== 'None') {
                $item->display_fund_cluster = $fundClusterId;
            } else {
                $item->display_fund_cluster = $item->fund_cluster_ids ? str_replace(',', ', ', $item->fund_cluster_ids) : '—';
            }

            // Get transactions specific to this item, matched by stock_no
            $itemTransactions = $transactionsByStock->get($item->stock_no, collect());

            // Calculate running balance
            $balance = 0;
            $ledger = [];
            foreach ($itemTransactions as $t) {
                $receiptQty = $t->transaction_type === 'RECEIVE' ? (float) $t->quantity : null;
                $issueQty = $t->transaction_type === 'ISSUE' ? (float) $t->quantity : null;

                if ($receiptQty) $balance += $receiptQty;
                if ($issueQty) $balance -= $issueQty;

                $ledger[] = (object) [
                    'date' => $t->transaction_date,
                    'reference' => $t->reference ?? '',
                    'receipt_qty' => $receiptQty,
                    'issue_qty' => $issueQty,
                    'office' => $t->office_code ?? '', // Adjust to match your DB column
                    'balance' => $balance,
                    'days_to_consume' => '' // Leave blank or add column if you track this
                ];
            }
            $item->ledger = $ledger;
        }

        // Build a human-readable title: specific item name if printing a single
        // card, otherwise a summary of whatever filters were active, falling
        // back to "All Items" if nothing was filtered.
        if ($items->count() === 1) {
            $singleItem = $items->first();
            $pdfTitle = 'Stock Card - ' . $singleItem->item_name
                . ($singleItem->description ? " ({$singleItem->description})" : '');
        } else {
            $summaryParts = [];

            if ($fundClusterId && $fundClusterId !== 'None') {
                $summaryParts[] = "Fund Cluster: {$fundClusterId}";
            }
            if ($isUnissued) {
                $summaryParts[] = 'Unissued Only';
            }
            if ($search && $search !== 'None') {
                $summaryParts[] = "Search: {$search}";
            }

            $pdfTitle = $summaryParts
                ? 'Stock Cards - ' . implode(', ', $summaryParts)
                : 'Stock Cards - All Items';
        }

        // Sanitize for use as a filename (strip characters that are awkward
        // in downloaded file names, collapse spaces).
        $pdfFilename = preg_replace('/[^A-Za-z0-9_\- ]/', '', $pdfTitle);
        $pdfFilename = preg_replace('/\s+/', '_', trim($pdfFilename));

        // 4. Generate the PDF
        $pdf = Pdf::loadView('pdf.printstockcards', [
            'stockItems' => $items,
            'pdfTitle' => $pdfTitle,
        ]);

        $pdf->setPaper('A4', 'portrait');

        // Force a full render pass FIRST, so DomPDF has already computed
        // every page break before we try to stamp footer text.
        $dompdf = $pdf->getDomPDF();
        $dompdf->render();

        $canvas = $dompdf->getCanvas();
        $fontMetrics = $dompdf->getFontMetrics();

        $generatedAt = now()->format('F d, Y \a\t h:i A');
        $font = $fontMetrics->getFont('Arial', 'normal');
        $fontSize = 10;

        // Left-aligned page number
        $canvas->page_text(
            40,
            $canvas->get_height() - 40,
            "Page {PAGE_NUM} of {PAGE_COUNT}",
            $font,
            $fontSize,
            [0, 0, 0]
        );

        // Right-aligned "Generated:" text
        $generatedText = "Generated: {$generatedAt}";
        $textWidth = $fontMetrics->getTextWidth($generatedText, $font, $fontSize);

        $canvas->page_text(
            $canvas->get_width() - 40 - $textWidth,
            $canvas->get_height() - 40,
            $generatedText,
            $font,
            $fontSize,
            [0, 0, 0]
        );

        // Re-render so the stamped footer text actually gets painted
        // onto every page now that the page count is known.
        $dompdf->render();

        return $pdf->stream("{$pdfFilename}.pdf");
    }
}