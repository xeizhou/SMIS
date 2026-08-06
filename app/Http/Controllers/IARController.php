<?php

namespace App\Http\Controllers;

use App\Models\PirMonitoring;
use App\Models\Supplier;
use App\Models\FundCluster;
use App\Models\Office;
use App\Models\ServePo;
use App\Models\Attachment;
use App\Models\PirInspectionEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use App\Models\PoLetterMonitoring;

class IARController extends Controller
{
    private function normalizeInspectionEntries(Request $request): array
    {
        $inspectionEntries = $request->input('inspection_entries', []);
        $inspectionGroups = $request->input('inspection_groups', []);

        $normalized = [];

        foreach ($inspectionEntries as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            $iarNumber = $entry['iar_number'] ?? '';

            if (array_key_exists('inspection_items', $entry) && is_array($entry['inspection_items'])) {
                foreach ($entry['inspection_items'] as $item) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $normalized[] = [
                        'iar_number' => $iarNumber,
                        'inspected_by' => $item['inspected_by'] ?? null,
                        'inspection_date' => $item['inspection_date'] ?? null,
                    ];
                }

                continue;
            }

            $normalized[] = [
                'iar_number' => $iarNumber,
                'inspected_by' => $entry['inspected_by'] ?? null,
                'inspection_date' => $entry['inspection_date'] ?? null,
            ];
        }

        foreach ($inspectionGroups as $group) {
            if (! is_array($group)) {
                continue;
            }

            $iarNumber = $group['iar_number'] ?? '';
            $items = $group['items'] ?? [];

            if (! is_array($items) || $items === []) {
                $normalized[] = [
                    'iar_number' => $iarNumber,
                    'inspected_by' => null,
                    'inspection_date' => null,
                ];

                continue;
            }

            foreach ($items as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $normalized[] = [
                    'iar_number' => $iarNumber,
                    'inspected_by' => $item['inspected_by'] ?? null,
                    'inspection_date' => $item['inspection_date'] ?? null,
                ];
            }
        }

