<?php

namespace App\Http\Controllers;

use App\Models\FundCluster;
use App\Models\Office;
use App\Models\StockItem;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockItemDashboardController extends Controller
{
    /**
     * Display the Stock Item Dashboard.
     *
     * NOTE: transactions.item_name is matched against stock_items.item_name
     * (there's no stock_no FK on the transactions table today). Balances
     * below are computed off that name match — if two stock items ever
     * share a name, or an item gets renamed, this will misattribute
     * quantities. Worth adding a stock_no column to transactions.
     */
    public function index(Request $request)
    {
        return Inertia::render('stock-items-dashboard/index', [
            'kpis' => $this->getKpis(),
            'stockItems' => $this->getStockItems(),
            'transactions' => $this->getTransactions($request),
            'filters' => [
                'offices' => Office::orderBy('office_name')->get(['office_code', 'office_name']),
                'fundClusters' => FundCluster::orderBy('fund_cluster_id')->get(['fund_cluster_id', 'fund_description']),
            ],
        ]);
    }

    public function data(Request $request)
    {
        return response()->json([
            'kpis' => $this->getKpis(),
            'stockItems' => $this->getStockItems(),
            'transactions' => $this->getTransactions($request),
        ]);
    }

    private function getStockItems()
    {
        $balances = $this->balancesByItemName();

        return StockItem::with('units')
            ->orderBy('item_name')
            ->get()
            ->map(function ($item) use ($balances) {
                $bal = $balances->get($item->item_name);
                $balance = $bal->balance ?? 0;

                return [
                    'stock_no' => $item->stock_no,
                    'item_name' => $item->item_name,
                    'description' => $item->description,
                    'reorder_point' => $item->reorder_point ?? 10,
                    'units' => $item->units->map(fn ($u) => [
                        'unit_name' => $u->unit_name,
                        'unit_short_name' => $u->unit_short_name,
                        'is_default' => (bool) $u->pivot->is_default,
                    ])->values(),
                    'balance' => $balance,
                    'last_transaction_date' => $bal->last_date ?? null,
                    'status' => $this->statusFor($balance, $item->reorder_point ?? 10),
                ];
            })
            ->values();
    }

    /**
     * Paginated + filterable transaction log, scoped to a single month.
     * Query params: page, per_page, office_code, fund_cluster, type, month (YYYY-MM)
     */
    private function getTransactions(Request $request)
    {
        $query = Transaction::query()
            ->join('units', 'transactions.unitID', '=', 'units.unitID')
            ->select('transactions.*', 'units.unit_short_name')
            ->orderByDesc('transaction_date');

        if ($office = $request->query('office_code')) {
            $query->where('office_code', $office);
        }

        if ($fundCluster = $request->query('fund_cluster')) {
            $query->where('fund_cluster', $fundCluster);
        }

        if ($type = $request->query('type')) {
            $query->where('transaction_type', $type);
        }

        // Restrict to the current calendar quarter by default.
        // Pass ?year=2026&quarter=3 to view a different quarter if ever needed.
        $year = (int) $request->query('year', now()->year);
        $q = (int) $request->query('quarter', now()->quarter);

        $startMonth = ($q - 1) * 3 + 1;
        $rangeStart = \Carbon\Carbon::create($year, $startMonth, 1)->startOfDay();
        $rangeEnd = $rangeStart->copy()->addMonths(2)->endOfMonth()->endOfDay();

        $query->whereBetween('transaction_date', [$rangeStart, $rangeEnd]);

        $perPage = (int) $request->query('per_page', 20);

        $paginated = $query->paginate($perPage)->withQueryString();

        return [
            'data' => collect($paginated->items())->map(fn ($t) => [
                'transactionID' => $t->transactionID,
                'transaction_type' => $t->transaction_type,
                'transaction_date' => $t->transaction_date,
                'item_name' => $t->item_name,
                'reference' => $t->reference,
                'quantity' => $t->quantity,
                'unit_short_name' => $t->unit_short_name,
                'office_code' => $t->office_code,
                'fund_cluster' => $t->fund_cluster,
                'description' => $t->description,
            ])->values(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'quarter' => "Q{$q} {$year}",
        ];
    }

    private function getKpis()
    {
        $balances = $this->balancesByItemName();
        $items = StockItem::all(['stock_no', 'item_name', 'reorder_point'])->keyBy('item_name');

        $low = 0;
        $out = 0;
        foreach ($items as $itemName => $item) {
            $balance = $balances->get($itemName)->balance ?? 0;
            if ($balance <= 0) {
                $out++;
            } elseif ($balance < ($item->reorder_point ?? 10)) {
                $low++;
            }
        }

        return [
            'total_items' => $items->count(),
            'total_stock_on_hand' => (int) $balances->sum('balance'),
            'low_stock_count' => $low,
            'out_of_stock_count' => $out,
            'transactions_today' => Transaction::whereDate('transaction_date', today())->count(),
            'transactions_this_week' => Transaction::where('transaction_date', '>=', now()->startOfWeek())->count(),
        ];
    }

    private function balancesByItemName()
    {
        return Transaction::selectRaw("
                item_name,
                SUM(CASE WHEN transaction_type = 'IN' THEN quantity ELSE -quantity END) AS balance,
                MAX(transaction_date) AS last_date
            ")
            ->groupBy('item_name')
            ->get()
            ->keyBy('item_name');
    }

    private function statusFor(int $balance, int $reorderPoint): string
    {
        return match (true) {
            $balance <= 0 => 'out',
            $balance < $reorderPoint => 'low',
            default => 'ok',
        };
    }
}