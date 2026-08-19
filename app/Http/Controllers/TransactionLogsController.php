<?php

namespace App\Http\Controllers;

use App\Models\FundCluster;
use App\Models\Office;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\StockItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransactionLogsController extends Controller
{
    /**
     * Display the Transaction Logs page.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');

        // 1. Get the sorting parameters (defaulting to transactionID descending)
        $sortField = $request->input('sort_field', 'transactionID');
        $sortDirection = $request->input('sort_direction', 'desc');

        // 2. Validate the sort field to prevent SQL injection
        $allowedSorts = [
            'transaction_type', 
            'transaction_date', 
            'item_name', 
            'unit_name', // <-- Updated from unitID
            'quantity', 
            'reference', 
            'fund_cluster', 
            'office_code',
            'transactionID'
        ];
        
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'transactionID';
        }

        // Validate the sort direction
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $query = Transaction::with(['unit', 'fundCluster', 'office'])
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('item_name', 'like', "%{$search}%")
                        ->orWhere('reference', 'like', "%{$search}%");
                });
            });

        if ($request->filled('transaction_type') && $request->transaction_type !== 'all') {
            $query->where('transaction_type', $request->transaction_type);
        }

        // 3. Apply the dynamic sorting
        if ($sortField === 'unit_name') {
            // Use a subquery to sort by the related unit name without doing a full JOIN
            $query->orderBy(
                Unit::select('unit_short_name')
                    ->whereColumn('units.unitID', 'transactions.unitID')
                    ->limit(1),
                $sortDirection
            );
        } else {
            $query->orderBy($sortField, $sortDirection);
        }

        $transactions = $query->paginateWithHighlight(10)->withQueryString();

        // Avoid key collision: relation "fundCluster" snake-cases to "fund_cluster",
        // which clobbers the raw FK column of the same name in JSON output.
        $transactions->getCollection()->transform(function ($transaction) {
            $transaction->fund_cluster_detail = $transaction->fundCluster;

            return $transaction;
        });

        return Inertia::render('transaction-logs/index', [
            'transactions' => $transactions,
            'units' => Unit::orderByDesc('unitID')->get(),
            'fundClusters' => FundCluster::orderByDesc('created_at')->get(),
            'offices' => Office::orderByDesc('office_code')->get(),
            'stockItems' => StockItem::with('units')->orderByDesc('created_at')->get(['stock_no', 'item_name', 'description']),

            'filters' => [
                'search' => $search,
                'transaction_type' => $request->input('transaction_type', 'all'),
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    /**
     * Store a newly created transaction.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_type' => 'required|string|max:255',
            'fund_cluster' => 'required|string|exists:fund_clusters,fund_cluster_id',
            'transaction_date' => 'required|date',
            'stock_no' => 'nullable|string|exists:stock_items,stock_no',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'unitID' => 'required|exists:units,unitID',
            'reference' => 'required|string|max:255',
            'quantity' => 'required|integer|min:0',
            'office_code' => 'required|string|exists:offices,office_code',
        ]);

        $transaction = Transaction::create($validated);

        $this->logAudit("Created transaction #{$transaction->transactionID} ({$transaction->transaction_type}, {$transaction->item_name}, qty {$transaction->quantity}).");

        return redirect()->back()->with('success', 'Transaction added successfully.');
    }

    /**
     * Update the specified transaction.
     */
    public function update(Request $request, Transaction $transaction)
    {
        $validated = $request->validate([
            'transaction_type' => 'required|string|max:255',
            'fund_cluster' => 'required|string|exists:fund_clusters,fund_cluster_id',
            'transaction_date' => 'required|date',
            'stock_no' => 'nullable|string|exists:stock_items,stock_no',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'unitID' => 'required|exists:units,unitID',
            'reference' => 'required|string|max:255',
            'quantity' => 'required|integer|min:0',
            'office_code' => 'required|string|exists:offices,office_code',
        ]);

        $isTypeChanged = $request->boolean('is_type_changed')
            && $validated['transaction_type'] !== $transaction->transaction_type;

        if ($isTypeChanged) {
            $original = $transaction->only([
                'transactionID', 'transaction_type', 'item_name', 'quantity', 'reference',
            ]);

            $new = Transaction::create($validated);

            $this->logAudit(sprintf(
                'Txn #%d corrected (%s -> %s) -> new txn #%d.',
                $original['transactionID'],
                $original['transaction_type'],
                $validated['transaction_type'],
                $new->transactionID,
                $validated['item_name'],
                $validated['quantity'],
                $validated['reference']
            ));

            return redirect()->back()->with('success', 'Transaction corrected and converted successfully.');
        }

        $before = $transaction->only([
            'transaction_type', 'item_name', 'quantity', 'reference', 'transaction_date',
        ]);

        $transaction->update($validated);

        $this->logAudit(sprintf(
            'Updated transaction #%d (typo/correction, type unchanged): %s.',
            $transaction->transactionID,
            $this->diffSummary($before, $validated)
        ));

        return redirect()->back()->with('success', 'Transaction updated successfully.');
    }

    /**
     * Remove the specified transaction.
     */
    public function destroy(Transaction $transaction)
    {
        try {
            $id = $transaction->transactionID;
            $transaction->delete();

            $this->logAudit("Deleted transaction #{$id}.");
        } catch (\Illuminate\Database\QueryException $e) {
            return back()->withErrors([
                'delete' => 'This transaction cannot be deleted because it has related records.',
            ]);
        }

        return redirect()->back()->with('success', 'Transaction archived successfully.');
    }

    /**
     * Write a simple text entry to audit_logs.
     */
    private function logAudit(string $action): void
    {
        DB::table('audit_logs')->insert([
            'log_timestamp' => now(),
            'userID' => Auth::id(),
            'role' => Auth::user()->role ?? 'user',
            'action' => $action,
        ]);
    }

    /**
     * Build a short "field: old -> new" summary for fields that actually
     * changed, for the audit log entry.
     */
    private function diffSummary(array $before, array $after): string
    {
        $parts = [];

        foreach ($before as $key => $oldValue) {
            $newValue = $after[$key] ?? null;
            if ((string) $oldValue !== (string) $newValue) {
                $parts[] = "{$key}: \"{$oldValue}\" -> \"{$newValue}\"";
            }
        }

        return $parts ? implode(', ', $parts) : 'no field changes detected';
    }
}