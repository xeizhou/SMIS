<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Models\FundCluster;

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
}