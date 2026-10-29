<?php

namespace App\Http\Controllers;

use App\Helpers\ValidationHelper;
use App\Mail\OfficeNotificationMail;
use App\Models\Attachment;
use App\Models\Delivery;
use App\Models\FundCluster;
use App\Models\Office;
use App\Models\PirMonitoring;
use App\Models\PoItemDescription;
use App\Models\PoLetterMonitoring;
use App\Models\RrspMonitoring;
use App\Models\ServePo;
use App\Models\StockItem;
use App\Models\Supplier;
use App\Services\DisbursementVoucherService;
use App\Services\PurchaseOrderImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
        $itemDescription = $request->string('item_description')->toString() ?: null;
        $operationalImpact = $request->string('operational_impact')->toString() ?: null;
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
            'item_description' => 'item_description',
            'operational_impact' => 'operational_impact',
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
            ->withExists('deliveries')
            ->withExists(['deliveries as has_cancelled_delivery' => fn ($q) => $q->whereNull('deleted_at')->whereRaw("UPPER(COALESCE(status, '')) = 'CANCELLED'")])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('po_number', 'like', "%{$search}%")
                        ->orWhere('pr_number', 'like', "%{$search}%")
                        ->orWhere('philgeps_reference_no', 'like', "%{$search}%")
                        ->orWhere('end_user', 'like', "%{$search}%")
                        ->orWhere('item_description', 'like', "%{$search}%")
                        ->orWhere('operational_impact', 'like', "%{$search}%")
                        ->orWhereHas('supplier', fn ($q2) => $q2->where('supplier_name', 'like', "%{$search}%"))
                        ->orWhereHas('office', fn ($q2) => $q2->where('office_name', 'like', "%{$search}%"));
                });
            })
            ->when($fundCluster, fn ($query, $fundCluster) => $query->where('fund_cluster_id', $fundCluster))
            ->when($office, fn ($query, $office) => $query->where('end_user', $office))
            ->when($itemDescription, fn ($query, $itemDescription) => $query->where('item_description', $itemDescription))
            ->when($operationalImpact, fn ($query, $operationalImpact) => $query->where('operational_impact', $operationalImpact))
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
                'item_description' => $itemDescription,
                'operational_impact' => $operationalImpact,
                'sort_field' => $sortField ?: null,
                'sort_direction' => $sortDirection,
            ],
            'suppliers' => fn () => Supplier::select('supplier_id', 'supplier_name')
                ->orderByDesc('supplier_id')
                ->get(),
            'fundClusters' => fn () => FundCluster::select('fund_cluster_id', 'fund_description')
                ->orderByDesc('created_at')
                ->get(),
            'offices' => fn () => Office::select('office_code', 'office_name')
                ->orderByDesc('office_code')
                ->get(),
            'stockItems' => fn () => StockItem::select('stock_no', 'item_name', 'description')
                ->orderBy('item_name')
                ->get(),
            'itemDescriptions' => fn () => self::getItemDescriptionsList(),
            'operationalImpacts' => ['HIGH', 'MEDIUM', 'LOW'],
        ]);
    }

    /**
     * Get distinct list of item descriptions strictly from the dedicated po_item_descriptions table.
     */
    public static function getItemDescriptionsList(): array
    {
        return PoItemDescription::orderBy('name')->pluck('name')->toArray();
    }

    /**
     * Store a newly created item description option.
     */
    public function storeItemDescription(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $name = strtoupper(trim($validated['name']));
        $itemDescription = PoItemDescription::firstOrCreate(['name' => $name]);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'id' => $itemDescription->id,
                'name' => $itemDescription->name,
            ]);
        }

        return redirect()->back()->with('success', 'Item description added successfully.');
    }

    /**
     * Store a newly created purchase order.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'po_number' => ['required', 'string', 'max:50', 'unique:serve_po,po_number', 'regex:' . ValidationHelper::pattern('poNo')],
            'item_description' => ['nullable', 'string', 'max:255'],
            'operational_impact' => ['nullable', 'string', Rule::in(['HIGH', 'MEDIUM', 'LOW'])],
            'item_stock_nos' => ['nullable', 'array'],
            'item_stock_nos.*' => ['string', 'exists:stock_items,stock_no'],
            'po_date' => ['nullable', 'date'],
            'po_received_date' => ['nullable', 'date'],
            'inclusive_date' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('inclusiveDate')],
            'delivery_term' => ['nullable', 'integer', 'min:0'],
            'pr_number' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('prNo')],
            'pr_date' => ['nullable', 'date'],
            'philgeps_reference_no' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('philgepsRefNo')],
            'procurement_type' => ['nullable', 'in:Services,Items'],
            'mode_of_procurement' => ['nullable', 'string', 'max:100'],
            'total_amount_abc' => ['nullable', 'numeric', 'min:0'],
            'total_amount_po' => ['nullable', 'numeric', 'min:0'],
            'fund_cluster_id' => ['nullable', 'exists:fund_clusters,fund_cluster_id'],
            'ors_burs_no' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('orsBursNo')],
            'ors_burs_date' => ['nullable', 'date'],
            'responsibility_center' => ['nullable', 'string', 'max:100'],
            'uacs_object_code' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('uacsObjectCode')],
            'supplier_id' => ['nullable', 'exists:supplier_list,supplier_id'],
            'end_user' => ['nullable', 'string', 'exists:offices,office_code'],
            'date_forwarded_to_smu' => ['nullable', 'date'],
            'coa_processed_date' => ['nullable', 'date'],
            'date_forwarded_frontdesk' => ['nullable', 'date'],

            // Workflow tracking fields
            'po_step' => ['nullable', 'string'],
            'po_vpad_forwarded_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'date_forwarded_to_end_user' => ['nullable', 'date'],
            'end_user_forwarded_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'date_forwarded_supplier' => ['nullable', 'date'],
            'forwarded_by_supplier' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'claimed_by_supplier' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'supplier_signature_date' => ['nullable', 'date'],
            'date_forwarded_coa' => ['nullable', 'date'],
            'forwarded_by_coa' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'date_returned_from_coa' => ['nullable', 'date'],
            'coa_date' => ['nullable', 'date'],
            'claim_date' => ['nullable', 'date'],
            'claimed_by_coa' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'date_received_by_supplier' => ['nullable', 'date'],
            'receipt_receiving_date' => ['nullable', 'date'],
            'receipt_claimed_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'items_receiving_date' => ['nullable', 'date'],
            'items_claimed_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'payment_status' => ['nullable', 'string', 'max:100'],
            'ld_amount' => ['nullable', 'numeric', 'min:0'],
            'retention_amount' => ['nullable', 'numeric', 'min:0'],
            'dv_template' => ['nullable', 'string', 'in:ld_only,neither,retention_only,ld_and_retention'],
            'workflow_remarks' => ['nullable', 'string'],
            'invoice_number' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('invoiceDocumentRef')],
            'invoice_date' => ['nullable', 'date'],
            'delivery_receipt' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('deliveryReceiptRef')],
            'par_ics_number' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('parIcsMultiRef')],
            'ris_number' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('risMultiRef')],
            'date_completed' => ['nullable', 'date'],

            // Inspection Entries array
            'inspection_entries' => ['nullable', 'array'],
            'inspection_entries.*.iar_number' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('iarNumber')],
            'inspection_entries.*.inspected_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'inspection_entries.*.inspection_date' => ['nullable', 'date'],
            'date_forwarded_to_finance' => ['nullable', 'date'],
            'finance_forwarded_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],

            // Notified fields
            'po_vpad_notified_date' => ['nullable', 'date'],
            'po_vpad_notified_via' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],
            'coa_stamp_notified_date' => ['nullable', 'date'],
            'coa_stamp_notified_via' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],
            'receipt_claimed_notified_date' => ['nullable', 'date'],
            'receipt_claimed_notified_via' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],
        ], [
            'po_number.regex' => ValidationHelper::message('numbersAndHyphens'),
            'inclusive_date.regex' => ValidationHelper::message('inclusiveDate'),
            'pr_number.regex' => ValidationHelper::message('numbersAndHyphens'),
            'philgeps_reference_no.regex' => ValidationHelper::message('numbersOnly'),
            'ors_burs_no.regex' => ValidationHelper::message('numbersAndHyphens'),
            'uacs_object_code.regex' => ValidationHelper::message('numbersOnly'),
            'po_vpad_forwarded_by.regex' => ValidationHelper::message('names'),
            'end_user_forwarded_by.regex' => ValidationHelper::message('names'),
            'forwarded_by_supplier.regex' => ValidationHelper::message('names'),
            'claimed_by_supplier.regex' => ValidationHelper::message('names'),
            'forwarded_by_coa.regex' => ValidationHelper::message('names'),
            'claimed_by_coa.regex' => ValidationHelper::message('names'),
            'receipt_claimed_by.regex' => ValidationHelper::message('names'),
            'items_claimed_by.regex' => ValidationHelper::message('names'),
            'finance_forwarded_by.regex' => ValidationHelper::message('names'),
            'invoice_number.regex' => ValidationHelper::message('invoiceDocumentRef'),
            'delivery_receipt.regex' => ValidationHelper::message('deliveryReceiptRef'),
            'par_ics_number.regex' => ValidationHelper::message('parIcsMultiRef'),
            'ris_number.regex' => ValidationHelper::message('risMultiRef'),
            'inspection_entries.*.iar_number.regex' => ValidationHelper::message('numbersOnly'),
            'inspection_entries.*.inspected_by.regex' => ValidationHelper::message('names'),
            'po_vpad_notified_via.regex' => ValidationHelper::message('contactInfo'),
            'coa_stamp_notified_via.regex' => ValidationHelper::message('contactInfo'),
            'receipt_claimed_notified_via.regex' => ValidationHelper::message('contactInfo'),
        ]);

        $itemStockNos = $validated['item_stock_nos'] ?? [];
        unset($validated['item_stock_nos']);

        $validated['total_amount_abc'] ??= 0;
        $validated['total_amount_po'] ??= 0;
        $validated['total_amount_diff'] = $validated['total_amount_abc'] - $validated['total_amount_po'];

        $this->updateForwardedByFields($validated);

        $inspectionEntries = $validated['inspection_entries'] ?? [];
        unset($validated['inspection_entries']);

        if (!empty($validated['item_description'])) {
            $validated['item_description'] = trim($validated['item_description']);
            PoItemDescription::firstOrCreate(['name' => strtoupper($validated['item_description'])]);
        }
        if (!empty($validated['operational_impact'])) {
            $validated['operational_impact'] = strtoupper(trim($validated['operational_impact']));
        }

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
     * (deliveries, po_letter_monitoring, pir_monitoring, rrsp_monitoring,
     * inspection entries, the items pivot, attachments) since those FKs are
     * not all set to ON UPDATE CASCADE at the DB level. We defer FK
     * enforcement for the transaction so the rename can happen in one
     * atomic operation regardless of update order.
     */
    public function update(Request $request, ServePo $servePo): RedirectResponse
    {
        \Log::info('Entering PurchaseOrdersController@update for PO: '.$servePo->po_number);

        $validated = $request->validate([
            'po_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('serve_po', 'po_number')->ignore($servePo->po_number, 'po_number'),
                'regex:'.ValidationHelper::pattern('poNo'),
            ],
            'locked_steps' => ['nullable', 'array'],
            'item_stock_nos' => ['nullable', 'array'],
            'item_stock_nos.*' => ['string', 'exists:stock_items,stock_no'],
            'po_date' => ['nullable', 'date'],
            'item_description' => ['nullable', 'string', 'max:255'],
            'operational_impact' => ['nullable', 'string', Rule::in(['HIGH', 'MEDIUM', 'LOW'])],
            'po_received_date' => ['nullable', 'date'],
            'procurement_type' => ['nullable', 'in:Services,Items'],
            'inclusive_date' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('inclusiveDate')],
            'delivery_term' => ['nullable', 'integer', 'min:0'],
            'pr_number' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('prNo')],
            'pr_date' => ['nullable', 'date'],
            'philgeps_reference_no' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('philgepsRefNo')],
            'mode_of_procurement' => ['nullable', 'string', 'max:100'],
            'total_amount_abc' => ['nullable', 'numeric', 'min:0'],
            'total_amount_po' => ['nullable', 'numeric', 'min:0'],
            'fund_cluster_id' => ['nullable', 'exists:fund_clusters,fund_cluster_id'],
            'ors_burs_no' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('orsBursNo')],
            'ors_burs_date' => ['nullable', 'date'],
            'responsibility_center' => ['nullable', 'string', 'max:100'],
            'uacs_object_code' => ['nullable', 'string', 'max:50', 'regex:'.ValidationHelper::pattern('uacsObjectCode')],
            'supplier_id' => ['nullable', 'exists:supplier_list,supplier_id'],
            'end_user' => ['nullable', 'string', 'exists:offices,office_code'],
            'date_forwarded_to_smu' => ['nullable', 'date'],
            'coa_processed_date' => ['nullable', 'date'],
            'date_forwarded_frontdesk' => ['nullable', 'date'],

            // Workflow tracking fields
            'po_step' => ['nullable', 'string'],
            'po_vpad_forwarded_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'date_forwarded_to_end_user' => ['nullable', 'date'],
            'end_user_forwarded_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'date_forwarded_supplier' => ['nullable', 'date'],
            'forwarded_by_supplier' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'claimed_by_supplier' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'supplier_signature_date' => ['nullable', 'date'],
            'date_forwarded_coa' => ['nullable', 'date'],
            'forwarded_by_coa' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'date_returned_from_coa' => ['nullable', 'date'],
            'coa_date' => ['nullable', 'date'],
            'claim_date' => ['nullable', 'date'],
            'claimed_by_coa' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'date_received_by_supplier' => ['nullable', 'date'],
            'receipt_receiving_date' => ['nullable', 'date'],
            'receipt_claimed_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'items_receiving_date' => ['nullable', 'date'],
            'items_claimed_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'payment_status' => ['nullable', 'string', 'max:100'],
            'ld_amount' => ['nullable', 'numeric', 'min:0'],
            'retention_amount' => ['nullable', 'numeric', 'min:0'],
            'dv_template' => ['nullable', 'string', 'in:ld_only,neither,retention_only,ld_and_retention'],
            'workflow_remarks' => ['nullable', 'string'],
            'invoice_number' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('invoiceDocumentRef')],
            'invoice_date' => ['nullable', 'date'],
            'delivery_receipt' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('deliveryReceiptRef')],
            'par_ics_number' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('parIcsMultiRef')],
            'ris_number' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('risMultiRef')],
            'date_completed' => ['nullable', 'date'],

            // Inspection Entries array
            'inspection_entries' => ['nullable', 'array'],
            'inspection_entries.*.iar_number' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('iarNumber')],
            'inspection_entries.*.inspected_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],
            'inspection_entries.*.inspection_date' => ['nullable', 'date'],
            'date_forwarded_to_finance' => ['nullable', 'date'],
            'finance_forwarded_by' => ['nullable', 'string', 'max:255', 'regex:'.ValidationHelper::pattern('nameOrOffice')],

            // Notified fields
            'po_vpad_notified_date' => ['nullable', 'date'],
            'po_vpad_notified_via' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],
            'coa_stamp_notified_date' => ['nullable', 'date'],
            'coa_stamp_notified_via' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],
            'receipt_claimed_notified_date' => ['nullable', 'date'],
            'receipt_claimed_notified_via' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],

            'deleted_attachment_ids.*' => ['integer'],
        ], [
            'po_number.regex' => ValidationHelper::message('numbersAndHyphens'),
            'inclusive_date.regex' => ValidationHelper::message('inclusiveDate'),
            'pr_number.regex' => ValidationHelper::message('numbersAndHyphens'),
            'philgeps_reference_no.regex' => ValidationHelper::message('numbersOnly'),
            'ors_burs_no.regex' => ValidationHelper::message('numbersAndHyphens'),
            'uacs_object_code.regex' => ValidationHelper::message('numbersOnly'),
            'po_vpad_forwarded_by.regex' => ValidationHelper::message('names'),
            'end_user_forwarded_by.regex' => ValidationHelper::message('names'),
            'forwarded_by_supplier.regex' => ValidationHelper::message('names'),
            'claimed_by_supplier.regex' => ValidationHelper::message('names'),
            'forwarded_by_coa.regex' => ValidationHelper::message('names'),
            'claimed_by_coa.regex' => ValidationHelper::message('names'),
            'receipt_claimed_by.regex' => ValidationHelper::message('names'),
            'items_claimed_by.regex' => ValidationHelper::message('names'),
            'finance_forwarded_by.regex' => ValidationHelper::message('names'),
            'invoice_number.regex' => ValidationHelper::message('invoiceDocumentRef'),
            'delivery_receipt.regex' => ValidationHelper::message('deliveryReceiptRef'),
            'par_ics_number.regex' => ValidationHelper::message('parIcsMultiRef'),
            'ris_number.regex' => ValidationHelper::message('risMultiRef'),
            'inspection_entries.*.iar_number.regex' => ValidationHelper::message('numbersOnly'),
            'inspection_entries.*.inspected_by.regex' => ValidationHelper::message('names'),
            'po_vpad_notified_via.regex' => ValidationHelper::message('contactInfo'),
            'coa_stamp_notified_via.regex' => ValidationHelper::message('contactInfo'),
            'receipt_claimed_notified_via.regex' => ValidationHelper::message('contactInfo'),
        ]);

        \Log::info('Validation passed for PO: '.$servePo->po_number);

        $itemStockNos = $request->has('item_stock_nos') ? ($validated['item_stock_nos'] ?? []) : null;
        unset($validated['item_stock_nos']);

        $inspectionEntries = $request->has('inspection_entries') ? ($validated['inspection_entries'] ?? []) : null;
        unset($validated['inspection_entries']);

        $existingLocked = is_array($servePo->locked_steps) ? $servePo->locked_steps : [];
        if ($request->has('locked_steps')) {
            $incomingLocked = is_array($validated['locked_steps'] ?? null) ? $validated['locked_steps'] : [];
            if ($request->user() && $request->user()->isStaff()) {
                // Staff cannot unlock steps; merge incoming with existing locked steps
                $validated['locked_steps'] = array_merge($existingLocked, $incomingLocked);
            } else {
                // Admin has full control
                $validated['locked_steps'] = $incomingLocked;
            }
        }

        // If user is Staff, protect previously locked steps from modification
        if ($request->user() && $request->user()->isStaff() && !empty($existingLocked)) {
            $stepFields = [
                'PO From VPAD' => ['po_received_date', 'po_vpad_forwarded_by', 'po_vpad_notified_date', 'po_vpad_notified_via'],
                'End User' => ['date_forwarded_to_end_user', 'end_user_forwarded_by'],
                'For COA Stamp' => [
                    'date_forwarded_supplier', 'forwarded_by_supplier', 'claimed_by_supplier',
                    'supplier_signature_date', 'date_forwarded_coa', 'forwarded_by_coa',
                    'date_returned_from_coa', 'coa_date', 'claim_date', 'claimed_by_coa',
                    'coa_stamp_notified_date', 'coa_stamp_notified_via',
                ],
                'For Release' => [
                    'date_received_by_supplier', 'receipt_receiving_date', 'receipt_claimed_by',
                    'items_receiving_date', 'items_claimed_by', 'receipt_claimed_notified_date',
                    'receipt_claimed_notified_via',
                ],
                'Payment Processing' => [
                    'payment_status', 'ld_amount', 'retention_amount', 'dv_template',
                    'workflow_remarks', 'invoice_number', 'invoice_date', 'delivery_receipt',
                    'par_ics_number', 'ris_number', 'date_completed',
                ],
                'Forwarded to Finance' => ['date_forwarded_to_finance', 'finance_forwarded_by'],
            ];

            foreach ($existingLocked as $lockedStepName => $lockedTimestamp) {
                if (isset($stepFields[$lockedStepName])) {
                    foreach ($stepFields[$lockedStepName] as $field) {
                        if (array_key_exists($field, $validated)) {
                            $validated[$field] = $servePo->$field;
                        }
                    }
                }
            }
        }

        if ($request->has('total_amount_abc') || $request->has('total_amount_po')) {
            $validated['total_amount_abc'] ??= 0;
            $validated['total_amount_po'] ??= 0;
            $validated['total_amount_diff'] = $validated['total_amount_abc'] - $validated['total_amount_po'];
        }

        // Restrict DV access if no delivery record exists in Delivery Monitoring
        $hasDeliveryRecord = $servePo->deliveries()->exists();
        if (! $hasDeliveryRecord) {
            $currentStep = $request->input('po_step', $servePo->po_step);
            $isPaymentStep = in_array($currentStep, ['Payment Processing', 'Forwarded to Finance'], true);

            if ($isPaymentStep) {
                if ($request->filled('dv_template') && $request->input('dv_template') !== $servePo->dv_template) {
                    throw ValidationException::withMessages([
                        'dv_template' => 'Disbursement Voucher cannot be configured until an existing Delivery Monitoring record is linked to this Purchase Order.',
                    ]);
                }
                if ($request->filled('ld_amount') && (float) $request->input('ld_amount') != (float) $servePo->ld_amount) {
                    throw ValidationException::withMessages([
                        'ld_amount' => 'Disbursement Voucher Liquidated Damages cannot be set until an existing Delivery Monitoring record is linked to this Purchase Order.',
                    ]);
                }
                if ($request->filled('retention_amount') && (float) $request->input('retention_amount') != (float) $servePo->retention_amount) {
                    throw ValidationException::withMessages([
                        'retention_amount' => 'Disbursement Voucher Retention cannot be set until an existing Delivery Monitoring record is linked to this Purchase Order.',
                    ]);
                }
            }
            unset($validated['dv_template'], $validated['ld_amount'], $validated['retention_amount']);
        }

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
            }

            if (array_key_exists('item_description', $validated) && !empty($validated['item_description'])) {
                $validated['item_description'] = trim($validated['item_description']);
                PoItemDescription::firstOrCreate(['name' => strtoupper($validated['item_description'])]);
            }
            if (array_key_exists('operational_impact', $validated) && !empty($validated['operational_impact'])) {
                $validated['operational_impact'] = strtoupper(trim($validated['operational_impact']));
            }

            // Relation work runs FIRST, while $servePo still holds the OLD po_number,
            // so sync()/delete() find the existing rows.
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

            // Then point every child table at the new po_number.
            if ($poNumberChanged) {
                $this->cascadePoNumberRename($servePo, $oldPoNumber, $newPoNumber);
            }

            // Finally update the PO itself (this changes the key if it was renamed).
            $servePo->update($validated);

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
     * Point every table that references serve_po.po_number at the new value.
     * Table and column names for relations are read from the relationships
     * themselves, so they stay correct if the schema changes.
     */
    private function cascadePoNumberRename(ServePo $servePo, string $old, string $new): void
    {
        // hasMany relations on ServePo
        foreach (['deliveries', 'letterMonitorings', 'inspectionEntries'] as $relationName) {
            $relation = $servePo->{$relationName}();
            $column = $relation->getForeignKeyName();

            DB::table($relation->getRelated()->getTable())
                ->where($column, $old)
                ->update([$column => $new]);
        }

        // items() many-to-many pivot table
        $items = $servePo->items();
        $pivotColumn = $items->getForeignPivotKeyName();

        DB::table($items->getTable())
            ->where($pivotColumn, $old)
            ->update([$pivotColumn => $new]);

        // Monitoring tables linked by po_number
        RrspMonitoring::where('po_number', $old)->update(['po_number' => $new]);
        PirMonitoring::where('po_number', $old)->update(['po_number' => $new]);

        // Polymorphic attachments
        Attachment::where('attachable_type', ServePo::class)
            ->where('attachable_id', $old)
            ->update(['attachable_id' => $new]);
    }

    /**
     * Archive the specified purchase order.
     */
    public function destroy(Request $request, ServePo $purchaseOrder): RedirectResponse
    {
        $deliveries = $purchaseOrder->deliveries()->get();
        $letters = $purchaseOrder->letterMonitorings()->get();
        $rrsps = RrspMonitoring::where('po_number', $purchaseOrder->po_number)->get();

        if ($deliveries->count() > 0 || $letters->count() > 0 || $rrsps->count() > 0) {
            $parts = [];

            if ($rrsps->count() > 0) {
                $count = $rrsps->count();
                $str = "{$count} Linked RRSP".($count > 1 ? 's' : '')."\n";
                foreach ($rrsps as $rrsp) {
                    $str .= "- RRSP No.: {$rrsp->rrsp_no}\n";
                }
                $parts[] = rtrim($str);
            }

            if ($deliveries->count() > 0) {
                $count = $deliveries->count();
                $str = "{$count} Linked Delivery Record".($count > 1 ? 's' : '')."\n";
                foreach ($deliveries as $del) {
                    $str .= "- Delivery No.: {$del->delivery_id}\n";
                }
                $parts[] = rtrim($str);
            }

            if ($letters->count() > 0) {
                $count = $letters->count();
                $str = "{$count} Linked P.O. Letter".($count > 1 ? 's' : '')."\n";
                foreach ($letters as $letter) {
                    $str .= "- P.O. Letter No.: {$letter->reference_no}\n";
                }
                $parts[] = rtrim($str);
            }

            return redirect()->back()->with('error',
                "This Purchase Order has linked records. Please remove them first:\n".implode("\n", $parts)
            );
        }

        // Create an archive record before soft deleting
        $purchaseOrder->archiveMetadata()->create([
            'identity_document' => $purchaseOrder->po_number,
            'archived_from' => 'Procurement > Purchase Orders',
            'archived_by' => $request->user()?->id,
        ]);

        $purchaseOrder->delete(); // This will soft delete now

        return redirect()->back()->with('success', 'Purchase order archived successfully.');
    }

    public function uploadAttachments(Request $request, ServePo $purchaseOrder)
    {
        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB each
        ]);

        foreach ($request->file('files') as $file) {
            $path = $file->store('po-attachments/'.$purchaseOrder->po_number, 'public');

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
            if (! empty($validated[$dateField]) && empty($validated[$byField])) {
                $validated[$byField] = $userName;
            }
        }
    }

    /**
     * Notify the office about the Purchase Order.
     */
    public function notifyOffice(Request $request, ServePo $purchaseOrder): RedirectResponse
    {
        $request->validate([
            'email' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],
        ], [
            'email.regex' => ValidationHelper::message('contactInfo'),
        ]);

        $email = $request->input('email');

        if (! $email) {
            $office = $purchaseOrder->office;
            $email = $office ? $office->email : null;
        }

        if (! $email) {
            return back()->with('error', 'No email address found for the office and none provided.');
        }

        // We check if the email is an actual email address (using string validation to allow phone numbers in the DB field, but only email here if it has an @)
        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Mail::to($email)->send(new OfficeNotificationMail($purchaseOrder));
        }

        $purchaseOrder->update([
            'po_vpad_notified_date' => now(),
            'po_vpad_notified_via' => $email,
        ]);

        return back()->with('success', 'Office notified successfully.');
    }

    public function notifyCoa(Request $request, ServePo $purchaseOrder): RedirectResponse
    {
        $request->validate([
            'email' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],
        ], [
            'email.regex' => ValidationHelper::message('contactInfo'),
        ]);

        $email = $request->input('email');

        if (! $email) {
            $office = $purchaseOrder->office;
            $email = $office ? $office->email : null;
        }

        if (! $email) {
            return back()->with('error', 'No email address found for the office and none provided.');
        }

        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Mail::to($email)->send(new OfficeNotificationMail($purchaseOrder));
        }

        $purchaseOrder->update([
            'coa_stamp_notified_date' => now(),
            'coa_stamp_notified_via' => $email,
        ]);

        return back()->with('success', 'COA/Office notified successfully.');
    }

    public function notifyRelease(Request $request, ServePo $purchaseOrder): RedirectResponse
    {
        $request->validate([
            'email' => ['nullable', 'string', 'max:100', 'regex:'.ValidationHelper::pattern('contactInfo')],
        ], [
            'email.regex' => ValidationHelper::message('contactInfo'),
        ]);

        $email = $request->input('email');

        if (! $email) {
            $office = $purchaseOrder->office;
            $email = $office ? $office->email : null;
        }

        if (! $email) {
            return back()->with('error', 'No email address found for the office and none provided.');
        }

        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Mail::to($email)->send(new OfficeNotificationMail($purchaseOrder));
        }

        $purchaseOrder->update([
            'receipt_claimed_notified_date' => now(),
            'receipt_claimed_notified_via' => $email,
        ]);

        return back()->with('success', 'Recipient/Office notified successfully.');
    }

    /**
     * Import Purchase Orders from uploaded CSV or Excel file.
     */
    public function import(Request $request, PurchaseOrderImportService $importService): RedirectResponse
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
            return back()->withErrors(['file' => 'Import failed: '.$e->getMessage()]);
        }

        $message = "Imported {$result['created']} purchase order(s).";
        if ($result['updated'] > 0) {
            $message .= " Updated {$result['updated']} existing purchase order(s).";
        }
        if (count($result['skipped']) > 0) {
            $message .= ' Skipped '.count($result['skipped']).' row(s).';
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
     * Download or preview Purchase Orders import template (CSV).
     */
    public function importTemplate(Request $request, PurchaseOrderImportService $importService)
    {
        if ($request->boolean('preview')) {
            return response()->json($importService->getTemplatePreview());
        }

        return $importService->downloadTemplate();
    }

    /**
     * Check whether a Purchase Order is eligible for Disbursement Voucher processing.
     */
    public function checkDvEligibility(ServePo $purchaseOrder): JsonResponse
    {
        $hasDelivery = $purchaseOrder->deliveries()->exists();
        $count = $hasDelivery ? $purchaseOrder->deliveries()->count() : 0;

        return response()->json([
            'eligible' => $hasDelivery,
            'po_number' => $purchaseOrder->po_number,
            'delivery_count' => $count,
            'message' => $hasDelivery
                ? 'Eligible for Disbursement Voucher processing.'
                : 'No matching Delivery Monitoring record found for this Purchase Order.',
        ]);
    }

    /**
     * Export the Disbursement Voucher as an Excel spreadsheet (LD-Only or Neither Template).
     */
    public function exportDisbursementVoucher(Request $request, ServePo $purchaseOrder, DisbursementVoucherService $dvService): StreamedResponse
    {
        if (! $purchaseOrder->deliveries()->exists()) {
            abort(403, 'A Delivery Monitoring record is required before accessing or exporting the Disbursement Voucher.');
        }

        $template = $request->query('template', $purchaseOrder->dv_template ?: 'ld_only');

        if (! in_array($template, ['ld_only', 'neither', 'neither_ld_nor_retention', 'retention_only', 'ld_and_retention', 'both'], true)) {
            abort(400, 'Invalid DV template requested.');
        }

        $safePo = preg_replace('/[^A-Za-z0-9_-]/', '_', $purchaseOrder->po_number);

        if ($template === 'neither' || $template === 'neither_ld_nor_retention') {
            $spreadsheet = $dvService->generateNeitherExcel($purchaseOrder);
            $filename = "Disbursement_Voucher_Neither_{$safePo}_".now()->format('Ymd_His').'.xlsx';
        } elseif ($template === 'retention_only') {
            $poAmount = (float) ($purchaseOrder->total_amount_po ?? 0);

            if ($request->has('retention_amount') && $request->query('retention_amount') !== '') {
                $rawRetention = $request->query('retention_amount');
                if (! is_numeric($rawRetention) || (float) $rawRetention < 0 || (float) $rawRetention > $poAmount) {
                    abort(422, 'Invalid Retention amount.');
                }
                $retentionAmount = (float) $rawRetention;
            } elseif ($purchaseOrder->retention_amount !== null && (float) $purchaseOrder->retention_amount > 0) {
                $retentionAmount = (float) $purchaseOrder->retention_amount;
            } else {
                $retentionAmount = round($poAmount * 0.01, 2);
            }

            $spreadsheet = $dvService->generateRetentionOnlyExcel($purchaseOrder, $retentionAmount);
            $filename = "Disbursement_Voucher_Retention_{$safePo}_".now()->format('Ymd_His').'.xlsx';
        } elseif ($template === 'ld_and_retention' || $template === 'both') {
            $poAmount = (float) ($purchaseOrder->total_amount_po ?? 0);

            if ($request->has('ld_amount') && $request->query('ld_amount') !== '') {
                $rawLd = $request->query('ld_amount');
                if (! is_numeric($rawLd) || (float) $rawLd < 0 || (float) $rawLd > $poAmount) {
                    abort(422, 'Invalid LD amount.');
                }
                $ldAmount = (float) $rawLd;
            } else {
                $ldAmount = (float) ($purchaseOrder->ld_amount ?? 0);
            }

            if ($request->has('retention_amount') && $request->query('retention_amount') !== '') {
                $rawRetention = $request->query('retention_amount');
                if (! is_numeric($rawRetention) || (float) $rawRetention < 0 || (float) $rawRetention > $poAmount) {
                    abort(422, 'Invalid Retention amount.');
                }
                $retentionAmount = (float) $rawRetention;
            } elseif ($purchaseOrder->retention_amount !== null && (float) $purchaseOrder->retention_amount > 0) {
                $retentionAmount = (float) $purchaseOrder->retention_amount;
            } else {
                $retentionAmount = round($poAmount * 0.01, 2);
            }

            $spreadsheet = $dvService->generateBothExcel($purchaseOrder, $ldAmount, $retentionAmount);
            $filename = "Disbursement_Voucher_Both_{$safePo}_".now()->format('Ymd_His').'.xlsx';
        } else {
            $poAmount = (float) ($purchaseOrder->total_amount_po ?? 0);

            if ($request->has('ld_amount') && $request->query('ld_amount') !== '') {
                $rawLd = $request->query('ld_amount');
                if (! is_numeric($rawLd) || (float) $rawLd < 0 || (float) $rawLd > $poAmount) {
                    abort(422, 'Invalid LD amount.');
                }
                $ldAmount = (float) $rawLd;
            } else {
                $ldAmount = (float) ($purchaseOrder->ld_amount ?? 0);
            }

            $spreadsheet = $dvService->generateLdOnlyExcel($purchaseOrder, $ldAmount);
            $filename = "Disbursement_Voucher_LD_{$safePo}_".now()->format('Ymd_His').'.xlsx';
        }

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->setPreCalculateFormulas(true);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}