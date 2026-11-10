<?php

namespace App\Http\Controllers;

use App\Helpers\ValidationHelper;
use App\Models\Attachment;
use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Services\PoLetterImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class POLetterMonitoringController extends Controller
{
    /**
     * Display the PO Letter Monitoring page.
     */
    public function index(Request $request): Response
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->string('search')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;
        $type = $request->string('type')->toString() ?: null;
        $sortField = $request->string('sort_field')->toString();
        $sortDirection = $request->string('sort_direction')->toString() === 'desc' ? 'desc' : 'asc';
        $sorts = [
            'reference_no' => 'reference_no',
            'supplier' => Supplier::select('supplier_name')->whereColumn('supplier_list.supplier_id', 'po_letter_monitoring.supplier_id'),
            'po_number' => 'po_number',
            'type' => 'type_of_letter',
            'status' => 'status_of_the_letter',
            'po_date' => 'po_date',
            'due_date' => 'due_date',
        ];

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
        ->when(isset($sorts[$sortField]), fn ($query) => $query->orderBy($sorts[$sortField], $sortDirection), fn ($query) => $query->orderByDesc('created_at'))
        ->paginateWithHighlight($perPage)
        ->withQueryString();

        return Inertia::render('po-letter-monitoring/index', [
            'poLetters' => $poLetters,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'type' => $type,
                'sort_field' => $sortField ?: null,
                'sort_direction' => $sortDirection,
            ],
            'suppliers' => fn () => Supplier::select('supplier_id', 'supplier_name')
                ->orderByDesc('supplier_id')
                ->get(),
            'poNumbers' => fn () => ServePo::select(
                'po_number',
                'po_date',
                'supplier_id',
                'po_received_date',
                'due_date',
                'end_user',
                'item_description',
            )
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
            'po_number' => ['required', 'string', 'exists:serve_po,po_number'],
            'type_of_letter' => ['required', 'string', 'in:EXTENSION,WAIVER,CANCELLATION,REPLACEMENT/ALTERNATIVE OFFER,RELEASE OF RETENTION'],
        ]);

        $purchaseOrder = ServePo::findOrFail($validated['po_number']);
        $deliveryTerm = $purchaseOrder->po_received_date && $purchaseOrder->due_date
            ? max(0, (int) $purchaseOrder->po_received_date->diffInDays($purchaseOrder->due_date))
            : 0;

        $poLetterMonitoring = PoLetterMonitoring::create([
            'po_number' => $purchaseOrder->po_number,
            'supplier_id' => $purchaseOrder->supplier_id,
            'po_date' => $purchaseOrder->po_date,
            'date_received_by_supplier' => $purchaseOrder->po_received_date,
            'delivery_term' => $deliveryTerm,
            'due_date' => $purchaseOrder->due_date,
            'office_end_user' => $purchaseOrder->end_user,
            'type_of_letter' => $validated['type_of_letter'],
            'status_of_the_letter' => 'PENDING',
        ]);

        // id doesn't exist until after create — the frontend needs it back
        return redirect()->back()->with([
            'success' => 'PO letter record added successfully.',
            'newRecordId' => $poLetterMonitoring->id,
        ]);
    }

    /**
     * Save one sequential PO letter workflow step.
     */
    public function updateWorkflow(Request $request, PoLetterMonitoring $poLetterMonitoring): RedirectResponse
    {
        $step = $request->input('step');
        if ($step === 'final_section') {
            $validated = $request->validate([
                'step' => ['required', 'in:final_section'],
                'value' => ['required', 'array'],
                'value.date_forwarded_to_end_user' => ['required', 'date'],
                'value.status_of_the_letter' => ['required', 'in:APPROVED,DISAPPROVED'],
                'value.remarks' => ['nullable', 'string'],
            ]);

            if (! $poLetterMonitoring->date_received_by_smu || ! $poLetterMonitoring->date_forwarded_to_ovpad) {
                throw ValidationException::withMessages([
                    'step' => 'Complete the previous workflow steps before continuing.',
                ]);
            }

            $poLetterMonitoring->update($validated['value']);

            return redirect()->back()->with('success', 'PO letter workflow updated successfully.');
        }

        $stepRules = [
            'date_received_by_smu' => ['required', 'date'],
            'date_forwarded_to_ovpad' => ['required', 'date'],
            'status_of_the_letter' => ['required', 'in:APPROVED,DISAPPROVED'],
            'date_forwarded_to_end_user' => ['required', 'date'],
            'remarks' => ['nullable', 'string'],
        ];

        if (! is_string($step) || ! array_key_exists($step, $stepRules)) {
            throw ValidationException::withMessages(['step' => 'Choose a valid workflow step.']);
        }

        $validated = $request->validate([
            'step' => ['required', 'in:date_received_by_smu,date_forwarded_to_ovpad,status_of_the_letter,date_forwarded_to_end_user,remarks'],
            'value' => $stepRules[$step],
        ]);

        $prerequisites = [
            'date_received_by_smu' => [],
            'date_forwarded_to_ovpad' => ['date_received_by_smu'],
            'status_of_the_letter' => ['date_received_by_smu', 'date_forwarded_to_ovpad'],
            'date_forwarded_to_end_user' => ['date_received_by_smu', 'date_forwarded_to_ovpad', 'status_of_the_letter'],
            'remarks' => ['date_received_by_smu', 'date_forwarded_to_ovpad', 'status_of_the_letter', 'date_forwarded_to_end_user'],
        ];

        foreach ($prerequisites[$step] as $requiredStep) {
            $value = $poLetterMonitoring->getAttribute($requiredStep);
            if (! $value || ($requiredStep === 'status_of_the_letter' && $value === 'PENDING')) {
                throw ValidationException::withMessages([
                    'step' => 'Complete the previous workflow steps before continuing.',
                ]);
            }
        }

        $poLetterMonitoring->update([$step => $validated['value'] ?? null]);

        return redirect()->back()->with('success', 'PO letter workflow updated successfully.');
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
            'type_of_letter' => ['required', 'string', 'in:EXTENSION,WAIVER,CANCELLATION,REPLACEMENT/ALTERNATIVE OFFER,RELEASE OF RETENTION'],
            'date_received_by_smu' => ['nullable', 'date'],
            'date_forwarded_to_ovpad' => ['nullable', 'date'],
            'received_by' => ['nullable', 'string', 'max:50', 'regex:' . ValidationHelper::pattern('nameOrOffice')],
            'status_of_the_letter' => ['required', 'string', 'max:50'],
            'date_forwarded_to_end_user' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
            'deleted_attachment_ids' => ['nullable', 'array'],
            'deleted_attachment_ids.*' => ['integer'],
        ], [
            'received_by.regex' => ValidationHelper::message('names'),
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
    public function destroy(Request $request, PoLetterMonitoring $poLetterMonitoring): RedirectResponse
    {
        $poLetterMonitoring->archiveMetadata()->create([
            'identity_document' => $poLetterMonitoring->po_number ?? $poLetterMonitoring->reference_no,
            'archived_from' => 'Procurement > PO Letter Monitoring',
            'archived_by' => $request->user()?->id,
        ]);

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

    /**
     * Import PO Letters from uploaded CSV or Excel file.
     */
    public function import(Request $request, PoLetterImportService $importService): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:20480'],
            'merge_existing' => ['nullable'],
        ]);

        $file = $request->file('file');
        $mergeExisting = $request->boolean('merge_existing', true);

        try {
            $result = $importService->importFile($file, $mergeExisting);
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Import failed: ' . $e->getMessage()]);
        }

        $message = "Imported {$result['created']} PO letter(s).";
        if ($result['updated'] > 0) {
            $message .= " Updated {$result['updated']} existing PO letter(s).";
        }
        if (count($result['skipped']) > 0) {
            $message .= " Skipped " . count($result['skipped']) . " row(s).";
        }

        return back()->with([
            'success' => $message,
            'import_summary' => [
                'created' => $result['created'],
                'updated' => $result['updated'],
                'skipped_count' => count($result['skipped']),
                'skipped' => array_slice($result['skipped'], 0, 50),
            ],
        ]);
    }

    /**
     * Download or preview PO Letters import template (CSV).
     */
    public function importTemplate(Request $request, PoLetterImportService $importService)
    {
        if ($request->boolean('preview')) {
            return response()->json($importService->getTemplatePreview());
        }

        return $importService->downloadTemplate();
    }
}