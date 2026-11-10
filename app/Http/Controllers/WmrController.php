<?php

namespace App\Http\Controllers;

use App\Helpers\ValidationHelper;
use App\Models\Supplier;
use App\Models\WmrMonitoring;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WmrController extends Controller
{
    public function printHtml(Request $request, WmrMonitoring $wmr)
    {
        $wmr->load(['supplier', 'items']);

        return view('wmr-monitoring.print', [
            'wmr' => $wmr,
            'printedBy' => $request->user()->full_name,
            'forPdf' => false,
        ]);
    }

    public function printPdf(Request $request, WmrMonitoring $wmr)
    {
        $wmr->load(['supplier', 'items']);

        $pdf = Pdf::loadView('wmr-monitoring.print', [
            'wmr' => $wmr,
            'printedBy' => $request->user()->full_name,
            'forPdf' => true,
        ])->setPaper('A4', 'portrait');

        return $pdf->stream("WMR-{$wmr->wmr_no}.pdf");
    }

    /**
     * Display the WMR Monitoring page.
     */
    public function index(Request $request): Response
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->string('search')->toString() ?: null;
        $supplierId = $request->string('supplier_id')->toString() ?: null;

        $sortField = $request->input('sort_field', 'wmr_date');
        $sortDirection = strtolower($request->input('sort_direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        $allowedSorts = ['wmr_no', 'wmr_date', 'item_vehicle', 'job_order_no', 'labor_cost'];
        if (! in_array($sortField, $allowedSorts, true)) {
            $sortField = 'wmr_date';
        }

        $records = WmrMonitoring::with(['supplier', 'items', 'attachments'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('wmr_no', 'like', "%{$search}%")
                        ->orWhere('item_vehicle', 'like', "%{$search}%")
                        ->orWhere('brand_name', 'like', "%{$search}%")
                        ->orWhere('model', 'like', "%{$search}%")
                        ->orWhere('plate_no', 'like', "%{$search}%")
                        ->orWhere('job_order_no', 'like', "%{$search}%")
                        ->orWhere('property_no', 'like', "%{$search}%")
                        ->orWhere('invoice_no', 'like', "%{$search}%")
                        ->orWhere('materials', 'like', "%{$search}%")
                        ->orWhere('remarks', 'like', "%{$search}%");
                });
            })
            ->when($supplierId, fn ($query, $supplierId) => $query->where('supplier_id', $supplierId))
            ->orderBy($sortField, $sortDirection)
            ->orderBy('id', 'desc') // stable order when the sort column ties
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        return Inertia::render('wmr-monitoring/index', [
            'records' => $records,
            'filters' => [
                'search' => $search,
                'supplier_id' => $supplierId,
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
                'per_page' => $perPage,
            ],
            'suppliers' => Supplier::orderBy('supplier_name')->get(['supplier_id', 'supplier_name']),
        ]);
    }

    /**
     * Store a newly created WMR record.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules(), $this->messages());

        $wmr = DB::transaction(function () use ($data) {
            $items = $data['items'];
            unset($data['items']);
            $descriptions = collect($items)->pluck('description')->implode(PHP_EOL);

            $wmr = WmrMonitoring::create([
                ...$data,
                'defects_complaints' => $descriptions,
                'materials' => $descriptions,
            ]);

            $this->saveItems($wmr, $items);

            return $wmr;
        });

        return redirect()->back()->with([
            'success' => 'WMR record added successfully.',
            'newRecordId' => $wmr->id,
        ]);
    }

    /**
     * Update the specified WMR record.
     */
    public function update(Request $request, WmrMonitoring $wmr): RedirectResponse
    {
        $rules = $this->rules($wmr->id);
        $rules['deleted_attachment_ids'] = ['nullable', 'array'];
        $rules['deleted_attachment_ids.*'] = [
            'integer',
            Rule::exists('attachments', 'id')->where(fn ($query) => $query
                ->where('attachable_type', WmrMonitoring::class)
                ->where('attachable_id', (string) $wmr->id)),
        ];
        $data = $request->validate($rules, $this->messages());

        $deletedAttachmentPaths = DB::transaction(function () use ($wmr, $data) {
            $items = $data['items'];
            unset($data['items']);
            $descriptions = collect($items)->pluck('description')->implode(PHP_EOL);
            $deletedAttachmentIds = $data['deleted_attachment_ids'] ?? [];
            unset($data['deleted_attachment_ids']);
            $deletedPaths = [];

            foreach ($deletedAttachmentIds as $attachmentId) {
                $attachment = $wmr->attachments()->findOrFail($attachmentId);
                $deletedPaths[] = $attachment->file_path;
                $attachment->delete();
            }

            $wmr->update([
                ...$data,
                'defects_complaints' => $descriptions,
                'materials' => $descriptions,
            ]);
            $wmr->items()->delete();
            $this->saveItems($wmr, $items);

            return $deletedPaths;
        });

        foreach ($deletedAttachmentPaths as $path) {
            Storage::disk('public')->delete($path);
        }

        return redirect()->back()->with('success', 'WMR record updated successfully.');
    }

    /**
     * Upload attachments for a WMR record.
     */
    public function uploadAttachments(Request $request, WmrMonitoring $wmr): RedirectResponse
    {
        $request->validate([
            'files' => ['required', 'array'],
            'files.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        foreach ($request->file('files') as $file) {
            $path = $file->store('wmr-attachments/'.$wmr->id, 'public');
            $wmr->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);
        }

        return redirect()->back()->with('success', 'Attachment(s) uploaded successfully.');
    }

    /**
     * Save submitted lines with server-generated item control numbers.
     */
    private function saveItems(WmrMonitoring $wmr, array $items): void
    {
        foreach (array_values($items) as $index => $item) {
            $itemNumber = $index + 1;
            $wmr->items()->create([
                'item_number' => $itemNumber,
                'quantity' => $item['quantity'],
                'unit' => $item['unit'],
                'description' => $item['description'],
                'item_control_no' => sprintf('%s-%02d', $wmr->wmr_no, $itemNumber),
            ]);
        }
    }

    /**
     * Archive the specified WMR record (soft delete + archive entry for the Document Center).
     */
    public function destroy(Request $request, WmrMonitoring $wmr): RedirectResponse
    {
        DB::transaction(function () use ($request, $wmr) {
            $wmr->archiveMetadata()->create([
                'identity_document' => $wmr->wmr_no,
                'archived_from' => 'Assets > WMR Monitoring',
                'archived_by' => $request->user()?->id,
            ]);

            $wmr->delete();
        });

        return redirect()->back()->with('success', 'WMR record archived successfully.');
    }

    /**
     * Shared validation rules for store/update.
     */
    private function rules(?int $ignoreId = null): array
    {
        return [
            'wmr_no' => [
                'required', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('wmrNo'),
                Rule::unique('wmr_monitoring', 'wmr_no')->whereNull('deleted_at')->ignore($ignoreId),
            ],
            'wmr_date' => ['required', 'date'],
            'supplier_id' => [
                'nullable', 'integer',
                Rule::exists('supplier_list', 'supplier_id')->whereNull('deleted_at'),
            ],
            'iar_no' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('iarNo')],
            'iar_date' => ['nullable', 'date'],
            'item_vehicle' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('vehicleType')],

            'job_order_no' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('jobOrderNo')],
            'job_order_date' => ['nullable', 'date'],
            'fund_cluster_id' => [
                'nullable', 'string', 'max:20',
                Rule::exists('fund_clusters', 'fund_cluster_id')->whereNull('deleted_at'),
            ],

            'vehicle_type' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('vehicleType')],
            'brand_name' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('vehicleType')],
            'model' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('vehicleType')],
            'plate_no' => ['nullable', 'string', 'max:50'],
            'serial_engine_no' => ['nullable', 'string', 'max:100'],
            'acquisition_date' => ['nullable', 'date'],
            'property_no' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('propertyNo')],

            'inspector_name' => ['nullable', 'string', 'max:150', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'inspection_date' => ['nullable', 'date'],
            'invoice_no' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('invoiceNumberComma')],
            'invoice_date' => ['nullable', 'date'],

            'labor_cost' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit' => ['required', 'string', 'max:30'],
            'items.*.description' => ['required', 'string', 'max:1000'],

            'office_code' => [
                'nullable', 'string', 'max:20',
                Rule::exists('offices', 'office_code')->whereNull('deleted_at'),
            ],
            'requested_by' => ['nullable', 'string', 'max:150'],
            'received_by' => ['nullable', 'string', 'max:150', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'received_date' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ];
    }

    private function messages(): array
    {
        return [
            'wmr_no.regex' => ValidationHelper::message('numbersAndHyphens'),
            'iar_no.regex' => ValidationHelper::message('iarNo'),
            'item_vehicle.regex' => ValidationHelper::message('basicText'),
            'job_order_no.regex' => ValidationHelper::message('jobOrderNo'),
            'vehicle_type.regex' => ValidationHelper::message('basicText'),
            'brand_name.regex' => ValidationHelper::message('basicText'),
            'model.regex' => ValidationHelper::message('basicText'),
            'property_no.regex' => ValidationHelper::message('numbersAndHyphens'),
            'inspector_name.regex' => ValidationHelper::message('names'),
            'invoice_no.regex' => ValidationHelper::message('invoiceNumberComma'),
            'received_by.regex' => ValidationHelper::message('names'),
        ];
    }
}
