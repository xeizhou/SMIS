<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Unit;
use App\Models\FundCluster;
use App\Models\Office;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionLogsController extends Controller
{
    /**
     * Display the Transaction Logs page.
     */
    public function index(Request $request)
        {
            $search = $request->input('search');

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

            $transactions = $query->orderBy('transaction_date', 'desc')
                ->paginate(10)
                ->withQueryString();

            // Avoid key collision: relation "fundCluster" snake-cases to "fund_cluster",
            // which clobbers the raw FK column of the same name in JSON output.
            $transactions->getCollection()->transform(function ($transaction) {
                $transaction->fund_cluster_detail = $transaction->fundCluster;
                return $transaction;
            });

            return Inertia::render('transaction-logs/index', [
                'transactions' => $transactions,
                'units' => Unit::orderBy('unit_name')->get(),
                'fundClusters' => FundCluster::orderBy('fund_cluster_id')->get(),
                'offices' => Office::orderBy('office_name')->get(),
                'filters' => [
                    'search' => $search,
                    'transaction_type' => $request->input('transaction_type', 'all'),
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
            'item_name' => 'required|string|max:255',
            'unitID' => 'required|exists:units,unitID',
            'reference' => 'required|string|max:255',
            'quantity' => 'required|integer|min:0',
            'office_code' => 'required|string|exists:offices,office_code',
        ]);

        Transaction::create($validated);

        return redirect()->back();
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
            'item_name' => 'required|string|max:255',
            'unitID' => 'required|exists:units,unitID',
            'reference' => 'required|string|max:255',
            'quantity' => 'required|integer|min:0',
            'office_code' => 'required|string|exists:offices,office_code',
        ]);

        $transaction->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified transaction.
     */
    public function destroy(Transaction $transaction)
    {
        $transaction->delete();

        return redirect()->back();
    }
}