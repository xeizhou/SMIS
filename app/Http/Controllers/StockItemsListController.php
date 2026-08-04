<?php

namespace App\Http\Controllers;

use App\Models\FundCluster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

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
        $fundCluster = $request->input('fund_cluster');
        $issuedStatus = $request->input('issued_status'); // 'issued' | 'unissued' | null/all

        $query = DB::table('stock_items as i')
            ->join('stock_item_unit as siu', function ($join) {
                $join->on('siu.stock_no', '=', 'i.stock_no')
                    ->where('siu.is_default', '=', true);
            })
            ->join('units as u', 'u.unitID', '=', 'siu.unitID')
            ->leftJoin('fund_clusters as fc', 'fc.fund_cluster_id', '=', 'i.fund_cluster_id')
            ->leftJoin('transactions as t', 't.item_name', '=', 'i.item_name')
            ->select(
                'i.item_name',
                'i.description as item_description',
                'u.unitID',
                'u.unit_name',
                'u.unit_short_name',
                'fc.fund_cluster_id',
                'fc.fund_description',
                DB::raw("COALESCE(SUM(
                    CASE
                        WHEN t.transaction_type = 'RECEIVE' THEN t.quantity
                        WHEN t.transaction_type = 'ISSUE' THEN -t.quantity
                        ELSE 0
                    END
                ), 0) as balance_per_stock_card"),
                DB::raw("SUM(CASE WHEN t.transaction_type = 'ISSUE' THEN 1 ELSE 0 END) as issue_count")
            )
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('i.item_name', 'like', "%{$search}%")
                        ->orWhere('i.stock_no', 'like', "%{$search}%");
                });
            })
            ->when($fundCluster && $fundCluster !== 'all', function ($q) use ($fundCluster) {
                $q->where('i.fund_cluster_id', $fundCluster);
            })
            ->groupBy(
                'i.stock_no',
                'i.item_name',
                'i.description',
                'u.unitID',
                'u.unit_name',
                'u.unit_short_name',
                'fc.fund_cluster_id',
                'fc.fund_description'
            )
            ->orderByDesc(DB::raw('MAX(t.transaction_date)'));

        // Filter by issued/unissued after aggregation (HAVING, since it
        // depends on the aggregated issue_count).
        if ($issuedStatus === 'issued') {
            $query->having('issue_count', '>', 0);
        } elseif ($issuedStatus === 'unissued') {
            $query->having('issue_count', '=', 0);
        }

        $items = $query->paginate(10)->withQueryString();

        return Inertia::render('stock-items-list/index', [
            'items' => $items,
            'fundClusters' => FundCluster::orderBy('fund_cluster_id')->get(),
            'filters' => [
                'search' => $search,
                'fund_cluster' => $fundCluster ?? 'all',
                'issued_status' => $issuedStatus ?? 'all',
            ],
        ]);
    }
}