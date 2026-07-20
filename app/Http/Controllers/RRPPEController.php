<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

use App\Models\RRPPEMonitoring;
use Illuminate\Http\Request;

class RRPPEController extends Controller
{
    public function index(Request $request)
    {
        $query = RRPPEMonitoring::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('rrppe_no', 'like', "%{$search}%")
                  ->orWhere('property_no', 'like', "%{$search}%")
                  ->orWhere('item_description', 'like', "%{$search}%")
                  ->orWhere('end_user_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $data = $query->latest()->get();
        return Inertia::render('rrppe-monitoring/index', [
            'data' => $data,
            'filters' => $request->only(['search', 'status'])
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'rrppe_no' => 'required|string|max:50',
            'date_received' => 'required|date',
            'item_description' => 'required|string',
            'quantity' => 'required|integer',
            'property_no' => 'required|string|max:50',
            'end_user_name' => 'nullable|string|max:100',
            'cost' => 'nullable|numeric',
            'status' => 'nullable|string|max:50',
            'area' => 'nullable|string|max:100',
            'remarks' => 'nullable|string',
        ]);

        RRPPEMonitoring::create($validated);

        return redirect()->back()->with('success', 'RRPPE record created successfully.');
    }

    public function update(Request $request, $id)
    {
        $record = RRPPEMonitoring::findOrFail($id);

        $validated = $request->validate([
            'rrppe_no' => 'required|string|max:50',
            'date_received' => 'required|date',
            'item_description' => 'required|string',
            'quantity' => 'required|integer',
            'property_no' => 'required|string|max:50',
            'end_user_name' => 'nullable|string|max:100',
            'cost' => 'nullable|numeric',
            'status' => 'nullable|string|max:50',
            'area' => 'nullable|string|max:100',
            'remarks' => 'nullable|string',
        ]);

        $record->update($validated);

        return redirect()->back()->with('success', 'RRPPE record updated successfully.');
    }

    public function destroy($id)
    {
        $record = RRPPEMonitoring::findOrFail($id);
        $record->delete();

        return redirect()->back()->with('success', 'RRPPE record deleted successfully.');
    }
}