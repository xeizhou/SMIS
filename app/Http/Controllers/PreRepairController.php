<?php

namespace App\Http\Controllers;

use App\Models\PreRepairMonitoring;
use App\Models\ItrPtrMonitoring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\ForDisposalMonitoring;
use Inertia\Inertia;

class PreRepairController extends Controller
{
    /**
     * Display the Pre-Repair page.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $condition_of_ppe = $request->input('condition_of_ppe');

        $query = PreRepairMonitoring::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('transaction_no', 'like', "%{$search}%")
                  ->orWhere('pre_repair_no', 'like', "%{$search}%")
                  ->orWhere('property_no', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($condition_of_ppe) {
            $query->where('condition_of_ppe', $condition_of_ppe);
        }

        $data = $query->latest()->paginate(10)->withQueryString();

        $itrPtrs = ItrPtrMonitoring::all();

        return Inertia::render('pre-repair-monitoring/index', [
            'data' => $data,
            'filters' => $request->only(['search', 'condition_of_ppe']),
            'itrPtrs' => $itrPtrs,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_no' => 'required|string|max:50',
            'pre_repair_no' => 'required|string|max:50',
            'from_accountable_officer' => 'required|string|max:100',
            'to_accountable_officer' => 'required|string|max:100',
            'property_no' => 'required|string|max:50',
            'description' => 'required|string',
            'amount' => 'required|numeric',
            'condition_of_ppe' => 'required|string|max:50',
            'remarks' => 'nullable|string',
            'location' => 'required|string|max:100',
        ]);

        PreRepairMonitoring::create($validated);

        return redirect()->back()->with('success', 'Pre-Repair record created successfully.');
    }

    public function update(Request $request, $id)
    {
        $preRepair = PreRepairMonitoring::findOrFail($id);

        $validated = $request->validate([
            'transaction_no' => 'required|string|max:50',
            'pre_repair_no' => 'required|string|max:50',
            'from_accountable_officer' => 'required|string|max:100',
            'to_accountable_officer' => 'required|string|max:100',
            'property_no' => 'required|string|max:50',
            'description' => 'required|string',
            'amount' => 'required|numeric',
            'condition_of_ppe' => 'required|string|max:50',
            'remarks' => 'nullable|string',
            'location' => 'required|string|max:100',
        ]);

        Schema::disableForeignKeyConstraints();

        Schema::disableForeignKeyConstraints();

        try {
            DB::transaction(function () use ($preRepair, $validated) {
                $oldTransactionNo = $preRepair->transaction_no;
                $oldPreRepairNo = $preRepair->pre_repair_no;
                $oldPropertyNo = $preRepair->property_no;
                
                $newTransactionNo = $validated['transaction_no'];
                $newPreRepairNo = $validated['pre_repair_no'];
                $newPropertyNo = $validated['property_no'];

                // We cascade ALL fields to ForDisposal since they are still linked.
                \App\Models\ForDisposalMonitoring::where('pre_repair_no', $oldPreRepairNo)
                    ->where('transaction_no', $oldTransactionNo)
                    ->where('property_no', $oldPropertyNo)
                    ->update($validated);

                $preRepair->update($validated);
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        return redirect()->back()->with('success', 'Pre-Repair record updated successfully.');
    }

    public function destroy($id)
    {
        $preRepair = PreRepairMonitoring::findOrFail($id);
        
        DB::transaction(function () use ($preRepair) {
            // ITR/PTR is no longer connected, and ForDisposal records should NOT be automatically deleted (unless strictly requested)
            // Wait, "pre repair and for disposal are connected to each other".
            // If they are connected, deleting a Pre-Repair should probably still cascade delete the For-Disposal record, 
            // OR it should fail if it exists. Since SQLite doesn't natively cascade without PRAGMA foreign_keys = ON, 
            // I'll keep the manual cascade delete for ForDisposal to keep them "connected".
            ForDisposalMonitoring::where('pre_repair_no', $preRepair->pre_repair_no)
                ->where('transaction_no', $preRepair->transaction_no)
                ->where('property_no', $preRepair->property_no)
                ->delete();

            // Delete the Pre-Repair record
            $preRepair->delete();
        });

        return redirect()->back()->with('success', 'Pre-Repair record deleted successfully.');
    }
}
