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
     * Balances are computed per `stock_no` (not item_name — several stock
     * items can legitimately share the same name, e.g. "Bond Paper A4" in
     * different units/fund clusters, and grouping by name text would merge
     * their transactions into one shared, wrong total).
     */
    public function index(Request $request)
    {
        // First visit has no ?quarter= at all. Default it to the current
        // quarter so what's rendered matches what the quarter dropdown
        // shows by default (getCurrentQuarter() on the frontend) instead
        // of silently falling back to "All Quarters".
        if (! $request->has('quarter')) {
            $request->merge(['quarter' => $this->currentQuarterLabel()]);
        }

        return Inertia::render('stock-items-dashboard/index', [
            'kpis' => $this->getKpis(),
            'stockItems' => $this->getStockItems(),
            'transactions' => $this->getTransactions($request),
            'movement' => $this->getMovement($request),
            'filters' => [
                'offices' => Office::orderBy('office_name')->get(['office_code', 'office_name']),
                'fundClusters' => FundCluster::orderBy('fund_cluster_id')->get(['fund_cluster_id', 'fund_description']),
                'quarters' => ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
            ],
        ]);
    }

    private function currentQuarterLabel(): string
    {
        $now = now();
        $q = intdiv($now->month - 1, 3) + 1;

        return "Q{$q} {$now->year}";
    }

    public function data(Request $request)
    {
        return response()->json([
            'kpis' => $this->getKpis(),
            'stockItems' => $this->getStockItems(),
            'transactions' => $this->getTransactions($request),
            'movement' => $this->getMovement($request),
        ]);
    }

    private function getStockItems()
    {
        $balances = $this->balancesByStockNo();

        return StockItem::with('units')
            ->orderBy('item_name')
            ->get()
            ->map(function ($item) use ($balances) {
                $bal = $balances->get($item->stock_no);
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
     * Paginated + filterable transaction log, scoped to a single quarter.
     * Query params: page, per_page, office_code, fund_cluster, type, year, quarter
     */
    /**
     * Applies office/fund_cluster/type filters and the quarter (or full-year)
     * date range to a query. Shared by getTransactions() and getMovement()
     * so both are always scoped to the *same* range.
     */
    private function applyScope(Request $request, $query): array
    {
        if ($office = $request->query('office_code')) {
            $query->where('office_code', $office);
        }

        if ($fundCluster = $request->query('fund_cluster')) {
            $query->where('fund_cluster', $fundCluster);
        }

        if ($type = $request->query('type')) {
            $query->where('transaction_type', $type);
        }

        $quarterParam = $request->query('quarter');

        if ($quarterParam && preg_match('/Q([1-4])\s+(\d{4})/', $quarterParam, $matches)) {
            $q = (int) $matches[1];
            $year = (int) $matches[2];

            $rangeStart = \Carbon\Carbon::create($year, ($q - 1) * 3 + 1, 1)->startOfDay();
            $rangeEnd = $rangeStart->copy()->addMonths(2)->endOfMonth()->endOfDay();

            $query->whereBetween('transaction_date', [$rangeStart, $rangeEnd]);
            $quarterLabel = "Q{$q} {$year}";
        } else {
            $year = 2026;
            $rangeStart = \Carbon\Carbon::create($year, 1, 1)->startOfDay();
            $rangeEnd = \Carbon\Carbon::create($year, 12, 31)->endOfDay();

            $query->whereBetween('transaction_date', [$rangeStart, $rangeEnd]);
            $quarterLabel = "All Quarters {$year}";
        }

        return [$query, $quarterLabel];
    }

    private function getTransactions(Request $request)
    {
        $query = Transaction::query()
            ->join('units', 'transactions.unitID', '=', 'units.unitID')
            ->select('transactions.*', 'units.unit_short_name')
            ->orderByDesc('transaction_date');

        [$query, $quarterLabel] = $this->applyScope($request, $query);

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
            'quarter' => $quarterLabel,
        ];
    }

    /**
     * Daily received/issued totals for the chart, scoped by the SAME
     * office/fund_cluster/quarter filters as getTransactions() — but NOT
     * paginated, so it reflects the whole filtered range, not just the
     * most recent `per_page` rows.
     */
    private function getMovement(Request $request)
    {
        $query = Transaction::query();
        [$query, ] = $this->applyScope($request, $query);

        return $query
            ->selectRaw("
                DATE(transaction_date) AS date,
                SUM(CASE WHEN transaction_type = 'RECEIVE' THEN quantity ELSE 0 END) AS received,
                SUM(CASE WHEN transaction_type = 'ISSUE' THEN quantity ELSE 0 END) AS issued
            ")
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'received' => (int) $row->received,
                'issued' => (int) $row->issued,
            ])
            ->values();
    }
    private function getKpis()
    {
        $balances = $this->balancesByStockNo();
        $items = StockItem::all(['stock_no', 'item_name', 'reorder_point']);

        $low = 0;
        $out = 0;
        foreach ($items as $item) {
            $balance = $balances->get($item->stock_no)->balance ?? 0;
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

    /**
     * Balances keyed by stock_no (the FK now present on transactions),
     * NOT item_name — multiple stock items can share the same display
     * name across different units/fund clusters, and grouping by name
     * text would incorrectly merge their transaction histories together.
     *
     * NOTE: this only counts transactions that have stock_no populated.
     * If any legacy rows predate that column being backfilled, they will
     * not be reflected in any item's balance. Worth checking:
     *   Transaction::whereNull('stock_no')->count()
     */
    private function balancesByStockNo()
    {
        return Transaction::selectRaw("
                stock_no,
                SUM(CASE
                    WHEN transaction_type = 'RECEIVE' THEN quantity
                    WHEN transaction_type = 'ISSUE' THEN -quantity
                    ELSE 0
                END) AS balance,
                MAX(transaction_date) AS last_date
            ")
            ->whereNotNull('stock_no')
            ->groupBy('stock_no')
            ->get()
            ->keyBy('stock_no');
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