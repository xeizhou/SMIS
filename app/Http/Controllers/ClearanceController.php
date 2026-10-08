<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Clearance;
use App\Models\ClearanceOffice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;


class ClearanceController extends Controller
{
    /**
     * Display the Clearance page.
     */
public function index(Request $request): Response
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->string('search')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;
        $formAttribute = $request->string('form_attribute')->toString() ?: null;

        // 1. Get sort parameters (default to claim_date descending)
        $sortField = $request->input('sort_field', 'claim_date');
        $sortDirection = $request->input('sort_direction', 'desc');

        // 2. Validate sort fields
        $allowedSorts = ['name', 'form_attribute', 'received_by', 'end_user_claim', 'claim_date', 'status'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'claim_date';
        }
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $query = Clearance::query()
            ->with(['offices:id,clearance_office_name', 'checker:id,name'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('received_by', 'like', "%{$search}%")
                        ->orWhere('remarks', 'like', "%{$search}%")
                        ->orWhereHas('offices', fn ($o) => $o->where('clearance_office_name', 'like', "%{$search}%"))
                        ->orWhereHas('checker', fn ($u) => $u->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status))
            ->when($formAttribute, fn ($query, $formAttribute) => $query->where('form_attribute', $formAttribute));

        // 3. Apply the dynamic sort (case-insensitive for text columns)
        $textSorts = ['name', 'form_attribute', 'received_by', 'end_user_claim', 'status'];

        $recordsQuery = (clone $query)->with('attachments');

        $recordsQuery = in_array($sortField, $textSorts, true)
            ? $recordsQuery->orderByRaw("LOWER({$sortField}) {$sortDirection}")
            : $recordsQuery->orderBy($sortField, $sortDirection);

        $records = $recordsQuery
            ->orderBy('clearance_id')
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        $statuses = Clearance::query()
            ->select('status')
            ->whereNotNull('status')
            ->where('status', '!=', '')
            ->distinct()
            ->orderBy('status')
            ->pluck('status')
            ->values()
            ->all();

        $forms = Clearance::query()
            ->select('form_attribute')
            ->whereNotNull('form_attribute')
            ->where('form_attribute', '!=', '')
            ->distinct()
            ->orderBy('form_attribute')
            ->pluck('form_attribute')
            ->values()
            ->all();

        return Inertia::render('clearance/index', [
            'records' => $records,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'form_attribute' => $formAttribute,
                // 4. Return the sorting state
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
            ],
            'statuses' => $statuses,
            'forms' => $forms,
            'offices' => ClearanceOffice::select('id', 'clearance_office_name')
                ->orderByRaw('LOWER(clearance_office_name)')
                ->get(),
        ]);
    }

    /**
     * Store a newly created clearance record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'offices' => ['required', 'array', 'min:1'],
            'offices.*' => ['integer', 'exists:clearance_offices,id'],
            'received_by' => ['required', 'string', 'max:100'],
            'remarks' => ['nullable', 'string', 'max:255'],
            'form_attribute' => ['nullable', 'string', 'max:100'],
        ]);

        $officeIds = $validated['offices'];
        unset($validated['offices']);

        $validated['status'] = 'Pending';
        $validated['pending'] = true;
        $validated['cleared'] = false;

        $clearance = Clearance::create($validated);
        $clearance->offices()->sync($officeIds);

        if ($request->hasFile('files')) {
            $request->validate([
                'files' => 'array',
                'files.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
            ]);

            foreach ($request->file('files') as $file) {
                $path = $file->store('clearance-attachments/' . $clearance->clearance_id, 'public');

                $clearance->attachments()->create([
                    'original_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        return redirect()->back()->with('success', 'Clearance record added successfully.');
    }

    /**
     * Update the specified clearance record.
     */
    public function update(Request $request, Clearance $clearance): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'offices' => ['required', 'array', 'min:1'],
            'offices.*' => ['integer', 'exists:clearance_offices,id'],
            'received_by' => ['required', 'string', 'max:100'],
            'remarks' => ['nullable', 'string', 'max:255'],
            'form_attribute' => ['nullable', 'string', 'max:100'],
            'deleted_attachment_ids' => ['nullable', 'array'],
            'deleted_attachment_ids.*' => ['integer'],
        ]);

        // Pull out the non-column fields BEFORE unsetting them.
        $officeIds = $validated['offices'];
        $deletedAttachmentIds = $validated['deleted_attachment_ids'] ?? [];
        unset($validated['offices'], $validated['deleted_attachment_ids']);

        DB::transaction(function () use ($clearance, $validated, $officeIds, $deletedAttachmentIds) {
            $clearance->update($validated);
            $clearance->offices()->sync($officeIds);

            // Scoped to this clearance's own attachments, so a caller can't delete
            // another record's files by passing an arbitrary ID.
            foreach ($deletedAttachmentIds as $attachmentId) {
                $attachment = $clearance->attachments()->find($attachmentId);

                if ($attachment) {
                    Storage::disk('public')->delete($attachment->file_path);
                    $attachment->delete();
                }
            }
        });

        return redirect()->back()->with('success', 'Clearance record updated successfully.');
    }

    /**
     * Remove the specified clearance record.
     */
    public function destroy(Request $request, Clearance $clearance): RedirectResponse
    {
        $clearance->archiveMetadata()->create([
            'identity_document' => $clearance->tracking_no ?? ('Clearance #' . $clearance->id),
            'archived_from' => 'HR > Clearance',
            'archived_by' => $request->user()?->id,
        ]);

        $clearance->delete();

        return redirect()->back()->with('success', 'Clearance record archived successfully.');
    }

    /**
     * Process the clearance (Set Cleared / Claimed status).
     */
    public function process(Request $request, Clearance $clearance): RedirectResponse
    {
        $validated = $request->validate([
            'cleared' => 'boolean',
            'claimed' => 'boolean',
            'end_user_claim' => ['nullable', 'string', 'max:100'],
        ]);

        // Assign the validated cleared boolean back to the model
        $clearance->cleared = $validated['cleared'];
        $clearance->end_user_claim = $validated['end_user_claim'] ?? null;

        if ($validated['claimed'] && !$clearance->claim_date) {
            $clearance->claim_date = now();
            if (!$clearance->checked_by_id) {
                $clearance->checked_by_id = auth()->id();
            }
        } elseif (!$validated['claimed']) {
            $clearance->claim_date = null;
            $clearance->checked_by_id = null;
        }

        if (!$clearance->cleared) {
            $clearance->status = 'Pending';
            $clearance->pending = true;
            $clearance->claim_date = null;
            $clearance->checked_by_id = null;
        } else {
            if ($clearance->claim_date) {
                $clearance->status = 'Completed';
                $clearance->pending = false;
            } else {
                $clearance->status = 'Cleared';
                $clearance->pending = true;
            }
        }

        $clearance->save();

        return redirect()->back()->with('success', 'Clearance processed successfully.');
    }

    /**
     * Upload attachments for a clearance.
     */
    public function uploadAttachments(Request $request, Clearance $clearance)
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB each
        ]);

        foreach ($request->file('files') as $file) {
            $path = $file->store('clearance-attachments/' . $clearance->clearance_id, 'public');

            $clearance->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);
        }

        return back()->with('success', 'Attachment(s) uploaded successfully.');
    }
}
