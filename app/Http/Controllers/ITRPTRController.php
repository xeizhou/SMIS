<?php

namespace App\Http\Controllers;

use App\Models\ItrPtrMonitoring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\PreRepairMonitoring;
use App\Models\ForDisposalMonitoring;
use Inertia\Inertia;

class ITRPTRController extends Controller
{
    /**
     * Display the ITR-PTR page.
     */
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->input('search');
        $condition_of_ppe = $request->input('condition_of_ppe');

        $query = ItrPtrMonitoring::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('transaction_no', 'like', "%{$search}%")
                  ->orWhere('property_no', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('claimed_by', 'like', "%{$search}%");
            });
        }

        if ($condition_of_ppe) {
            $query->where('condition_of_ppe', $condition_of_ppe);
        }

        $data = $query->latest()->paginateWithHighlight($perPage)->withQueryString();

        return Inertia::render('itr-ptr-monitoring/index', [
            'data' => $data,
            'filters' => $request->only(['search', 'condition_of_ppe']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaction_no' => 'required|string|max:50|unique:itr_ptr_monitoring',
            'date_release' => 'required|date',
            'claimed_by' => 'required|string|max:100',
            'from_accountable_officer' => 'required|string|max:100',
            'to_accountable_officer' => 'required|string|max:100',
            'property_no' => 'required|string|max:50',
            'description' => 'required|string',
            'amount' => 'required|numeric',
            'condition_of_ppe' => 'required|string|max:50',
            'location' => 'required|string|max:100',
            'date_received' => 'required|date',
            'remarks' => 'nullable|string',
        ]);

        ItrPtrMonitoring::create($validated);

        return redirect()->back()->with('success', 'ITR/PTR record added successfully.');
    }

    public function update(Request $request, $id)
    {
        $itrPtr = ItrPtrMonitoring::findOrFail($id);

        $validated = $request->validate([
            'transaction_no' => 'required|string|max:50|unique:itr_ptr_monitoring,transaction_no,' . $id,
            'date_release' => 'required|date',
            'claimed_by' => 'required|string|max:100',
            'from_accountable_officer' => 'required|string|max:100',
            'to_accountable_officer' => 'required|string|max:100',
            'property_no' => 'required|string|max:50',
            'description' => 'required|string',
            'amount' => 'required|numeric',
            'condition_of_ppe' => 'required|string|max:50',
            'location' => 'required|string|max:100',
            'date_received' => 'required|date',
            'remarks' => 'nullable|string',
        ]);

        Schema::disableForeignKeyConstraints();

        try {
            DB::transaction(function () use ($itrPtr, $validated) {
                $oldTransactionNo = $itrPtr->transaction_no;
                $oldPropertyNo = $itrPtr->property_no;
                $newTransactionNo = $validated['transaction_no'];
                $newPropertyNo = $validated['property_no'];

                if ($oldTransactionNo !== $newTransactionNo || $oldPropertyNo !== $newPropertyNo) {
                    // Update Pre-Repair records
                    PreRepairMonitoring::where('transaction_no', $oldTransactionNo)
                        ->where('property_no', $oldPropertyNo)
                        ->update([
                            'transaction_no' => $newTransactionNo,
                            'property_no' => $newPropertyNo,
                        ]);

                    // Update For Disposal records
                    ForDisposalMonitoring::where('transaction_no', $oldTransactionNo)
                        ->where('property_no', $oldPropertyNo)
                        ->update([
                            'transaction_no' => $newTransactionNo,
                            'property_no' => $newPropertyNo,
                        ]);

                    $itrPtr->update($validated);
                } else {
                    $itrPtr->update($validated);
                }
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        return redirect()->back()->with('success', 'ITR/PTR record updated successfully.');
    }

    public function destroy($id)
    {
        $itrPtr = ItrPtrMonitoring::findOrFail($id);
        
        DB::transaction(function () use ($itrPtr) {
            // Delete For Disposal records first (bottom of hierarchy)
            ForDisposalMonitoring::where('transaction_no', $itrPtr->transaction_no)
                ->where('property_no', $itrPtr->property_no)
                ->delete();

            // Delete Pre-Repair records next
            PreRepairMonitoring::where('transaction_no', $itrPtr->transaction_no)
                ->where('property_no', $itrPtr->property_no)
                ->delete();

            // Delete the parent
            $itrPtr->delete();
        });

        return redirect()->back()->with('success', 'ITR/PTR record archived successfully.');
    }
}
