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
        $perPage = $request->integer('per_page', 10);
        $search = $request->input('search');
        $source_type = $request->input('source_type');
        $sortField = $request->string('sort_field')->toString();
        $sortDirection = $request->string('sort_direction')->toString() === 'desc' ? 'desc' : 'asc';
        $sorts = ['transaction_no', 'pre_repair_no', 'property_no', 'description', 'location', 'amount', 'created_at'];

        $query = ForDisposalMonitoring::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('transaction_no', 'like', "%{$search}%")
                  ->orWhere('pre_repair_no', 'like', "%{$search}%")
                  ->orWhere('property_no', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($source_type && $source_type !== 'all') {
            $query->where('source_type', $source_type);
        }

        $data = $query->when(in_array($sortField, $sorts, true), fn ($q) => $q->orderBy($sortField, $sortDirection), fn ($q) => $q->latest())->paginateWithHighlight($perPage)->withQueryString();

        $preRepairs = PreRepairMonitoring::all();

        return Inertia::render('for-disposal-monitoring/index', [
            'data' => $data,
            'filters' => array_merge($request->only(['search', 'source_type']), ['sort_field' => $sortField ?: null, 'sort_direction' => $sortDirection]),
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
            'remarks' => 'nullable|string',
            'location' => 'required|string|max:100',
        ]);

        ForDisposalMonitoring::create($validated);

        return redirect()->back()->with('success', 'For Disposal record added successfully.');
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
            'remarks' => 'nullable|string',
            'location' => 'required|string|max:100',
        ]);

        // Cascade ALL fields to PreRepair since they are linked.
        $oldTransactionNo = $forDisposal->transaction_no;
        $oldPreRepairNo = $forDisposal->pre_repair_no;
        $oldPropertyNo = $forDisposal->property_no;

        \App\Models\PreRepairMonitoring::where('pre_repair_no', $oldPreRepairNo)
            ->where('transaction_no', $oldTransactionNo)
            ->where('property_no', $oldPropertyNo)
            ->update($validated);

        $forDisposal->update($validated);

        return redirect()->back()->with('success', 'For Disposal record updated successfully.');
    }

    public function destroy(\Illuminate\Http\Request $request, $id)
    {
        $forDisposal = ForDisposalMonitoring::findOrFail($id);

        if ($forDisposal->source_type && $forDisposal->source_id) {
            $sourceModel = null;
            $sourceName = '';

            if (str_contains(strtolower($forDisposal->source_type), 'rrsp')) {
                $sourceModel = \App\Models\RrspItem::find($forDisposal->source_id);
                $sourceName = 'RRSP';
            } elseif (str_contains(strtolower($forDisposal->source_type), 'rrppe')) {
                $sourceModel = \App\Models\RrppeItem::find($forDisposal->source_id) ?? \App\Models\RRPPEMonitoring::find($forDisposal->source_id);
                $sourceName = 'RRPPE';
            }

            if ($sourceModel) {
                $identifier = $sourceModel->property_no ?? $sourceModel->rrppe_no ?? $forDisposal->property_no;
                $parentContext = '';

                if (str_contains(strtolower($forDisposal->source_type), 'rrsp')) {
                    $parent = \App\Models\RrspMonitoring::find($sourceModel->rrsp_monitoring_id);
                    if ($parent) {
                        $parentContext = " (from {$parent->rrsp_no})";
                    }
                } elseif (str_contains(strtolower($forDisposal->source_type), 'rrppe')) {
                    if (isset($sourceModel->rrppe_monitoring_id)) {
                        $parent = \App\Models\RRPPEMonitoring::find($sourceModel->rrppe_monitoring_id);
                        if ($parent) {
                            $parentContext = " (from {$parent->rrppe_no})";
                        }
                    }
                }

                return redirect()->back()->with('error', "This For Disposal record has linked records. Please remove them first:\n1 Linked {$sourceName}\n- Property No.: {$identifier}{$parentContext}");
            }
        }

        $forDisposal->archiveMetadata()->create([
            'identity_document' => $forDisposal->property_no,
            'archived_from' => 'Assets > For Disposal Monitoring',
            'archived_by' => $request->user()?->id,
        ]);

        $forDisposal->delete();

        return redirect()->back()->with('success', 'For Disposal record archived successfully.');
    }
}
