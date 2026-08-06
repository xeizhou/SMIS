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
            ->paginateWithHighlight(10)
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

        return redirect()->back();
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

        return redirect()->back();
    }

    /**
     * Remove the specified bona vida record.
     */
    public function destroy(BonaVidaMonitoring $bonavida): RedirectResponse
    {
        $bonavida->delete();

        return redirect()->back();
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
