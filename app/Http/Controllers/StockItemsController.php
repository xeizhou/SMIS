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

        $query = StockItem::with(['units'])
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('stock_no', 'like', "%{$search}%")
                        ->orWhere('item_name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            });

        // Show newest stock items first
        $stockItems = $query->orderByDesc('created_at')
            ->paginateWithHighlight(10)
            ->withQueryString();

        return Inertia::render('stock-items/index', [
            'stockItems' => $stockItems,
            // Lists used in filters: show newest entries first where applicable
            'units' => Unit::orderByDesc('unitID')->get(),
            'filters' => [
                'search' => $search,
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

        return redirect()->back();
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

        return redirect()->back();
    }

    public function destroy(StockItem $stockItem)
        {
            try {
                $stockItem->delete();
            } catch (\Illuminate\Database\QueryException $e) {
                return back()->with('error', 'Cannot delete this stock item — it is referenced by transaction records.');
            }

            return redirect()->route('stock-items.index')->with('success', 'Stock item deleted.');
        }
}
