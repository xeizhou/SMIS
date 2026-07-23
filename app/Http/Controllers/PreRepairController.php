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

        $query = PreRepairMonitoring::query();

        if ($search) {
            $query->where('transaction_no', 'like', "%{$search}%")
                  ->orWhere('pre_repair_no', 'like', "%{$search}%")
                  ->orWhere('property_no', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        $data = $query->latest()->paginate(10)->withQueryString();

        $itrPtrs = ItrPtrMonitoring::all();

        return Inertia::render('pre-repair-monitoring/index', [
            'data' => $data,
            'filters' => $request->only(['search']),
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

                // If user fixed a typo in property_no (without re-linking to a new transaction)
                // Cascade UP to parent ITR/PTR and all siblings/children
                if ($oldTransactionNo === $newTransactionNo && $oldPropertyNo !== $newPropertyNo) {
                    \App\Models\ItrPtrMonitoring::where('transaction_no', $oldTransactionNo)
                        ->where('property_no', $oldPropertyNo)
                        ->update(['property_no' => $newPropertyNo]);

                    \App\Models\PreRepairMonitoring::where('transaction_no', $oldTransactionNo)
                        ->where('property_no', $oldPropertyNo)
                        ->where('id', '!=', $preRepair->id)
                        ->update(['property_no' => $newPropertyNo]);

                    \App\Models\ForDisposalMonitoring::where('transaction_no', $oldTransactionNo)
                        ->where('property_no', $oldPropertyNo)
                        ->update(['property_no' => $newPropertyNo]);
                }

                // If keys changed, repoint specific downstream ForDisposal records
                if ($oldTransactionNo !== $newTransactionNo || $oldPreRepairNo !== $newPreRepairNo || $oldPropertyNo !== $newPropertyNo) {
                    
                    // If we just globally updated property_no above, ForDisposal already has newPropertyNo
                    $targetPropertyNo = ($oldTransactionNo === $newTransactionNo && $oldPropertyNo !== $newPropertyNo) 
                        ? $newPropertyNo 
                        : $oldPropertyNo;

                    \App\Models\ForDisposalMonitoring::where('pre_repair_no', $oldPreRepairNo)
                        ->where('transaction_no', $oldTransactionNo)
                        ->where('property_no', $targetPropertyNo)
                        ->update([
                            'pre_repair_no' => $newPreRepairNo,
                            'transaction_no' => $newTransactionNo,
                            'property_no' => $newPropertyNo,
                        ]);
                }

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
            // Delete For Disposal records linked to this Pre-Repair
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
