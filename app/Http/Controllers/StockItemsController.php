<?php

namespace App\Http\Controllers;

use App\Models\StockItem;
use App\Models\Unit;
use App\Models\FundCluster;
use App\Models\Transaction;   
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockItemsController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->input('search');
        $fundClusterId = $request->input('fund_cluster_id');
        $needsAttention = $request->boolean('needs_attention');

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
            })
            ->when($needsAttention, function ($q) {
                $q->where('is_pending_setup', true);
            });

        // 3. Apply the dynamic sorting
        $textSorts = ['stock_no', 'item_name', 'description'];

        $query = in_array($sortField, $textSorts, true)
            ? $query->orderByRaw("LOWER({$sortField}) {$sortDirection}")
            : $query->orderBy($sortField, $sortDirection);

        $stockItems = $query->orderBy('stock_no')
            ->paginateWithHighlight($perPage)
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
                'per_page' => $perPage,
                'needs_attention' => $needsAttention,
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

        $stockItem = StockItem::create($request->except('units') + [
            'is_pending_setup' => false,
        ]);

        // Prepare data for the pivot table
        $syncData = [];
        foreach ($request->input('units') as $unit) {
            $syncData[$unit['unitID']] = ['is_default' => $unit['is_default']];
        }
        $stockItem->units()->sync($syncData);

        return redirect()->back()->with('success', 'Stock item added successfully.');
    }

    public function update(Request $request, StockItem $stockItem)
        {
            $validated = $request->validate([
            'stock_no' => 'required|string|max:255|unique:stock_items,stock_no,' . $stockItem->stock_no . ',stock_no',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'fund_cluster_id' => 'nullable|exists:fund_clusters,fund_cluster_id',
            'units' => 'required|array|min:1',
            'units.*.unitID' => 'required|exists:units,unitID',
            'units.*.is_default' => 'required|boolean',
        ]);

        $isStillTemp = str_starts_with($validated['stock_no'], 'TEMP-');

        // NEW: remember the stock_no before it gets changed
        $oldStockNo = $stockItem->stock_no;

        // NEW: everything below is wrapped in one DB transaction
       DB::transaction(function () use ($request, $stockItem, $isStillTemp, $oldStockNo) {
        // Capture the old default BEFORE anything changes
        $oldDefaultUnitID = $stockItem->units()
            ->wherePivot('is_default', true)
            ->first()?->unitID;

        $stockItem->update($request->except('units') + [
            'is_pending_setup' => $isStillTemp,
        ]);

        Transaction::whereIn('stock_no', [$oldStockNo, $stockItem->stock_no])
            ->update([
                'stock_no'    => $stockItem->stock_no,
                'item_name'   => $stockItem->item_name,
                'description' => $stockItem->description,
            ]);

        $syncData = [];
        foreach ($request->input('units') as $unit) {
            $syncData[$unit['unitID']] = ['is_default' => $unit['is_default']];
        }
        $stockItem->units()->sync($syncData);

        // If the default unit changed, move transactions that used the old default
        $newDefaultUnitID = collect($request->input('units'))
            ->firstWhere('is_default', true)['unitID'] ?? null;

        if ($oldDefaultUnitID && $newDefaultUnitID && (int) $oldDefaultUnitID !== (int) $newDefaultUnitID) {
            Transaction::where('stock_no', $stockItem->stock_no)
                ->where('unitID', $oldDefaultUnitID)
                ->update(['unitID' => $newDefaultUnitID]);
        }
    });

        return redirect()->back()->with('success', 'Stock item updated successfully.');
    }
    
    public function destroy(Request $request, StockItem $stockItem)
    {
        $poCount = $stockItem->purchaseOrders()->count();
        $transactionCount = $stockItem->transactions()->count();

        if ($poCount > 0 || $transactionCount > 0) {
            $parts = [];
            if ($poCount > 0) {
                $parts[] = "{$poCount} Linked Purchase Order" . ($poCount > 1 ? 's' : '');
            }
            if ($transactionCount > 0) {
                $parts[] = "{$transactionCount} Linked Transaction Record" . ($transactionCount > 1 ? 's' : '');
            }

            return redirect()->back()->with('error',
                "Cannot archive this stock item because it has linked records. Please remove them first:\n" . implode("\n", $parts)
            );
        }

        try {
            $stockItem->archiveMetadata()->create([
                'identity_document' => $stockItem->stock_no . ' — ' . $stockItem->item_name,
                'archived_from' => 'Stock Cards > Stock Items',
                'archived_by' => $request->user()?->id,
            ]);

            $stockItem->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000') {
                return back()->with('error', 'Cannot delete this stock item — it is referenced by transaction records.');
            }
            throw $e;
        }

        return redirect()->back()->with('success', 'Stock item archived successfully.');
    }

    public function quickAdd(Request $request)
    {
        $validated = $request->validate([
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'unitID' => 'nullable|exists:units,unitID',
            'new_unit_name' => 'nullable|required_with:new_unit_short_name|string|max:50',
            'new_unit_short_name' => 'nullable|required_with:new_unit_name|string|max:10',
            'require_unit' => 'nullable|boolean',
        ]);

        $hasUnit = !empty($validated['unitID']) || !empty($validated['new_unit_name']);

        if (!empty($validated['require_unit']) && !$hasUnit) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'unitID' => 'Unit is required.',
            ]);
        }

        do {
            $stockNo = 'TEMP-' . strtoupper(\Illuminate\Support\Str::random(6));
        } while (StockItem::where('stock_no', $stockNo)->exists());

        [$stockItem, $unit] = DB::transaction(function () use ($validated, $stockNo) {
            $unit = null;

            if (!empty($validated['new_unit_name'])) {
                $unit = Unit::create([
                    'unit_name' => $validated['new_unit_name'],
                    'unit_short_name' => $validated['new_unit_short_name'],
                ]);
            } elseif (!empty($validated['unitID'])) {
                $unit = Unit::findOrFail($validated['unitID']);
            }

            $stockItem = StockItem::create([
                'stock_no' => $stockNo,
                'item_name' => $validated['item_name'],
                'description' => $validated['description'] ?? null,
                'is_pending_setup' => true,
            ]);

            if ($unit) {
                $stockItem->units()->attach($unit->unitID, ['is_default' => true]);
            }

            return [$stockItem, $unit];
        });

        return response()->json([
            'stock_no' => $stockItem->stock_no,
            'item_name' => $stockItem->item_name,
            'description' => $stockItem->description,
            'unitID' => $unit?->unitID,
            'unit_name' => $unit?->unit_name,
            'unit_short_name' => $unit?->unit_short_name,
        ]);
    }
}