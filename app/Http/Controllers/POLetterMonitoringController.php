<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            'attachments',
        ])
        ->when($search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                    ->orWhere('po_number', 'like', "%{$search}%")
                    ->orWhere('office_end_user', 'like', "%{$search}%")
                    ->orWhere('received_by', 'like', "%{$search}%")
                    ->orWhereHas('servePo', function ($poQuery) use ($search) {
                        $poQuery->where('item_description', 'like', "%{$search}%")
                                ->orWhere('end_user', 'like', "%{$search}%");
                    })
                    ->orWhereHas('supplier', function ($supplierQuery) use ($search) {
                        $supplierQuery->where('supplier_name', 'like', "%{$search}%");
                    });
            });
        })
        ->when($status, fn ($query, $status) => $query->where('status_of_the_letter', $status))
        ->when($type, fn ($query, $type) => $query->where('type_of_letter', $type))
        ->orderByDesc('created_at')
        ->paginateWithHighlight(10)
        ->withQueryString();

        return Inertia::render('po-letter-monitoring/index', [
            'poLetters' => $poLetters,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'type' => $type,
            ],
            'suppliers' => Supplier::select('supplier_id', 'supplier_name')
                ->orderByDesc('supplier_id')
                ->get(),
            'poNumbers' => ServePo::select('po_number', 'supplier_id', 'po_received_date', 'due_date', 'end_user')
                ->orderByDesc('created_at')
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

        $poLetterMonitoring = PoLetterMonitoring::create($validated);

        // id doesn't exist until after create — the frontend needs it back
        // to upload any attachments staged before the record existed.
            return redirect()->back()->with([
                'success' => 'PO letter record added successfully.',
                'newRecordId' => $poLetterMonitoring->id,
            ]);
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
            'deleted_attachment_ids' => ['nullable', 'array'],
            'deleted_attachment_ids.*' => ['integer'],
        ]);

        // Handle deleted attachments before updating the record
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
        unset($validated['deleted_attachment_ids']);

        $poLetterMonitoring->update($validated);

        return redirect()->back()->with('success', 'PO letter record updated successfully.');
    }

    /**
     * Remove the specified PO letter monitoring record.
     */
    public function destroy(PoLetterMonitoring $poLetterMonitoring): RedirectResponse
    {
        // Files on disk aren't covered by DB FK constraints since this is
        // a polymorphic relation, so they have to be removed manually.
        foreach ($poLetterMonitoring->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->file_path);
        }
        $poLetterMonitoring->attachments()->delete();
        $poLetterMonitoring->delete();

        return redirect()->back()->with('success', 'PO letter record archived successfully.');
    }

    public function uploadAttachments(Request $request, PoLetterMonitoring $poLetterMonitoring)
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB each
        ]);

        foreach ($request->file('files') as $file) {
            $path = $file->store('po-letter-attachments/' . $poLetterMonitoring->id, 'public');
            $poLetterMonitoring->attachments()->create([
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
        $attachment->delete();
        Storage::disk('public')->delete($attachment->file_path);

        return back()->with('success', 'Attachment deleted successfully.');
    }
}
