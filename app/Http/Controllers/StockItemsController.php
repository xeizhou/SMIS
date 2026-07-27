<?php

namespace App\Http\Controllers;

use App\Models\FundCluster;
use App\Models\StockItem;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockItemsController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');

        // Changed 'unit' to 'units' to eager load the many-to-many relationship
        $query = StockItem::with(['units', 'fundCluster'])
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('stock_no', 'like', "%{$search}%")
                        ->orWhere('item_name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            });

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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'stock_no' => 'required|string|max:255|unique:stock_items,stock_no',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'on_hand_quantity' => 'required|integer|min:0',
            're_order_point' => 'required|integer|min:0',
            'fund_cluster_id' => 'nullable|exists:fund_clusters,fund_cluster_id',
            'remarks' => 'nullable|string',
            
            // New validation for the units array
            'units' => 'required|array|min:1',
            'units.*.unitID' => 'required|exists:units,unitID',
            'units.*.is_default' => 'required|boolean',
        ]);

        $stockItem = StockItem::create($request->except('units'));

        // Prepare data for the pivot table
        $syncData = [];
        foreach ($request->input('units') as $unit) {
            $syncData[$unit['unitID']] = ['is_default' => $unit['is_default']];
        }
        $stockItem->units()->sync($syncData);

        return redirect()->back();
    }

    public function update(Request $request, StockItem $stockItem)
    {
        $validated = $request->validate([
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'on_hand_quantity' => 'required|integer|min:0',
            're_order_point' => 'required|integer|min:0',
            'fund_cluster_id' => 'nullable|exists:fund_clusters,fund_cluster_id',
            'remarks' => 'nullable|string',

            // New validation for the units array
            'units' => 'required|array|min:1',
            'units.*.unitID' => 'required|exists:units,unitID',
            'units.*.is_default' => 'required|boolean',
        ]);

        $stockItem->update($request->except('units'));

        // Sync updates the pivot table (adds new, updates existing, removes missing)
        $syncData = [];
        foreach ($request->input('units') as $unit) {
            $syncData[$unit['unitID']] = ['is_default' => $unit['is_default']];
        }
        $stockItem->units()->sync($syncData);

        return redirect()->back();
    }

    public function destroy(StockItem $stockItem)
    {
        $stockItem->delete();
        return redirect()->back();
    }
}