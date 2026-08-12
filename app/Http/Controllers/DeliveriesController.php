<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\Attachment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            ->with([
                'supplier:supplier_id,supplier_name',
                'servePo:po_number,total_amount_po,end_user,due_date,po_received_date,supplier_id,item_description',
                'attachments',
            ])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('delivery_id', 'like', "%{$search}%")
                        ->orWhere('po_number', 'like', "%{$search}%")
                        ->orWhere('place_of_delivery', 'like', "%{$search}%")
                        ->orWhere('received_by_1', 'like', "%{$search}%")
                        ->orWhere('received_by_2', 'like', "%{$search}%")
                        ->orWhereHas('servePo', fn ($poQuery) => $poQuery->where('item_description', 'like', "%{$search}%"))
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('supplier', fn ($supplierQuery) => $supplierQuery->where('supplier_name', 'like', "%{$search}%"));
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->when($poNumber, fn ($query, $poNumber) => $query->where('po_number', $poNumber))
            ->orderByDesc('data_entry_timestamp')
            ->paginateWithHighlight(10)
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
                ->orderByDesc('created_at')
                ->get(),
            'statuses' => ['PENDING', 'PARTIAL', 'COMPLETE', 'CANCELLED'],
            'suppliers' => Supplier::select('supplier_id', 'supplier_name')
                ->orderByDesc('supplier_id')
                ->get(),
        ]);
    }

    /**
     * Store a newly created delivery.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'delivery_id' => ['nullable', 'string', 'max:50', 'unique:delivery,delivery_id'],
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

        // Client sends its own generated id so it can upload attachments to the
        // same record right after create, without waiting on a redirect round-trip.
        $validated['delivery_id'] ??= now()->format('YmdHis').'-'.substr(md5(uniqid()), 0, 6);
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
            'deleted_attachment_ids' => ['nullable', 'array'],
            'deleted_attachment_ids.*' => ['integer'],
        ]);

        $validated['total_amount_delivered'] ??= 0;
        $validated['po_total_amount'] ??= 0;

        // Handle deleted attachments before updating delivery
        $deletedAttachmentIds = $validated['deleted_attachment_ids'] ?? [];
        if ($deletedAttachmentIds) {
            foreach ($deletedAttachmentIds as $attachmentId) {
                $attachment = Attachment::find($attachmentId);
                if ($attachment) {
                    Storage::disk('public')->delete($attachment->file_path);
                    $attachment->delete();
                }
            }
        }

        // Remove deleted_attachment_ids from validated data before saving
        unset($validated['deleted_attachment_ids']);

        $delivery->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified delivery.
     */
    public function destroy(Delivery $delivery): RedirectResponse
    {
        // Clean up attachments — files on disk aren't covered by DB FK
        // constraints since this is a polymorphic relation, so they have
        // to be removed manually before the delivery record itself is deleted.
        foreach ($delivery->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->file_path);
        }
        $delivery->attachments()->delete();

        $delivery->delete();

        return redirect()->back();
    }

    /**
     * Upload attachments for a delivery.
     */
    public function uploadAttachments(Request $request, Delivery $delivery)
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB each
        ]);

        foreach ($request->file('files') as $file) {
            $path = $file->store('delivery-attachments/' . $delivery->delivery_id, 'public');

            $delivery->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);
        }

        return back();
    }

    /**
     * Delete an attachment.
     */
    public function deleteAttachment(Attachment $attachment)
    {
        Storage::disk('public')->delete($attachment->file_path);
        $attachment->delete();

        return back();
    }
}
