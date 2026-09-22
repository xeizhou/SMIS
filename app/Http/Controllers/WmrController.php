<?php

namespace App\Http\Controllers;

use App\Models\FundCluster;
use App\Models\Office;
use App\Models\Supplier;
use App\Models\WmrMonitoring;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WmrController extends Controller
{
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

        $records = WmrMonitoring::with(['supplier', 'office', 'fundCluster'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('wmr_no', 'like', "%{$search}%")
                        ->orWhere('item_vehicle', 'like', "%{$search}%")
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
            'offices' => Office::orderBy('office_name')->get(['office_code', 'office_name']),
            'fundClusters' => FundCluster::orderBy('fund_cluster_id')->get(['fund_cluster_id', 'fund_description']),
        ]);
    }

    /**
     * Store a newly created WMR record.
     */
    public function store(Request $request): RedirectResponse
    {
        WmrMonitoring::create($request->validate($this->rules()));

        return redirect()->back()->with('success', 'WMR record added successfully.');
    }

    /**
     * Update the specified WMR record.
     */
    public function update(Request $request, WmrMonitoring $wmr): RedirectResponse
    {
        $wmr->update($request->validate($this->rules($wmr->id)));

        return redirect()->back()->with('success', 'WMR record updated successfully.');
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
                'required', 'string', 'max:50',
                Rule::unique('wmr_monitoring', 'wmr_no')->whereNull('deleted_at')->ignore($ignoreId),
            ],
            'wmr_date' => ['required', 'date'],
            'supplier_id' => [
                'nullable', 'integer',
                Rule::exists('supplier_list', 'supplier_id')->whereNull('deleted_at'),
            ],
            'iar_no' => ['nullable', 'string', 'max:100'],
            'iar_date' => ['nullable', 'date'],
            'item_vehicle' => ['required', 'string', 'max:255'],

            'job_order_no' => ['nullable', 'string', 'max:100'],
            'job_order_date' => ['nullable', 'date'],
            'fund_cluster_id' => [
                'nullable', 'string', 'max:20',
                Rule::exists('fund_clusters', 'fund_cluster_id')->whereNull('deleted_at'),
            ],

            'vehicle_type' => ['nullable', 'string', 'max:50'],
            'brand_name' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'plate_no' => ['nullable', 'string', 'max:50'],
            'serial_engine_no' => ['nullable', 'string', 'max:100'],
            'acquisition_date' => ['nullable', 'string', 'max:20'],
            'property_no' => ['nullable', 'string', 'max:100'],

            'inspector_name' => ['nullable', 'string', 'max:150'],
            'inspection_date' => ['nullable', 'date'],
            'invoice_no' => ['nullable', 'string', 'max:255'],
            'invoice_date' => ['nullable', 'string', 'max:255'],

            'defects_complaints' => ['nullable', 'string'],
            'materials' => ['nullable', 'string'],
            'labor_cost' => ['nullable', 'numeric', 'min:0'],

            'office_code' => [
                'nullable', 'string', 'max:20',
                Rule::exists('offices', 'office_code')->whereNull('deleted_at'),
            ],
            'requested_by' => ['nullable', 'string', 'max:150'],
            'received_by' => ['nullable', 'string', 'max:150'],
            'received_date' => ['nullable', 'date'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}