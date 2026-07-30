<?php

namespace App\Http\Controllers;

use App\Models\PirMonitoring;
use App\Models\Supplier;
use App\Models\FundCluster;
use App\Models\Office;
use App\Models\ServePo;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IARController extends Controller
{
    /**
     * Display the PIR (IAR) page.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');

        $query = PirMonitoring::with(['supplier', 'fundCluster'])
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('po_number', 'like', "%{$search}%")
                        ->orWhere('invoice_number', 'like', "%{$search}%")
                        ->orWhere('iar_number', 'like', "%{$search}%")
                        ->orWhere('ris_number', 'like', "%{$search}%");
                });
            });

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $pirs = $query->orderBy('pir_id', 'desc')
            ->paginate(10)
            ->withQueryString();

        // Avoid key collision: relation "fundCluster" snake-cases to "fund_cluster",
        // which clobbers the raw FK column of the same name in JSON output.
        $pirs->getCollection()->transform(function ($pir) {
            $pir->fund_cluster_raw = $pir->getAttributes()['fund_cluster'];
            $pir->fund_cluster_detail = $pir->fundCluster;
            return $pir;
        });

        return Inertia::render('iar/index', [
            'pirs' => $pirs,
            'suppliers' => Supplier::orderByDesc('supplier_id')->get(),
            'fundClusters' => FundCluster::orderByDesc('created_at')->get(),
            'offices' => Office::orderByDesc('office_code')->get(),
            'purchaseOrders' => ServePo::select(
                'po_number',
                'po_date',
                'po_received_date',   // <-- add this
                'due_date',           // <-- add this
                'pr_number',
                'pr_date',
                'ors_burs_no',
                'ors_burs_date',
                'total_amount_po',
                'fund_cluster_id',
                'supplier_id',
                'end_user'
            )->orderByDesc('created_at')->get(),
            'filters' => [
                'search' => $search,
                'status' => $request->input('status', 'all'),
            ],
        ]);
    }

    /**
     * Store a newly created PIR record.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:supplier_list,supplier_id',
            'po_number' => 'required|string|max:255',
            'unit_office' => 'required|string|max:255',
            'po_date' => 'nullable|date',
            'delivery_term' => 'nullable|integer',
            'fund_cluster' => 'nullable|string|exists:fund_clusters,fund_cluster_id',
            'pr_number' => 'nullable|string|max:255',
            'pr_date' => 'nullable|date',
            'ors_bur_number' => 'nullable|string|max:255',
            'ors_bur_date' => 'nullable|date',
            'po_amount' => 'nullable|numeric|min:0',
            'date_forwarded_supplier' => 'nullable|date',
            'forwarded_by_supplier' => 'nullable|string|max:255',
            'claimed_by_supplier' => 'nullable|string|max:255',
            'supplier_signature_date' => 'nullable|date',
            'date_forwarded_coa' => 'nullable|date',
            'forwarded_by_coa' => 'nullable|string|max:255',
            'date_returned_from_coa' => 'nullable|date',
            'coa_date' => 'nullable|date',
            'claim_date' => 'nullable|date',
            'claimed_by_coa' => 'nullable|string|max:255',
            'date_received_by_supplier' => 'nullable|date',
            'invoice_number' => 'nullable|string|max:255',
            'invoice_date' => 'nullable|date',
            'delivery_receipt' => 'nullable|string|max:255',
            'date_completed' => 'nullable|date',
            'par_ics_number' => 'nullable|string|max:255',
            'ris_number' => 'nullable|string|max:255',
            'inspected_by' => 'nullable|string|max:255',
            'inspection_date' => 'nullable|date',
            'iar_number' => 'nullable|string|max:255',
            'date_forwarded_to_finance' => 'nullable|date',
            'receipt_receiving_date' => 'nullable|date',
            'receipt_claimed_by' => 'nullable|string|max:255',
            'items_receiving_date' => 'nullable|date',
            'items_claimed_by' => 'nullable|string|max:255',
            'notify_receipt' => 'nullable|string',
            'notify_call' => 'nullable|string',
            'notify_email' => 'nullable|string',
            'status' => 'required|in:COMPLETED,CANCELLED',
            'remarks' => 'nullable|string',
        ]);

        PirMonitoring::create($validated);

        return redirect()->back();
    }

    /**
     * Update the specified PIR record.
     */
    public function update(Request $request, PirMonitoring $pirMonitoring)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:supplier_list,supplier_id',
            'po_number' => 'required|string|max:255',
            'unit_office' => 'required|string|max:255',
            'po_date' => 'nullable|date',
            'delivery_term' => 'nullable|integer',
            'fund_cluster' => 'nullable|string|exists:fund_clusters,fund_cluster_id',
            'pr_number' => 'nullable|string|max:255',
            'pr_date' => 'nullable|date',
            'ors_bur_number' => 'nullable|string|max:255',
            'ors_bur_date' => 'nullable|date',
            'po_amount' => 'nullable|numeric|min:0',
            'date_forwarded_supplier' => 'nullable|date',
            'forwarded_by_supplier' => 'nullable|string|max:255',
            'claimed_by_supplier' => 'nullable|string|max:255',
            'supplier_signature_date' => 'nullable|date',
            'date_forwarded_coa' => 'nullable|date',
            'forwarded_by_coa' => 'nullable|string|max:255',
            'date_returned_from_coa' => 'nullable|date',
            'coa_date' => 'nullable|date',
            'claim_date' => 'nullable|date',
            'claimed_by_coa' => 'nullable|string|max:255',
            'date_received_by_supplier' => 'nullable|date',
            'invoice_number' => 'nullable|string|max:255',
            'invoice_date' => 'nullable|date',
            'delivery_receipt' => 'nullable|string|max:255',
            'date_completed' => 'nullable|date',
            'par_ics_number' => 'nullable|string|max:255',
            'ris_number' => 'nullable|string|max:255',
            'inspected_by' => 'nullable|string|max:255',
            'inspection_date' => 'nullable|date',
            'iar_number' => 'nullable|string|max:255',
            'date_forwarded_to_finance' => 'nullable|date',
            'receipt_receiving_date' => 'nullable|date',
            'receipt_claimed_by' => 'nullable|string|max:255',
            'items_receiving_date' => 'nullable|date',
            'items_claimed_by' => 'nullable|string|max:255',
            'notify_receipt' => 'nullable|string',
            'notify_call' => 'nullable|string',
            'notify_email' => 'nullable|string',
            'status' => 'required|in:COMPLETED,CANCELLED',
            'remarks' => 'nullable|string',
        ]);

        $pirMonitoring->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified PIR record.
     */
    public function destroy(PirMonitoring $pirMonitoring)
    {
        try {
            $pirMonitoring->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            return back()->withErrors([
                'delete' => 'This PIR record cannot be deleted because it has related records.',
            ]);
        }

        return redirect()->back();
    }
}