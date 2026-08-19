<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Clearance;
use App\Models\Office;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClearanceController extends Controller
{
    /**
     * Display the Clearance page.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;

        $query = Clearance::query()
            ->with('office:office_code,office_name')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('received_by', 'like', "%{$search}%")
                        ->orWhere('office', 'like', "%{$search}%")
                        ->orWhere('remarks', 'like', "%{$search}%")
                        ->orWhereHas('office', fn ($officeQuery) => $officeQuery->where('office_name', 'like', "%{$search}%"));
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status));

        $records = (clone $query)
            ->with('attachments')
            ->orderByDesc('claim_date')
            ->paginateWithHighlight(10)
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

        return Inertia::render('clearance/index', [
            'records' => $records,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'statuses' => $statuses,
            'offices' => Office::select('office_code', 'office_name')
                ->orderBy('office_name')
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
            'office' => ['required', 'exists:offices,office_code'],
            'claim_date' => ['required', 'date'],
            'received_by' => ['required', 'string', 'max:100'],
            'status' => ['required', 'string', 'max:50'],
            'cleared' => ['required', 'boolean'],
            'pending' => ['required', 'boolean'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validated['cleared'] && $validated['pending']) {
            throw ValidationException::withMessages([
                'pending' => ['Cleared and pending cannot both be true.'],
            ]);
        }

        $clearance = Clearance::create($validated);

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
            'office' => ['required', 'exists:offices,office_code'],
            'claim_date' => ['required', 'date'],
            'received_by' => ['required', 'string', 'max:100'],
            'status' => ['required', 'string', 'max:50'],
            'cleared' => ['required', 'boolean'],
            'pending' => ['required', 'boolean'],
            'remarks' => ['nullable', 'string', 'max:255'],
            'deleted_attachment_ids' => ['nullable', 'array'],
            'deleted_attachment_ids.*' => ['integer'],
        ]);

        if ($validated['cleared'] && $validated['pending']) {
            throw ValidationException::withMessages([
                'pending' => ['Cleared and pending cannot both be true.'],
            ]);
        }

        // Handle deleted attachments before updating clearance
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

        $clearance->update($validated);

        return redirect()->back()->with('success', 'Clearance record updated successfully.');
    }

    /**
     * Remove the specified clearance record.
     */
    public function destroy(Clearance $clearance): RedirectResponse
    {
        // Clean up attachments — files on disk aren't covered by DB FK
        // constraints since this is a polymorphic relation, so they have
        // to be removed manually before the clearance record itself is deleted.
        foreach ($clearance->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->file_path);
        }
        $clearance->attachments()->delete();

        $clearance->delete();

        return redirect()->back()->with('success', 'Clearance record archived successfully.');
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
