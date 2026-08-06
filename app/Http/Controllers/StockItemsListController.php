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
     * CAVEAT: `transactions.item_name` is a plain-text snapshot, not a
     * foreign key to `stock_items`. This report joins on that text
     * match, which is the only link the current schema provides. If two
     * items ever share the same name, or an item's name is edited after
     * transactions were logged, the balance computed here can drift from
     * reality. The more reliable fix is adding a `stock_no` column to
     * `transactions` that FKs to `stock_items` directly — flagging
     * this as a follow-up rather than changing the transactions table here.
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
            ->leftJoin('transactions as t', function ($join) {
                $join->on('t.item_name', '=', 'i.item_name')
                    ->where(function ($q) {
                        $q->whereColumn('t.description', 'i.description')
                            ->orWhere(function ($q2) {
                                $q2->whereNull('t.description')
                                    ->whereNull('i.description');
                            });
                    });
            })
            ->select(
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
                        ->whereColumn('t2.item_name', 'i.item_name')
                        ->where(function ($q2) {
                            $q2->whereColumn('t2.description', 'i.description')
                                ->orWhere(function ($q3) {
                                    $q3->whereNull('t2.description')
                                        ->whereNull('i.description');
                                });
                        })
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
            ->orderByDesc('last_transaction_date');

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
            ->leftJoin('transactions as t', function ($join) {
                $join->on('t.item_name', '=', 'i.item_name')
                    ->where(function ($q) {
                        $q->whereColumn('t.description', 'i.description')
                            ->orWhere(function ($q2) {
                                $q2->whereNull('t.description')
                                    ->whereNull('i.description');
                            });
                    });
            })
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
                        ->whereColumn('t2.item_name', 'i.item_name')
                        ->where(function ($q2) {
                            $q2->whereColumn('t2.description', 'i.description')
                                ->orWhere(function ($q3) {
                                    $q3->whereNull('t2.description')
                                        ->whereNull('i.description');
                                });
                        })
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

        // 2. Fetch ALL transactions for the filtered items to calculate running balance
        // We match by name since transactions don't have stock_no
        $itemNames = $items->pluck('item_name')->filter()->unique()->values()->toArray();
        
        $transactions = DB::table('transactions')
            ->whereIn('item_name', $itemNames)
            ->orderBy('transaction_date', 'asc')
            ->orderBy('transactionID', 'asc')
            ->get();

        // 3. Process the ledger for each item
        foreach ($items as $item) {
            // Determine the Fund Cluster label for the card header
            if ($fundClusterId && $fundClusterId !== 'None') {
                $item->display_fund_cluster = $fundClusterId;
            } else {
                $item->display_fund_cluster = $item->fund_cluster_ids ? str_replace(',', ', ', $item->fund_cluster_ids) : '—';
            }

            // Get transactions specific to this item
            $itemTransactions = $transactions->filter(function($t) use ($item) {
                return $t->item_name === $item->item_name && $t->description === $item->description;
            });

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

        // 4. Generate the PDF
            $pdf = Pdf::loadView('pdf.printstockcards', [
                'stockItems' => $items
            ]);

            $pdf->setPaper('A4', 'portrait');

            // Add page numbers + generated timestamp using DomPDF's native canvas API,
            // since the CSS counter(pages) trick breaks DomPDF's layout pass on this template.
            $dompdf = $pdf->getDomPDF();
            $canvas = $dompdf->getCanvas();

            $generatedAt = now()->format('F d, Y \a\t h:i A');

            $canvas->page_text(
                40,                          // x position
                $canvas->get_height() - 40,  // y position (near bottom)
                "Page {PAGE_NUM} of {PAGE_COUNT}    Generated: {$generatedAt}",
                null,                        // font (null = default)
                10,                          // font size
                [0, 0, 0]                    // color (black)
            );

            return $pdf->stream('printstockcards.pdf');
        }
    }
