<?php

namespace App\Http\Controllers;

use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class POLetterMonitoringController extends Controller
{
    /**
     * Display the PO Letter Monitoring page.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;
        $type = $request->string('type')->toString() ?: null;

        $poLetters = PoLetterMonitoring::query()
        ->with([
            'supplier:supplier_id,supplier_name',
            // Needed so date_received_by_supplier / due_date /
            // delivery_term / item_description accessors resolve
            // without N+1 queries.
            'servePo:po_number,po_received_date,due_date,item_description',
        ])
        ->when($search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('po_number', 'like', "%{$search}%")
                    ->orWhere('office_end_user', 'like', "%{$search}%")
                    ->orWhere('received_by', 'like', "%{$search}%")
                    ->orWhereHas('supplier', fn ($supplierQuery) => $supplierQuery->where('supplier_name', 'like', "%{$search}%"));
            });
        })
        ->when($status, fn ($query, $status) => $query->where('status_of_the_letter', $status))
        ->when($type, fn ($query, $type) => $query->where('type_of_letter', $type))
        ->orderByDesc('created_at')
        ->paginate(10)
        ->withQueryString();

        return Inertia::render('po-letter-monitoring/index', [
            'poLetters' => $poLetters,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'type' => $type,
            ],
            'suppliers' => Supplier::select('supplier_id', 'supplier_name')
                ->orderBy('supplier_name')
                ->get(),
            'poNumbers' => ServePo::select('po_number', 'supplier_id', 'po_received_date', 'due_date')
                ->orderBy('po_number')
                ->get(),
        ]);
    }

    /**
     * Store a newly created PO letter monitoring record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'reference_no' => ['nullable', 'string', 'max:50'],
            'supplier_id' => ['nullable', 'exists:supplier_list,supplier_id'],
            'po_number' => ['required', 'string', 'exists:serve_po,po_number'],
            'po_date' => ['required', 'date'],
            'date_received_by_supplier' => ['nullable', 'date'],
            'delivery_term' => ['nullable', 'integer', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'office_end_user' => ['required', 'string', 'max:100'],
            'type_of_letter' => ['required', 'string', 'in:EXTENSION,WAIVER,CANCELLATION,REPLACEMENT/ALTERNATIVE OFFER'],
            'date_received_by_smu' => ['nullable', 'date'],
            'date_forwarded_to_ovpad' => ['nullable', 'date'],
            'received_by' => ['nullable', 'string', 'max:50'],
            'status_of_the_letter' => ['required', 'string', 'max:50'],
            'document_link' => ['nullable', 'string', 'max:500'],
            'date_forwarded_to_end_user' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ]);

        PoLetterMonitoring::create($validated);

        return redirect()->back();
    }

    /**
     * Update the specified PO letter monitoring record.
     */
    public function update(Request $request, PoLetterMonitoring $poLetterMonitoring): RedirectResponse
    {
        $validated = $request->validate([
            'reference_no' => ['nullable', 'string', 'max:50'],
            'supplier_id' => ['nullable', 'exists:supplier_list,supplier_id'],
            'po_number' => ['required', 'string', 'exists:serve_po,po_number'],
            'po_date' => ['required', 'date'],
            'date_received_by_supplier' => ['nullable', 'date'],
            'delivery_term' => ['nullable', 'integer', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'office_end_user' => ['required', 'string', 'max:100'],
            'type_of_letter' => ['required', 'string', 'in:EXTENSION,WAIVER,CANCELLATION,REPLACEMENT/ALTERNATIVE OFFER'],
            'date_received_by_smu' => ['nullable', 'date'],
            'date_forwarded_to_ovpad' => ['nullable', 'date'],
            'received_by' => ['nullable', 'string', 'max:50'],
            'status_of_the_letter' => ['required', 'string', 'max:50'],
            'document_link' => ['nullable', 'string', 'max:500'],
            'date_forwarded_to_end_user' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ]);

        $poLetterMonitoring->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified PO letter monitoring record.
     */
    public function destroy(PoLetterMonitoring $poLetterMonitoring): RedirectResponse
    {
        $poLetterMonitoring->delete();

        return redirect()->back();
    }
}
