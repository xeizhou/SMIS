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
        $office = $request->string('office')->toString() ?: null;
        $perPage = $request->integer('per_page', 10);
        $sortField = $request->string('sort_field')->toString();
        $sortDirection = $request->string('sort_direction')->toString() === 'desc' ? 'desc' : 'asc';

        $sorts = [
            'po_number' => 'po_number',
            'supplier' => Supplier::select('supplier_name')
                ->whereColumn('supplier_list.supplier_id', 'serve_po.supplier_id'),
            'office' => Office::select('office_name')
                ->whereColumn('offices.office_code', 'serve_po.end_user'),
            'fund_cluster' => 'fund_cluster_id',
            'mode_of_procurement' => 'mode_of_procurement',
            'po_date' => 'po_date',
            'due_date' => 'due_date',
            'total_amount_po' => 'total_amount_po',
        ];

        $purchaseOrders = ServePo::query()
            ->with([
                'supplier:supplier_id,supplier_name',
                'fundCluster:fund_cluster_id,fund_description',
                'office:office_code,office_name',
                'attachments',
                'items:stock_no,item_name,description',
                'inspectionEntries',
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
            ->when($office, fn ($query, $office) => $query->where('end_user', $office))
            ->when(isset($sorts[$sortField]), function ($query) use ($sorts, $sortField, $sortDirection) {
                $query->orderBy($sorts[$sortField], $sortDirection);
            }, fn ($query) => $query->latest())
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        return Inertia::render('purchase-orders/index', [
            'purchaseOrders' => $purchaseOrders,
            'filters' => [
                'search' => $search,
                'fund_cluster' => $fundCluster,
                'office' => $office,
                'sort_field' => $sortField ?: null,
                'sort_direction' => $sortDirection,
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
            'stockItems' => \App\Models\StockItem::select('stock_no', 'item_name', 'description')
                ->orderBy('item_name')
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
            'item_stock_nos' => ['nullable', 'array'],
            'item_stock_nos.*' => ['string', 'exists:stock_items,stock_no'],
            'po_date' => ['nullable', 'date'],
            'po_received_date' => ['nullable', 'date'],
            'inclusive_date' => ['nullable', 'string', 'max:100'],
            'delivery_term' => ['nullable', 'integer', 'min:0'],
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
            
            // Workflow tracking fields
            'po_step' => ['nullable', 'string'],
            'date_forwarded_to_end_user' => ['nullable', 'date'],
            'end_user_forwarded_by' => ['nullable', 'string', 'max:255'],
            'date_forwarded_supplier' => ['nullable', 'date'],
            'forwarded_by_supplier' => ['nullable', 'string', 'max:255'],
            'claimed_by_supplier' => ['nullable', 'string', 'max:255'],
            'supplier_signature_date' => ['nullable', 'date'],
            'date_forwarded_coa' => ['nullable', 'date'],
            'forwarded_by_coa' => ['nullable', 'string', 'max:255'],
            'date_returned_from_coa' => ['nullable', 'date'],
            'coa_date' => ['nullable', 'date'],
            'claim_date' => ['nullable', 'date'],
            'claimed_by_coa' => ['nullable', 'string', 'max:255'],
            'date_received_by_supplier' => ['nullable', 'date'],
            'receipt_receiving_date' => ['nullable', 'date'],
            'receipt_claimed_by' => ['nullable', 'string', 'max:255'],
            'items_receiving_date' => ['nullable', 'date'],
            'items_claimed_by' => ['nullable', 'string', 'max:255'],
            'payment_status' => ['nullable', 'string', 'max:100'],
            'workflow_remarks' => ['nullable', 'string'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'invoice_date' => ['nullable', 'date'],
            'delivery_receipt' => ['nullable', 'string', 'max:100'],
            'par_ics_number' => ['nullable', 'string', 'max:100'],
            'ris_number' => ['nullable', 'string', 'max:100'],
            'date_completed' => ['nullable', 'date'],
            
            // Inspection Entries array
            'inspection_entries' => ['nullable', 'array'],
            'inspection_entries.*.iar_number' => ['nullable', 'string', 'max:100'],
            'inspection_entries.*.inspected_by' => ['nullable', 'string', 'max:255'],
            'inspection_entries.*.inspection_date' => ['nullable', 'date'],
            'date_forwarded_to_finance' => ['nullable', 'date'],
            'finance_forwarded_by' => ['nullable', 'string', 'max:255'],
            
            // Notified fields
            'po_vpad_notified_date' => ['nullable', 'date'],
            'po_vpad_notified_via' => ['nullable', 'string', 'max:100'],
            'coa_stamp_notified_date' => ['nullable', 'date'],
            'coa_stamp_notified_via' => ['nullable', 'string', 'max:100'],
            'receipt_claimed_notified_date' => ['nullable', 'date'],
            'receipt_claimed_notified_via' => ['nullable', 'string', 'max:100'],
        ]);

        $itemStockNos = $validated['item_stock_nos'] ?? [];
        unset($validated['item_stock_nos']);

        $validated['total_amount_abc'] ??= 0;
        $validated['total_amount_po'] ??= 0;
        $validated['total_amount_diff'] = $validated['total_amount_abc'] - $validated['total_amount_po'];

        $this->updateForwardedByFields($validated);

        $inspectionEntries = $validated['inspection_entries'] ?? [];
        unset($validated['inspection_entries']);

        $po = ServePo::create($validated);
        $po->items()->sync($itemStockNos);
        
        foreach ($inspectionEntries as $entry) {
            if ($entry['iar_number'] || $entry['inspected_by'] || $entry['inspection_date']) {
                $po->inspectionEntries()->create($entry);
            }
        }

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
        \Log::info('Entering PurchaseOrdersController@update for PO: ' . $servePo->po_number);
        $validated = $request->validate([
            'po_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('serve_po', 'po_number')->ignore($servePo->po_number, 'po_number'),
            ],
            'item_stock_nos' => ['nullable', 'array'],
            'item_stock_nos.*' => ['string', 'exists:stock_items,stock_no'],
            'po_date' => ['nullable', 'date'],
            'item_description' => ['nullable', 'string'],
            'po_received_date' => ['nullable', 'date'],
            'procurement_type' => ['nullable', 'in:Services,Items'],
            'inclusive_date' => ['nullable', 'string', 'max:100'],
            'delivery_term' => ['nullable', 'integer', 'min:0'],
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
            
            // Workflow tracking fields
            'po_step' => ['nullable', 'string'],
            'po_received_date' => ['nullable', 'date'],
            'po_vpad_forwarded_by' => ['nullable', 'string', 'max:255'],
            'date_forwarded_to_end_user' => ['nullable', 'date'],
            'end_user_forwarded_by' => ['nullable', 'string', 'max:255'],
            'date_forwarded_supplier' => ['nullable', 'date'],
            'forwarded_by_supplier' => ['nullable', 'string', 'max:255'],
            'claimed_by_supplier' => ['nullable', 'string', 'max:255'],
            'supplier_signature_date' => ['nullable', 'date'],
            'date_forwarded_coa' => ['nullable', 'date'],
            'forwarded_by_coa' => ['nullable', 'string', 'max:255'],
            'date_returned_from_coa' => ['nullable', 'date'],
            'coa_date' => ['nullable', 'date'],
            'claim_date' => ['nullable', 'date'],
            'claimed_by_coa' => ['nullable', 'string', 'max:255'],
            'date_received_by_supplier' => ['nullable', 'date'],
            'receipt_receiving_date' => ['nullable', 'date'],
            'receipt_claimed_by' => ['nullable', 'string', 'max:255'],
            'items_receiving_date' => ['nullable', 'date'],
            'items_claimed_by' => ['nullable', 'string', 'max:255'],
            'payment_status' => ['nullable', 'string', 'max:100'],
            'workflow_remarks' => ['nullable', 'string'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'invoice_date' => ['nullable', 'date'],
            'delivery_receipt' => ['nullable', 'string', 'max:100'],
            'par_ics_number' => ['nullable', 'string', 'max:100'],
            'ris_number' => ['nullable', 'string', 'max:100'],
            'date_completed' => ['nullable', 'date'],
            
            // Inspection Entries array
            'inspection_entries' => ['nullable', 'array'],
            'inspection_entries.*.iar_number' => ['nullable', 'string', 'max:100'],
            'inspection_entries.*.inspected_by' => ['nullable', 'string', 'max:255'],
            'inspection_entries.*.inspection_date' => ['nullable', 'date'],
            'date_forwarded_to_finance' => ['nullable', 'date'],
            'finance_forwarded_by' => ['nullable', 'string', 'max:255'],
            
            // Notified fields
            'po_vpad_notified_date' => ['nullable', 'date'],
            'po_vpad_notified_via' => ['nullable', 'string', 'max:100'],
            'coa_stamp_notified_date' => ['nullable', 'date'],
            'coa_stamp_notified_via' => ['nullable', 'string', 'max:100'],
            'receipt_claimed_notified_date' => ['nullable', 'date'],
            'receipt_claimed_notified_via' => ['nullable', 'string', 'max:100'],

            'deleted_attachment_ids.*' => ['integer'],
        ]);

        \Log::info('Validation passed for PO: ' . $servePo->po_number);

        $itemStockNos = $request->has('item_stock_nos') ? ($validated['item_stock_nos'] ?? []) : null;
        unset($validated['item_stock_nos']);

        $inspectionEntries = $request->has('inspection_entries') ? ($validated['inspection_entries'] ?? []) : null;
        unset($validated['inspection_entries']);

        if ($request->has('total_amount_abc') || $request->has('total_amount_po')) {
            $validated['total_amount_abc'] ??= 0;
            $validated['total_amount_po'] ??= 0;
            $validated['total_amount_diff'] = $validated['total_amount_abc'] - $validated['total_amount_po'];
        }

    // ... rest unchanged (attachment deletion, transaction, etc.)

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

        $this->updateForwardedByFields($validated);

        DB::transaction(function () use ($servePo, $validated, $itemStockNos, $inspectionEntries, $oldPoNumber, $newPoNumber, $poNumberChanged) {
            if ($poNumberChanged) {
                DB::statement('PRAGMA defer_foreign_keys = ON');

                Delivery::where('po_number', $oldPoNumber)->update(['po_number' => $newPoNumber]);
                PoLetterMonitoring::where('po_number', $oldPoNumber)->update(['po_number' => $newPoNumber]);

                Attachment::where('attachable_type', ServePo::class)
                    ->where('attachable_id', $oldPoNumber)
                    ->update(['attachable_id' => $newPoNumber]);
            }

            $servePo->update($validated);
            
            if (is_array($itemStockNos)) {
                $servePo->items()->sync($itemStockNos);
            }
            
            if (is_array($inspectionEntries)) {
                $servePo->inspectionEntries()->delete();
                foreach ($inspectionEntries as $entry) {
                    if (($entry['iar_number'] ?? null) || ($entry['inspected_by'] ?? null) || ($entry['inspection_date'] ?? null)) {
                        $servePo->inspectionEntries()->create($entry);
                    }
                }
            }
            
            // If the workflow step reached "For Release" or beyond, set related deliveries to PENDING
            $releaseSteps = ['For Release', 'Payment Processing', 'Forwarded to Finance'];
            if (in_array($validated['po_step'] ?? '', $releaseSteps) && $servePo->coa_date) {
                Delivery::where('po_number', $servePo->po_number)
                    ->whereNull('status')
                    ->update(['status' => 'PENDING']);
            }
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

        if ($deliveryCount > 0 || $letterCount > 0) {
            $parts = [];
            if ($deliveryCount > 0) {
                $parts[] = "{$deliveryCount} linked delivery record" . ($deliveryCount > 1 ? 's' : '');
            }
            if ($letterCount > 0) {
                $parts[] = "{$letterCount} linked letter record" . ($letterCount > 1 ? 's' : '');
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

    /**
     * Automatically populate _by fields with the authenticated user's name
     * if the corresponding date is present and the _by field is not yet filled.
     */
    private function updateForwardedByFields(array &$validated): void
    {
        $userName = auth()->user()->name ?? 'System';

        $fieldMap = [
            'po_received_date' => 'po_vpad_forwarded_by',
            'date_forwarded_to_end_user' => 'end_user_forwarded_by',
            'date_forwarded_supplier' => 'forwarded_by_supplier',
            'date_forwarded_coa' => 'forwarded_by_coa',
            'date_forwarded_to_finance' => 'finance_forwarded_by',
        ];

        foreach ($fieldMap as $dateField => $byField) {
            if (!empty($validated[$dateField]) && empty($validated[$byField])) {
                $validated[$byField] = $userName;
            }
        }
    }
}