        return array_values(array_filter($normalized, function (array $entry) {
            return $entry['iar_number'] !== ''
                || $entry['inspected_by'] !== null && $entry['inspected_by'] !== ''
                || $entry['inspection_date'] !== null && $entry['inspection_date'] !== '';
        }));
    }

    /**
     * Display the PIR (IAR) page.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');

        $query = PirMonitoring::with(['supplier', 'fundCluster', 'attachments', 'inspectionEntries'])
        ->when($search, function ($q) use ($search) {
            $q->where(function ($sub) use ($search) {
                $sub->where('po_number', 'like', "%{$search}%")
                    ->orWhere('invoice_number', 'like', "%{$search}%")
                    ->orWhere('iar_number', 'like', "%{$search}%")
                    ->orWhere('ris_number', 'like', "%{$search}%")
                    ->orWhereHas('servePo', function ($poQuery) use ($search) {
                        $poQuery->where('item_description', 'like', "%{$search}%");
                    });
            });
        });

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $pirs = $query->orderBy('pir_id', 'desc')
            ->paginateWithHighlight(10)
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
                'po_received_date',
                'due_date',
                'pr_number',
                'pr_date',
                'ors_burs_no',
                'ors_burs_date',
                'total_amount_po',
                'fund_cluster_id',
                'supplier_id',
                'end_user'
            )->orderByDesc('created_at')->get(),
            // Needed so the PIR form can auto-derive CANCELLED status when
            // a PO has an approved cancellation letter on file.
            'poLetters' => \App\Models\PoLetterMonitoring::select(
                'po_number',
                'type_of_letter',
                'status_of_the_letter'
            )->get(),
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
            'po_vpad_notified_date' => 'nullable|date',
            'po_vpad_notified_via' => 'nullable|string|max:255',
            'coa_stamp_notified_date' => 'nullable|date',
            'coa_stamp_notified_via' => 'nullable|string|max:255',
            'receipt_claimed_notified_date' => 'nullable|date',
            'receipt_claimed_notified_via' => 'nullable|string|max:255',
            'status' => 'nullable|in:COMPLETED,CANCELLED,ONGOING',
            'remarks' => 'nullable|string',
            'inspection_entries' => 'nullable|array',
            'inspection_entries.*.iar_number' => 'nullable|string|max:255',
            'inspection_entries.*.inspected_by' => 'nullable|string|max:255',
            'inspection_entries.*.inspection_date' => 'nullable|date',
            'inspection_entries.*.inspection_items' => 'nullable|array',
            'inspection_entries.*.inspection_items.*.inspected_by' => 'nullable|string|max:255',
            'inspection_entries.*.inspection_items.*.inspection_date' => 'nullable|date',
            'inspection_groups' => 'nullable|array',
            'inspection_groups.*.iar_number' => 'nullable|string|max:255',
            'inspection_groups.*.items' => 'nullable|array',
            'inspection_groups.*.items.*.inspected_by' => 'nullable|string|max:255',
            'inspection_groups.*.items.*.inspection_date' => 'nullable|date',
        ]);

        $normalizedInspectionEntries = $this->normalizeInspectionEntries($request);
        $validated['inspection_entries'] = $normalizedInspectionEntries;

        $pir = PirMonitoring::create($validated);

        if (! empty($validated['inspection_entries'])) {
            foreach ($validated['inspection_entries'] as $entry) {
                $pir->inspectionEntries()->create([
                    'iar_number' => $entry['iar_number'] ?? null,
                    'inspected_by' => $entry['inspected_by'] ?? null,
                    'inspection_date' => $entry['inspection_date'] ?? null,
                ]);
            }
        }

        return redirect()->back()->with('createdPirId', $pir->pir_id);
    }

    public function storeAttachments(Request $request, $pirIdentifier)
    {
        $pirMonitoring = is_numeric($pirIdentifier)
            ? PirMonitoring::find($pirIdentifier)
            : PirMonitoring::where('po_number', $pirIdentifier)->first();

        if (! $pirMonitoring) {
            abort(404);
        }

        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        foreach ($request->file('files', []) as $file) {
            $path = $file->store('pir-attachments/' . $pirMonitoring->pir_id, 'public');

            $pirMonitoring->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);
        }

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
            'po_vpad_notified_date' => 'nullable|date',
            'po_vpad_notified_via' => 'nullable|string|max:255',
            'coa_stamp_notified_date' => 'nullable|date',
            'coa_stamp_notified_via' => 'nullable|string|max:255',
            'receipt_claimed_notified_date' => 'nullable|date',
            'receipt_claimed_notified_via' => 'nullable|string|max:255',
            'status' => 'nullable|in:COMPLETED,CANCELLED,ONGOING',
            'remarks' => 'nullable|string',
            'inspection_entries' => 'nullable|array',
            'inspection_entries.*.iar_number' => 'nullable|string|max:255',
            'inspection_entries.*.inspected_by' => 'nullable|string|max:255',
            'inspection_entries.*.inspection_date' => 'nullable|date',
            'inspection_entries.*.inspection_items' => 'nullable|array',
            'inspection_entries.*.inspection_items.*.inspected_by' => 'nullable|string|max:255',
            'inspection_entries.*.inspection_items.*.inspection_date' => 'nullable|date',
            'inspection_groups' => 'nullable|array',
            'inspection_groups.*.iar_number' => 'nullable|string|max:255',
            'inspection_groups.*.items' => 'nullable|array',
            'inspection_groups.*.items.*.inspected_by' => 'nullable|string|max:255',
            'inspection_groups.*.items.*.inspection_date' => 'nullable|date',
            'deleted_attachment_ids' => 'nullable|array',
            'deleted_attachment_ids.*' => 'integer|exists:attachments,id',
        ]);

        $deletedIds = $validated['deleted_attachment_ids'] ?? [];
            unset($validated['deleted_attachment_ids']);

            $normalizedInspectionEntries = $this->normalizeInspectionEntries($request);
            $validated['inspection_entries'] = $normalizedInspectionEntries;

            if (!empty($deletedIds)) {
                $attachments = $pirMonitoring->attachments()->whereIn('id', $deletedIds)->get();
                foreach ($attachments as $attachment) {
                    Storage::disk('public')->delete($attachment->file_path);
                    $attachment->delete();
                }
            }

            $pirMonitoring->update($validated);

            if (array_key_exists('inspection_entries', $validated)) {
                $pirMonitoring->inspectionEntries()->delete();

                foreach ($validated['inspection_entries'] as $entry) {
                    $pirMonitoring->inspectionEntries()->create([
                        'iar_number' => $entry['iar_number'] ?? null,
                        'inspected_by' => $entry['inspected_by'] ?? null,
                        'inspection_date' => $entry['inspection_date'] ?? null,
                    ]);
                }
            }

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
