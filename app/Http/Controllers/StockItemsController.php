<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockItemsController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        
        // 1. Get the sorting parameters (defaulting to created_at descending if none provided)
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        // 2. Validate the sort field to prevent SQL injection
        $allowedSorts = ['stock_no', 'item_name', 'description', 'created_at'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'created_at';
        }

        // Validate the sort direction
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $query = StockItem::with(['units'])
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('stock_no', 'like', "%{$search}%")
                        ->orWhere('item_name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            });

        // 3. Apply the dynamic sorting
        $stockItems = $query->orderBy($sortField, $sortDirection)
            ->paginateWithHighlight(10)
            ->withQueryString();

        return Inertia::render('stock-items/index', [
            'stockItems' => $stockItems,
            // Lists used in filters: show newest entries first where applicable
            'units' => Unit::orderByDesc('unitID')->get(),
            'filters' => [
                'search' => $search,
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
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',

            // Validation for the units array
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
}