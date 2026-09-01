<?php

namespace App\Http\Controllers;

use App\Models\BonaVidaMonitoring;
use App\Models\Office;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BonaVidaController extends Controller
{
    /**
     * Display the Bona Vida page.
     */
    public function index(Request $request): Response
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->string('search')->toString() ?: null;
        $office_code = $request->string('office_code')->toString() ?: null;

        $query = BonaVidaMonitoring::with('office')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('invoice_no', 'like', "%{$search}%")
                        ->orWhere('remarks', 'like', "%{$search}%");
                });
            })
            ->when($office_code, fn ($query, $office_code) => $query->where('office_code', $office_code));

        $records = (clone $query)
            ->orderBy('date_received', 'desc')
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        $offices = Office::orderBy('office_name')->get();

        return Inertia::render('bona-vida-monitoring/index', [
            'records' => $records,
            'filters' => [
                'search' => $search,
                'office_code' => $office_code,
            ],
            'offices' => $offices,
        ]);
    }

    /**
     * Store a newly created bona vida record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date_received' => ['required', 'date'],
            'office_code' => ['required', 'string', 'exists:offices,office_code'],
            'qty' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'invoice_no' => ['required', 'string', 'max:100'],
            'invoice_date' => ['required', 'date'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        BonaVidaMonitoring::create($validated);

        return redirect()->back()->with('success', 'Bona Vida record added successfully.');
    }

    /**
     * Store multiple bona vida records at once.
     */
    public function bulkStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.date_received' => ['required', 'date'],
            'records.*.office_code' => ['required', 'string', 'exists:offices,office_code'],
            'records.*.qty' => ['required', 'integer', 'min:1'],
            'records.*.price' => ['required', 'numeric', 'min:0'],
            'records.*.total_amount' => ['required', 'numeric', 'min:0'],
            'records.*.invoice_no' => ['required', 'string', 'max:100'],
            'records.*.invoice_date' => ['required', 'date'],
            'records.*.remarks' => ['nullable', 'string', 'max:255'],
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($validated) {
            foreach ($validated['records'] as $recordData) {
                BonaVidaMonitoring::create($recordData);
            }
        });

        return redirect()->back()->with('success', 'Bona Vida records added successfully.');
    }

    /**
     * Get records by invoice number.
     */
    public function getByInvoice($invoice_no)
    {
        $records = BonaVidaMonitoring::with('office')->where('invoice_no', $invoice_no)->get();
        return response()->json($records);
    }

    /**
     * Update multiple bona vida records for an invoice.
     */
    public function bulkUpdate(Request $request, $invoice_no): RedirectResponse
    {
        $validated = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.bvm_id' => ['nullable', 'integer'],
            'records.*.date_received' => ['required', 'date'],
            'records.*.office_code' => ['required', 'string', 'exists:offices,office_code'],
            'records.*.qty' => ['required', 'integer', 'min:1'],
            'records.*.price' => ['required', 'numeric', 'min:0'],
            'records.*.total_amount' => ['required', 'numeric', 'min:0'],
            'records.*.invoice_no' => ['required', 'string', 'max:100'],
            'records.*.invoice_date' => ['required', 'date'],
            'records.*.remarks' => ['nullable', 'string', 'max:255'],
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $invoice_no) {
            $submittedIds = collect($validated['records'])->pluck('bvm_id')->filter()->toArray();

            // Delete records that are no longer in the list for this invoice (fetch to fire events)
            $recordsToDelete = BonaVidaMonitoring::where('invoice_no', $invoice_no)
                ->whereNotIn('bvm_id', $submittedIds)
                ->get();
            
            foreach ($recordsToDelete as $recordToDelete) {
                $recordToDelete->delete();
            }

            // Update or Create
            foreach ($validated['records'] as $recordData) {
                if (!empty($recordData['bvm_id'])) {
                    $model = BonaVidaMonitoring::find($recordData['bvm_id']);
                    if ($model) {
                        $model->update(\Illuminate\Support\Arr::except($recordData, ['bvm_id']));
                    }
                } else {
                    BonaVidaMonitoring::create(\Illuminate\Support\Arr::except($recordData, ['bvm_id']));
                }
            }
        });

        return redirect()->back()->with('success', 'Bona Vida records updated successfully.');
    }

    /**
     * Update the specified bona vida record.
     */
    public function update(Request $request, BonaVidaMonitoring $bonavida): RedirectResponse
    {
        $validated = $request->validate([
            'date_received' => ['required', 'date'],
            'office_code' => ['required', 'string', 'exists:offices,office_code'],
            'qty' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'invoice_no' => ['required', 'string', 'max:100'],
            'invoice_date' => ['required', 'date'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $bonavida->update($validated);

        return redirect()->back()->with('success', 'Bona Vida record updated successfully.');
    }

    /**
     * Remove the specified bona vida record.
     */
    public function destroy(BonaVidaMonitoring $bonavida): RedirectResponse
    {
        $bonavida->delete();

        return redirect()->back()->with('success', 'Bona Vida record archived successfully.');
    }

    /**
     * Display the summary page.
     */
    public function summary(Request $request)
    {
        $dateParam = $request->string('date')->toString() ?: date('Y-m-d');

        // 1. Consumption of each office
        $consumptions = BonaVidaMonitoring::with('office')
            ->whereDate('date_received', $dateParam)
            ->selectRaw('office_code, SUM(qty) as total_qty, SUM(total_amount) as total_amount')
            ->groupBy('office_code')
            ->get()
            ->map(function ($item) {
                return [
                    'office_code' => $item->office_code,
                    'office_name' => $item->office ? $item->office->office_name : $item->office_code,
                    'total_qty' => (int) $item->total_qty,
                    'total_amount' => (float) $item->total_amount,
                ];
            });

        // 2. Billing statement (all records for the date)
        $billing_statements = BonaVidaMonitoring::with('office')
            ->whereDate('date_received', $dateParam)
            ->orderBy('date_received', 'desc')
            ->get();

        // 3. Number of panels delivered for the date
        $total_panels = (int) BonaVidaMonitoring::whereDate('date_received', $dateParam)
            ->sum('qty');

        return response()->json([
            'date' => $dateParam,
            'consumptions' => $consumptions,
            'billing_statements' => $billing_statements,
            'total_panels' => $total_panels,
        ]);
    }
}
