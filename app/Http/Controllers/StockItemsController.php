<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\Unit;
use App\Models\FundCluster;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockItemsController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $fundClusterId = $request->input('fund_cluster_id');
        
        // 1. Get the sorting parameters (defaulting to created_at descending if none provided)
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        // 2. Validate the sort field to prevent SQL injection
        $allowedSorts = ['stock_no', 'item_name', 'description', 'fund_cluster_id', 'created_at']; 
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'created_at';
        }

        // Validate the sort direction
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $query = StockItem::with(['units', 'fundCluster'])
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('stock_no', 'like', "%{$search}%")
                        ->orWhere('item_name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })

            ->when($fundClusterId, function ($q) use ($fundClusterId) {
                $q->where('fund_cluster_id', $fundClusterId);
            });

        // 3. Apply the dynamic sorting
        $stockItems = $query->orderBy($sortField, $sortDirection)
            ->paginateWithHighlight(10)
            ->withQueryString();

        return Inertia::render('stock-items/index', [
            'stockItems' => $stockItems,
            'units' => Unit::orderByDesc('unitID')->get(),
            'fundClusters' => FundCluster::orderBy('fund_cluster_id')->get(),
            'filters' => [
                'search' => $search,
                'fund_cluster_id' => $fundClusterId, // 4. Return it to the frontend
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'stock_no' => 'required|string|max:255|unique:stock_items,stock_no',
            
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'fund_cluster_id' => 'nullable|exists:fund_clusters,fund_cluster_id',
            
            // Validation for the units array
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

        return redirect()->back()->with('success', 'Stock item aaded successfully.');
    }

    public function update(Request $request, StockItem $stockItem)
        {
            $validated = $request->validate([
                // This is the ONLY place that should have $stockItem->stock_no
                'stock_no' => 'required|string|max:255|unique:stock_items,stock_no,' . $stockItem->stock_no . ',stock_no',
                
                'item_name' => 'required|string|max:255',
                'description' => 'nullable|string|max:255',
                'fund_cluster_id' => 'nullable|exists:fund_clusters,fund_cluster_id',

                // Validation for the units array
                'units' => 'required|array|min:1',
                'units.*.unitID' => 'required|exists:units,unitID',
                'units.*.is_default' => 'required|boolean',
            ]);

            $stockItem->update($request->except('units'));

            // Sync updates the pivot table
            $syncData = [];
            foreach ($request->input('units') as $unit) {
                $syncData[$unit['unitID']] = ['is_default' => $unit['is_default']];
            }
            $stockItem->units()->sync($syncData);

            return redirect()->back()->with('success', 'Stock item updated successfully.');
        }

    public function destroy(StockItem $stockItem)
    {
        try {
            $stockItem->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            return back()->with('error', 'Cannot delete this stock item — it is referenced by transaction records.');
        }

        return redirect()->back()->with('success', 'Stock item archived successfully.');
    }

    public function quickAdd(Request $request)
        {
            $validated = $request->validate([
                'item_name' => 'required|string|max:255',
                'description' => 'nullable|string|max:255',
            ]);

            // stock_no is the primary key and can't be null in the DB, but this
            // quick-add flow intentionally doesn't ask the user for one — generate
            // a placeholder they (or someone editing later in Stock Items) can
            // rename to a real stock number. Retry on the off chance of collision.
            do {
                $stockNo = 'TEMP-' . strtoupper(\Illuminate\Support\Str::random(6));
            } while (StockItem::where('stock_no', $stockNo)->exists());

            $stockItem = StockItem::create([
                'stock_no' => $stockNo,
                'item_name' => $validated['item_name'],
                'description' => $validated['description'] ?? null,
            ]);

            // No unit assigned yet — units() pivot stays empty until edited
            // properly in the Stock Items page.

            return response()->json([
                'stock_no' => $stockItem->stock_no,
                'item_name' => $stockItem->item_name,
                'description' => $stockItem->description,
            ]);
        }
}