<?php

namespace App\Http\Controllers;

use App\Models\RrspMonitoring;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RRSPController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $query = \App\Models\RrspMonitoring::with('items');

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('rrsp_no', 'like', "%{$search}%")
                    ->orWhere('end_user_name', 'like', "%{$search}%")
                    ->orWhereHas('items', function ($q2) use ($search) {
                        $q2->where('item_description', 'like', "%{$search}%")
                           ->orWhere('property_no', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->whereHas('items', function ($q) use ($request) {
                $q->where('status', $request->status);
            });
        }

        $rrspMonitorings = $query
            ->latest()
            ->paginateWithHighlight($perPage)
            ->withQueryString()
            ->through(function ($rrsp) {
                return [
                    'id' => $rrsp->id,
                    'rrspNo' => $rrsp->rrsp_no,
                    'dateReceived' => optional($rrsp->date_received)->toDateString(),
                    'endUserName' => $rrsp->end_user_name,
                    'createdAt' => optional($rrsp->created_at)->toDateTimeString(),
                    'updatedAt' => optional($rrsp->updated_at)->toDateTimeString(),
                    'items' => $rrsp->items->map(function ($i) {
                        return [
                            'id' => $i->id,
                            'itemDescription' => $i->item_description,
                            'quantity' => $i->quantity,
                            'propertyNo' => $i->property_no,
                            'cost' => $i->cost,
                            'status' => $i->status,
                            'kindOfSemiExpendable' => $i->kind_of_semi_expendable,
                            'area' => $i->area,
                            'remarks' => $i->remarks,
                        ];
                    }),
                ];
            });

        $statuses = \App\Models\RrspItem::whereNotNull('status')
            ->distinct()
            ->pluck('status')
            ->sort()
            ->values();

        return Inertia::render('rrsp-monitoring/index', [
            'rrspMonitorings' => $rrspMonitorings,
            'filters' => [
                'search' => $request->search,
                'status' => $request->status,
            ],
            'statuses' => $statuses,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'rrspNo' => 'required|string|max:255|unique:rrsp_monitoring,rrsp_no',
            'dateReceived' => 'nullable|date',
            'endUserName' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.itemDescription' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.propertyNo' => 'nullable|string|max:255',
            'items.*.cost' => 'nullable|numeric|min:0',
            'items.*.kindOfSemiExpendable' => 'nullable|string|max:255',
            'items.*.status' => 'nullable|string|max:100',
            'items.*.area' => 'nullable|string|max:255',
            'items.*.remarks' => 'nullable|string',
        ]);

        $rrsp = RrspMonitoring::create([
            'rrsp_no' => $validated['rrspNo'],
            'date_received' => $validated['dateReceived'],
            'end_user_name' => $validated['endUserName'],
        ]);

        foreach ($validated['items'] as $item) {
            $rrsp->items()->create([
                'item_description' => $item['itemDescription'],
                'quantity' => $item['quantity'],
                'property_no' => $item['propertyNo'],
                'cost' => $item['cost'],
                'kind_of_semi_expendable' => $item['kindOfSemiExpendable'],
                'status' => $item['status'],
                'area' => $item['area'],
                'remarks' => $item['remarks'] ?? null,
            ]);
        }

        return back()->with('success', 'RRSP record added successfully.');
    }

    public function update(Request $request, RrspMonitoring $rrsp)
    {
        $validated = $request->validate([
            'rrspNo' => 'required|string|max:255|unique:rrsp_monitoring,rrsp_no,'.$rrsp->id,
            'dateReceived' => 'nullable|date',
            'endUserName' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.itemDescription' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.propertyNo' => 'nullable|string|max:255',
            'items.*.cost' => 'nullable|numeric|min:0',
            'items.*.kindOfSemiExpendable' => 'nullable|string|max:255',
            'items.*.status' => 'nullable|string|max:100',
            'items.*.area' => 'nullable|string|max:255',
            'items.*.remarks' => 'nullable|string',
        ]);

        $rrsp->update([
            'rrsp_no' => $validated['rrspNo'],
            'date_received' => $validated['dateReceived'],
            'end_user_name' => $validated['endUserName'],
        ]);

        $rrsp->items()->delete();
        foreach ($validated['items'] as $item) {
            $rrsp->items()->create([
                'item_description' => $item['itemDescription'],
                'quantity' => $item['quantity'],
                'property_no' => $item['propertyNo'],
                'cost' => $item['cost'],
                'kind_of_semi_expendable' => $item['kindOfSemiExpendable'],
                'status' => $item['status'],
                'area' => $item['area'],
                'remarks' => $item['remarks'] ?? null,
            ]);
        }

        // Force an update to the parent's timestamp so the LogsActivity trait
        // always registers an 'updated' event, even if only the items changed.
        $rrsp->touch();

        return back()->with('success', 'RRSP record updated successfully.');
    }

    public function destroy(Request $request, $rrsp)
    {
        // Wait, $rrsp here might be ID or rrsp_no depending on route.
        // It's usually the ID if route model binding is used, but previous code was `where('rrsp_no', $rrsp)`.
        // Let's check web.php or just use ID. Wait, previous code was `$record = RrspMonitoring::where('rrsp_no', $rrsp)->firstOrFail();`
        // So the route sends `rrsp_no`?
        // Wait, the index table row previously returned 'id' => $rrsp->id, but in the frontend, they often use id for delete?
        // Let me just support both by checking if it's numeric, or change it to ID. Let's just find by ID.
        // Actually, if the frontend uses `rrspNo` to delete, I'll check by ID first, then fallback.
        $record = RrspMonitoring::where('id', $rrsp)->orWhere('rrsp_no', $rrsp)->firstOrFail();
        $record->delete();

        return back()->with('success', 'RRSP record archived successfully.');
    }
}
