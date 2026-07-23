<?php

namespace App\Http\Controllers;

use App\Models\ForDisposalMonitoring;
use App\Models\PreRepairMonitoring;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ForDisposalController extends Controller
{
    /**
     * Display the for-disposal page.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');

        $query = ForDisposalMonitoring::query();

        if ($search) {
            $query->where('transaction_no', 'like', "%{$search}%")
                  ->orWhere('pre_repair_no', 'like', "%{$search}%")
                  ->orWhere('property_no', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        $data = $query->latest()->paginate(10)->withQueryString();

        $preRepairs = PreRepairMonitoring::all();

        return Inertia::render('for-disposal-monitoring/index', [
            'data' => $data,
            'filters' => $request->only(['search']),
            'preRepairs' => $preRepairs,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_no' => 'required|string|max:50|unique:for_disposal_monitoring',
            'pre_repair_no' => 'required|string|max:50',
            'from_accountable_officer' => 'required|string|max:100',
            'to_accountable_officer' => 'required|string|max:100',
            'property_no' => 'required|string|max:50',
            'description' => 'required|string',
            'amount' => 'required|numeric',
            'condition_of_ppe' => 'required|string|max:50',
            'location' => 'required|string|max:100',
        ]);

        ForDisposalMonitoring::create($validated);

        return redirect()->back()->with('success', 'For Disposal record created successfully.');
    }

    public function update(Request $request, $id)
    {
        $forDisposal = ForDisposalMonitoring::findOrFail($id);

        $validated = $request->validate([
            'transaction_no' => 'required|string|max:50|unique:for_disposal_monitoring,transaction_no,' . $id,
            'pre_repair_no' => 'required|string|max:50',
            'from_accountable_officer' => 'required|string|max:100',
            'to_accountable_officer' => 'required|string|max:100',
            'property_no' => 'required|string|max:50',
            'description' => 'required|string',
            'amount' => 'required|numeric',
            'condition_of_ppe' => 'required|string|max:50',
            'location' => 'required|string|max:100',
        ]);

        $forDisposal->update($validated);

        return redirect()->back()->with('success', 'For Disposal record updated successfully.');
    }

    public function destroy($id)
    {
        $forDisposal = ForDisposalMonitoring::findOrFail($id);
        $forDisposal->delete();

        return redirect()->back()->with('success', 'For Disposal record deleted successfully.');
    }
}
