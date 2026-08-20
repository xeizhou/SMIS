<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\FundCluster;
use App\Models\Office;
use App\Models\PirMonitoring;
use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\Attachment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrdersController extends Controller
{
    /**
     * Display the Purchase Orders page.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString() ?: null;
        $fundCluster = $request->string('fund_cluster')->toString() ?: null;

        $purchaseOrders = ServePo::query()
            ->with([
                'supplier:supplier_id,supplier_name',
                'fundCluster:fund_cluster_id,fund_description',
                'office:office_code,office_name',
                'attachments',
            ])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('po_number', 'like', "%{$search}%")
                        ->orWhere('pr_number', 'like', "%{$search}%")
                        ->orWhere('philgeps_reference_no', 'like', "%{$search}%")
                        ->orWhere('end_user', 'like', "%{$search}%")
                        ->orWhere('item_description', 'like', "%{$search}%")
                        ->orWhereHas('supplier', fn ($q2) => $q2->where('supplier_name', 'like', "%{$search}%"))
                        ->orWhereHas('office', fn ($q2) => $q2->where('office_name', 'like', "%{$search}%"));
                });
            })
            ->when($fundCluster, fn ($query, $fundCluster) => $query->where('fund_cluster_id', $fundCluster))
            ->latest()
            ->paginateWithHighlight(10)
            ->withQueryString();

        return Inertia::render('purchase-orders/index', [
            'purchaseOrders' => $purchaseOrders,
            'filters' => [
                'search' => $search,
                'fund_cluster' => $fundCluster,
            ],
            'suppliers' => Supplier::select('supplier_id', 'supplier_name')
                ->orderByDesc('supplier_id')
                ->get(),
            'fundClusters' => FundCluster::select('fund_cluster_id', 'fund_description')
                ->orderByDesc('created_at')
                ->get(),
            'offices' => Office::select('office_code', 'office_name')
                ->orderByDesc('office_code')
                ->get(),
        ]);
    }

    /**
     * Store a newly created purchase order.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'po_number' => ['required', 'string', 'max:50', 'unique:serve_po,po_number'],
            'item_description' => ['nullable', 'string'],
            'po_date' => ['nullable', 'date'],
            'po_received_date' => ['nullable', 'date'],
            'inclusive_date' => ['nullable', 'string', 'max:100'],
            'due_date' => ['nullable', 'date'],
            'pr_number' => ['nullable', 'string', 'max:50'],
            'pr_date' => ['nullable', 'date'],
            'philgeps_reference_no' => ['nullable', 'string', 'max:50'],
            'procurement_type' => ['nullable', 'in:Services,Items'],
            'mode_of_procurement' => ['nullable', 'string', 'max:100'],
            'total_amount_abc' => ['nullable', 'numeric', 'min:0'],
            'total_amount_po' => ['nullable', 'numeric', 'min:0'],
            'fund_cluster_id' => ['nullable', 'exists:fund_clusters,fund_cluster_id'],
            'ors_burs_no' => ['nullable', 'string', 'max:50'],
            'ors_burs_date' => ['nullable', 'date'],
            'responsibility_center' => ['nullable', 'string', 'max:100'],
            'uacs_object_code' => ['nullable', 'string', 'max:50'],
            'supplier_id' => ['nullable', 'exists:supplier_list,supplier_id'],
            'end_user' => ['nullable', 'string', 'exists:offices,office_code'],
            'date_forwarded_to_smu' => ['nullable', 'date'],
            'coa_processed_date' => ['nullable', 'date'],
            'date_forwarded_frontdesk' => ['nullable', 'date'],
        ]);

        $validated['total_amount_abc'] ??= 0;
        $validated['total_amount_po'] ??= 0;
        $validated['total_amount_diff'] = $validated['total_amount_abc'] - $validated['total_amount_po'];

        ServePo::create($validated);

        return redirect()->back()->with('success', 'Purchase Order record added successfully.');
    }

    /**
     * Update the specified purchase order.
     *
     * po_number is the primary key, and it's user-editable in the edit form.
     * Renaming it must cascade to every child table that references it
     * (delivery, po_letter_monitoring, pir_monitoring) since those FKs are
     * not all set to ON UPDATE CASCADE at the DB level. We defer FK
     * enforcement for the transaction so the rename can happen in one
     * atomic operation regardless of update order.
     */
    public function update(Request $request, ServePo $servePo): RedirectResponse
    {
        $validated = $request->validate([
            'po_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('serve_po', 'po_number')->ignore($servePo->po_number, 'po_number'),
            ],
            'po_date' => ['nullable', 'date'],
            'item_description' => ['nullable', 'string'],
            'po_received_date' => ['nullable', 'date'],
            'procurement_type' => ['nullable', 'in:Services,Items'],
            'inclusive_date' => ['nullable', 'string', 'max:100'],
            'due_date' => ['nullable', 'date'],
            'pr_number' => ['nullable', 'string', 'max:50'],
            'pr_date' => ['nullable', 'date'],
            'philgeps_reference_no' => ['nullable', 'string', 'max:50'],
            'mode_of_procurement' => ['nullable', 'string', 'max:100'],
            'total_amount_abc' => ['nullable', 'numeric', 'min:0'],
            'total_amount_po' => ['nullable', 'numeric', 'min:0'],
            'fund_cluster_id' => ['nullable', 'exists:fund_clusters,fund_cluster_id'],
            'ors_burs_no' => ['nullable', 'string', 'max:50'],
            'ors_burs_date' => ['nullable', 'date'],
            'responsibility_center' => ['nullable', 'string', 'max:100'],
            'uacs_object_code' => ['nullable', 'string', 'max:50'],
            'supplier_id' => ['nullable', 'exists:supplier_list,supplier_id'],
            'end_user' => ['nullable', 'string', 'exists:offices,office_code'],
            'date_forwarded_to_smu' => ['nullable', 'date'],
            'coa_processed_date' => ['nullable', 'date'],
            'date_forwarded_frontdesk' => ['nullable', 'date'],
            'deleted_attachment_ids' => ['nullable', 'array'],
            'deleted_attachment_ids.*' => ['integer'],
        ]);

        $validated['total_amount_abc'] ??= 0;
        $validated['total_amount_po'] ??= 0;
        $validated['total_amount_diff'] = $validated['total_amount_abc'] - $validated['total_amount_po'];

        // Handle deleted attachments before updating PO
        $deletedAttachmentIds = $validated['deleted_attachment_ids'] ?? [];
        if ($deletedAttachmentIds) {
            // Scoped to this PO's own attachments — prevents a caller from passing
            // an arbitrary attachment ID (belonging to another PO, or another model
            // entirely, since attachments are polymorphic) and deleting records or
            // files they shouldn't have access to.
            foreach ($deletedAttachmentIds as $attachmentId) {
                $attachment = $servePo->attachments()->find($attachmentId);
                if ($attachment) {
                    Storage::disk('public')->delete($attachment->file_path);
                    $attachment->delete();
                }
            }
        }

        // Remove deleted_attachment_ids from validated data before saving
        unset($validated['deleted_attachment_ids']);

        $oldPoNumber = $servePo->po_number;
        $newPoNumber = $validated['po_number'];
        $poNumberChanged = $oldPoNumber !== $newPoNumber;

        DB::transaction(function () use ($servePo, $validated, $oldPoNumber, $newPoNumber, $poNumberChanged) {
            if ($poNumberChanged) {
                DB::statement('PRAGMA defer_foreign_keys = ON');

                Delivery::where('po_number', $oldPoNumber)->update(['po_number' => $newPoNumber]);
                PoLetterMonitoring::where('po_number', $oldPoNumber)->update(['po_number' => $newPoNumber]);
                PirMonitoring::where('po_number', $oldPoNumber)->update(['po_number' => $newPoNumber]);

                Attachment::where('attachable_type', ServePo::class)
                    ->where('attachable_id', $oldPoNumber)
                    ->update(['attachable_id' => $newPoNumber]);
            }

            $servePo->update($validated);
        });

        return redirect()->back()->with('success', 'Purchase Order record updated successfully.');
    }

    /**
     * Remove the specified purchase order.
     */
    public function destroy(ServePo $purchaseOrder): RedirectResponse
    {
        $deliveryCount = $purchaseOrder->deliveries()->count();
        $letterCount = $purchaseOrder->letterMonitorings()->count();
        $pirCount = $purchaseOrder->pirMonitorings()->count();

        if ($deliveryCount > 0 || $letterCount > 0 || $pirCount > 0) {
            $parts = [];
            if ($deliveryCount > 0) {
                $parts[] = "{$deliveryCount} linked delivery record" . ($deliveryCount > 1 ? 's' : '');
            }
            if ($letterCount > 0) {
                $parts[] = "{$letterCount} linked letter record" . ($letterCount > 1 ? 's' : '');
            }
            if ($pirCount > 0) {
                $parts[] = "{$pirCount} linked PIR record" . ($pirCount > 1 ? 's' : '');
            }

            return redirect()->back()->with('error',
                "Can't delete this PO. it has " . implode(', ', $parts) . ". Remove those first."
            );
        }

        // Clean up attachments — files on disk aren't covered by DB FK
        // constraints since this is a polymorphic relation, so they have
        // to be removed manually before the PO record itself is deleted.
        foreach ($purchaseOrder->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->file_path);
        }
        $purchaseOrder->attachments()->delete();

        $purchaseOrder->delete();

        return redirect()->back()->with('success', 'Purchase order archived successfully.');
    }

    public function uploadAttachments(Request $request, ServePo $purchaseOrder)
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB each
        ]);

        foreach ($request->file('files') as $file) {
            $path = $file->store('po-attachments/' . $purchaseOrder->po_number, 'public');

            $purchaseOrder->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);
        }

        return back()->with('success', 'Attachment(s) uploaded successfully.');
    }

    public function deleteAttachment(Request $request, Attachment $attachment)
    {
        // If this route can be hit for any attachable type, verify the caller
        // actually owns/has access to the parent record before deleting.
        // (Left as-is structurally since I don't have the route/middleware
        // context — flagging in case this endpoint has no other auth check.)
        Storage::disk('public')->delete($attachment->file_path);
        $attachment->delete();

        return back()->with('success', 'Attachment deleted successfully.');
    }
}
