<?php

namespace App\Http\Controllers;

use App\Models\RRPPEMonitoring;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RRPPEController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $query = RRPPEMonitoring::with('items');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('rrppe_no', 'like', "%{$search}%")
                    ->orWhere('end_user_name', 'like', "%{$search}%")
                    ->orWhereHas('items', function ($q2) use ($search) {
                        $q2->where('item_description', 'like', "%{$search}%")
                           ->orWhere('property_no', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->whereHas('items', function ($q) use ($request) {
                $q->where('status', $request->input('status'));
            });
        }

        $data = $query->latest()
            ->paginateWithHighlight($perPage)
            ->withQueryString()
            ->through(function ($rrppe) {
                return [
                    'id' => $rrppe->id,
                    'rrppeNo' => $rrppe->rrppe_no,
                    'dateReceived' => optional($rrppe->date_received)->toDateString(),
                    'endUserName' => $rrppe->end_user_name,
                    'returnBy' => $rrppe->return_by,
                    'createdAt' => optional($rrppe->created_at)->toDateTimeString(),
                    'updatedAt' => optional($rrppe->updated_at)->toDateTimeString(),
                    'items' => $rrppe->items->map(function ($i) {
                        return [
                            'id' => $i->id,
                            'stockNo' => $i->stock_no,
                            'itemName' => $i->item_name,
                            'itemDescription' => $i->item_description,
                            'quantity' => $i->quantity,
                            'propertyNo' => $i->property_no,
                            'cost' => $i->cost,
                            'status' => $i->status,
                            'area' => $i->area,
                            'remarks' => $i->remarks,
                        ];
                    }),
                ];
            });

        $statuses = \App\Models\RrppeItem::whereNotNull('status')
            ->distinct()
            ->pluck('status')
            ->sort()
            ->values();

        $areas = \App\Models\Area::orderBy('name')->pluck('name');

        $stockItems = \App\Models\StockItem::orderBy('item_name')
            ->get(['stock_no', 'item_name', 'description']);

        return Inertia::render('rrppe-monitoring/index', [
            'data' => $data,
            'filters' => $request->only(['search', 'status']),
            'statuses' => $statuses,
            'areas' => $areas,
            'stockItems' => $stockItems,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'rrppeNo' => 'required|string|max:50',
            'dateReceived' => 'required|date',
            'endUserName' => 'nullable|string|max:100',
            'returnBy' => 'nullable|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.stockNo' => 'required|string|exists:stock_items,stock_no',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.propertyNo' => 'required|string|max:50',
            'items.*.cost' => 'nullable|numeric',
            'items.*.status' => 'nullable|string|max:50',
            'items.*.area' => 'nullable|string|max:100',
            'items.*.remarks' => 'nullable|string',
        ]);

        $rrppe = RRPPEMonitoring::create([
            'rrppe_no' => $validated['rrppeNo'],
            'date_received' => $validated['dateReceived'],
            'end_user_name' => $validated['endUserName'],
            'return_by' => $validated['returnBy'],
        ]);

        foreach ($validated['items'] as $item) {
            $stockItem = \App\Models\StockItem::findOrFail($item['stockNo']);

            $rrppe->items()->create([
                'stock_no' => $stockItem->stock_no,
                'item_name' => $stockItem->item_name,
                'item_description' => $stockItem->description,
                'quantity' => $item['quantity'],
                'property_no' => $item['propertyNo'],
                'cost' => $item['cost'] ?? null,
                'status' => $item['status'],
                'area' => $item['area'],
                'remarks' => $item['remarks'] ?? null,
            ]);
        }
        return redirect()->back()->with('success', 'RRPPE record added successfully.');
    }

    public function update(Request $request, $id)
    {
        $record = RRPPEMonitoring::findOrFail($id);

        $validated = $request->validate([
            'rrppeNo' => 'required|string|max:50',
            'dateReceived' => 'required|date',
            'endUserName' => 'nullable|string|max:100',
            'returnBy' => 'nullable|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.stockNo' => 'required|string|exists:stock_items,stock_no',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.propertyNo' => 'required|string|max:50',
            'items.*.cost' => 'nullable|numeric',
            'items.*.status' => 'nullable|string|max:50',
            'items.*.area' => 'nullable|string|max:100',
            'items.*.remarks' => 'nullable|string',
        ]);

        $record->update([
            'rrppe_no' => $validated['rrppeNo'],
            'date_received' => $validated['dateReceived'],
            'end_user_name' => $validated['endUserName'],
            'return_by' => $validated['returnBy'],
        ]);

        foreach ($record->items as $item) {
            $item->delete();
        }

        foreach ($validated['items'] as $item) {
            $stockItem = \App\Models\StockItem::findOrFail($item['stockNo']);

            $record->items()->create([
                'stock_no' => $stockItem->stock_no,
                'item_name' => $stockItem->item_name,
                'item_description' => $stockItem->description,
                'quantity' => $item['quantity'],
                'property_no' => $item['propertyNo'],
                'cost' => $item['cost'] ?? null,
                'status' => $item['status'],
                'area' => $item['area'],
                'remarks' => $item['remarks'] ?? null,
            ]);
        }

        $record->touch();

        return redirect()->back()->with('success', 'RRPPE record updated successfully.');
    }

        public function destroy($id)
    {
        $record = RRPPEMonitoring::findOrFail($id);
        foreach ($record->items as $item) {
            $item->delete();
        }
        $record->delete();

        return redirect()->back()->with('success', 'RRPPE record archived successfully.');
    }
}
