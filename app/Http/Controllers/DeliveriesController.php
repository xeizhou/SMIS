<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\ServePo;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeliveriesController extends Controller
{
    /**
     * Display the Deliveries page.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;
        $poNumber = $request->string('po_number')->toString() ?: null;

        $deliveries = Delivery::query()
            ->with(['supplier:supplier_id,supplier_name', 'servePo:po_number,total_amount_po,end_user,due_date,po_received_date,supplier_id'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('delivery_id', 'like', "%{$search}%")
                        ->orWhere('po_number', 'like', "%{$search}%")
                        ->orWhere('place_of_delivery', 'like', "%{$search}%")
                        ->orWhere('received_by_1', 'like', "%{$search}%")
                        ->orWhere('received_by_2', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('supplier', fn ($supplierQuery) => $supplierQuery->where('supplier_name', 'like', "%{$search}%"));
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->when($poNumber, fn ($query, $poNumber) => $query->where('po_number', $poNumber))
            ->orderByDesc('data_entry_timestamp')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('deliveries/index', [
            'deliveries' => $deliveries,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'po_number' => $poNumber,
            ],
            'purchaseOrders' => ServePo::query()
                ->select(['po_number', 'supplier_id', 'total_amount_po', 'end_user', 'due_date', 'po_received_date'])
                ->with(['supplier:supplier_id,supplier_name'])
                ->orderBy('po_number')
                ->get(),
            'statuses' => ['PENDING', 'PARTIAL', 'COMPLETED', 'CANCELLED'],
            'suppliers' => Supplier::select('supplier_id', 'supplier_name')
                ->orderBy('supplier_name')
                ->get(),
        ]);
    }

    /**
     * Store a newly created delivery.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'po_number' => ['required', 'string', 'max:50', 'exists:serve_po,po_number'],
            'supplier_id' => ['nullable', 'exists:supplier_list,supplier_id'],
            'delivery_date' => ['nullable', 'date'],
            'po_date_received' => ['nullable', 'date'],
            'delivery_term' => ['nullable', 'integer', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'no_of_days_ld' => ['nullable', 'integer', 'min:0'],
            'received_by_1' => ['nullable', 'string', 'max:150'],
            'received_by_2' => ['nullable', 'string', 'max:150'],
            'end_user' => ['nullable', 'string', 'max:150'],
            'place_of_delivery' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:50'],
            'remarks' => ['nullable', 'string'],
            'total_amount_delivered' => ['nullable', 'numeric', 'min:0'],
            'po_total_amount' => ['nullable', 'numeric', 'min:0'],
            'folder_link' => ['nullable', 'string', 'max:500'],
        ]);

        $validated['delivery_id'] = now()->format('YmdHis').'-'.substr(md5(uniqid()), 0, 6);
        $validated['total_amount_delivered'] ??= 0;
        $validated['po_total_amount'] ??= 0;

        Delivery::create($validated);

        return redirect()->back();
    }

    /**
     * Update the specified delivery.
     */
    public function update(Request $request, Delivery $delivery): RedirectResponse
    {
        $validated = $request->validate([
            'po_number' => ['required', 'string', 'max:50', 'exists:serve_po,po_number'],
            'supplier_id' => ['nullable', 'exists:supplier_list,supplier_id'],
            'delivery_date' => ['nullable', 'date'],
            'po_date_received' => ['nullable', 'date'],
            'delivery_term' => ['nullable', 'integer', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'no_of_days_ld' => ['nullable', 'integer', 'min:0'],
            'received_by_1' => ['nullable', 'string', 'max:150'],
            'received_by_2' => ['nullable', 'string', 'max:150'],
            'end_user' => ['nullable', 'string', 'max:150'],
            'place_of_delivery' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:50'],
            'remarks' => ['nullable', 'string'],
            'total_amount_delivered' => ['nullable', 'numeric', 'min:0'],
            'po_total_amount' => ['nullable', 'numeric', 'min:0'],
            'folder_link' => ['nullable', 'string', 'max:500'],
        ]);

        $validated['total_amount_delivered'] ??= 0;
        $validated['po_total_amount'] ??= 0;

        $delivery->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified delivery.
     */
    public function destroy(Delivery $delivery): RedirectResponse
    {
        $delivery->delete();

        return redirect()->back();
    }
}
