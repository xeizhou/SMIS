<?php

namespace App\Http\Controllers;

use App\Models\RrspMonitoring;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RRSPController extends Controller
{
    public function index(Request $request)
    {
        $query = RrspMonitoring::query();

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('rrsp_no', 'like', "%{$search}%")
                    ->orWhere('item_description', 'like', "%{$search}%")
                    ->orWhere('property_no', 'like', "%{$search}%")
                    ->orWhere('end_user_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $rrspMonitorings = $query
            ->latest('date_received')
            ->paginate(10)
            ->withQueryString()
            ->through(function ($rrsp) {
                return [
                    'id' => $rrsp->id,
                    'rrspNo' => $rrsp->rrsp_no,
                    'dateReceived' => optional($rrsp->date_received)->toDateString(),
                    'itemDescription' => $rrsp->item_description,
                    'quantity' => $rrsp->quantity,
                    'propertyNo' => $rrsp->property_no,
                    'endUserName' => $rrsp->end_user_name,
                    'cost' => $rrsp->cost,
                    'kindOfSemiExpendable' => $rrsp->kind_of_semi_expendable,
                    'status' => $rrsp->status,
                    'area' => $rrsp->area,
                    'createdAt' => optional($rrsp->created_at)->toDateTimeString(),
                    'updatedAt' => optional($rrsp->updated_at)->toDateTimeString(),
                ];
            });

        $statuses = RrspMonitoring::whereNotNull('status')
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
            'itemDescription' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'propertyNo' => 'nullable|string|max:255',
            'endUserName' => 'nullable|string|max:255',
            'cost' => 'nullable|numeric|min:0',
            'kindOfSemiExpendable' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:100',
            'area' => 'nullable|string|max:255',
        ]);

        RrspMonitoring::create([
            'rrsp_no' => $validated['rrspNo'],
            'date_received' => $validated['dateReceived'],
            'item_description' => $validated['itemDescription'],
            'quantity' => $validated['quantity'],
            'property_no' => $validated['propertyNo'],
            'end_user_name' => $validated['endUserName'],
            'cost' => $validated['cost'],
            'kind_of_semi_expendable' => $validated['kindOfSemiExpendable'],
            'status' => $validated['status'],
            'area' => $validated['area'],
        ]);

        return back()->with('success', 'RRSP record created successfully.');
    }

    public function update(Request $request, RrspMonitoring $rrsp)
    {
        $validated = $request->validate([
            'rrspNo' => 'required|string|max:255|unique:rrsp_monitoring,rrsp_no,' . $rrsp->id,
            'dateReceived' => 'nullable|date',
            'itemDescription' => 'required|string',
            'quantity' => 'required|integer|min:1',
            'propertyNo' => 'nullable|string|max:255',
            'endUserName' => 'nullable|string|max:255',
            'cost' => 'nullable|numeric|min:0',
            'kindOfSemiExpendable' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:100',
            'area' => 'nullable|string|max:255',
        ]);

        $rrsp->update([
            'rrsp_no' => $validated['rrspNo'],
            'date_received' => $validated['dateReceived'],
            'item_description' => $validated['itemDescription'],
            'quantity' => $validated['quantity'],
            'property_no' => $validated['propertyNo'],
            'end_user_name' => $validated['endUserName'],
            'cost' => $validated['cost'],
            'kind_of_semi_expendable' => $validated['kindOfSemiExpendable'],
            'status' => $validated['status'],
            'area' => $validated['area'],
        ]);

        return back()->with('success', 'RRSP record updated successfully.');
    }

    public function destroy(Request $request, $rrsp)
    {
        $record = RrspMonitoring::where('rrsp_no', $rrsp)->firstOrFail();
        $record->delete();

        return back()->with('success', 'RRSP record deleted successfully.');
    }
}