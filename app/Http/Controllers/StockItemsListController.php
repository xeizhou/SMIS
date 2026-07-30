<?php

namespace App\Http\Controllers;

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

        $query = DB::table('stock_items as i')
            ->join('stock_item_unit as siu', function ($join) {
                $join->on('siu.stock_no', '=', 'i.stock_no')
                    ->where('siu.is_default', '=', true);
            })
            ->join('units as u', 'u.unitID', '=', 'siu.unitID')
            ->leftJoin('transactions as t', 't.item_name', '=', 'i.item_name')
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
                ), 0) as balance_per_stock_card")
            )
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('i.item_name', 'like', "%{$search}%")
                        ->orWhere('i.stock_no', 'like', "%{$search}%");
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
            ->orderBy('i.item_name');

        $items = $query->paginate(10)->withQueryString();

        // Quantity per physical count has no backing feature/table yet —
        // always null until a physical count module exists.
        $items->getCollection()->transform(function ($item) {
            $item->quantity_per_physical_count = null;
            return $item;
        });

        return Inertia::render('stock-items-list/index', [
            'items' => $items,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }
}