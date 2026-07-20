<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\Unit;
use App\Models\FundCluster;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockItemsController extends Controller
{
    /**
     * Display the Stock Items page.
     */
    public function index(Request $request)
{
    $search = $request->input('search');

    $query = StockItem::with(['unit', 'fundCluster'])
        ->when($search, function ($q) use ($search) {
            $q->where(function ($sub) use ($search) {
                $sub->where('stock_no', 'like', "%{$search}%")
                    ->orWhere('item_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        });

    // Fund Cluster Filter
    if ($request->filled('fund_cluster_id') && $request->fund_cluster_id !== 'all') {
        $query->where('fund_cluster_id', $request->fund_cluster_id);
    }

    $stockItems = $query->orderBy('item_name')
        ->paginate(10)
        ->withQueryString();

    return Inertia::render('stock-items/index', [
        'stockItems' => $stockItems,
        'units' => Unit::orderBy('unit_name')->get(),
        'fundClusters' => FundCluster::orderBy('fund_cluster_id')->get(),
        'filters' => [
            'search' => $search,
            'fund_cluster_id' => $request->input('fund_cluster_id', 'all'),
        ],
    ]);
}

    /**
     * Store a newly created stock item.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'stock_no' => 'required|string|max:255|unique:stock_items,stock_no',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'unitID' => 'nullable|exists:units,unitID',
            'on_hand_quantity' => 'required|integer|min:0',
            're_order_point' => 'required|integer|min:0',
            'fund_cluster_id' => 'nullable|exists:fund_clusters,fund_cluster_id',
            'remarks' => 'nullable|string',
        ]);

        StockItem::create($validated);

        return redirect()->back();
    }
}