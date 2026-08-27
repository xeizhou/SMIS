<?php

namespace App\Http\Controllers;

use App\Models\FundCluster;
use App\Models\RegspiMonitoring;
use App\Models\RrspMonitoring;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RegSPIController extends Controller
{
    /**
     * Display the RegSPI page.
     */
    public function index(Request $request): Response
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->string('search')->toString() ?: null;
        $rrspNo = $request->string('rrsp_no')->toString() ?: null;
        $fundClusterId = $request->string('fund_cluster_id')->toString() ?: null;

        $regspis = RegspiMonitoring::query()
            ->with(['rrspMonitoring:rrsp_no,item_description', 'fundCluster:fund_cluster_id,fund_description'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('month_year', 'like', "%{$search}%")
                        ->orWhere('ics_no', 'like', "%{$search}%")
                        ->orWhere('semi_expendable_property_no', 'like', "%{$search}%")
                        ->orWhere('item_description', 'like', "%{$search}%")
                        ->orWhere('rrsp_no', 'like', "%{$search}%")
                        ->orWhereHas('rrspMonitoring', fn ($rrspQuery) => $rrspQuery->where('item_description', 'like', "%{$search}%"));
                });
            })
            ->when($rrspNo, fn ($query, $rrspNo) => $query->where('rrsp_no', $rrspNo))
            ->when($fundClusterId, fn ($query, $fundClusterId) => $query->where('fund_cluster_id', $fundClusterId))
            ->orderByDesc('created_at')
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        return Inertia::render('regspi-monitoring/index', [
            'regspis' => $regspis,
            'filters' => [
                'search' => $search,
                'rrsp_no' => $rrspNo,
                'fund_cluster_id' => $fundClusterId,
            ],
            'rrsps' => RrspMonitoring::select('id', 'rrsp_no')
                ->with('items')
                ->orderByDesc('created_at')
                ->get(),
            'fundClusters' => FundCluster::select('fund_cluster_id', 'fund_description')
                ->orderByDesc('created_at')
                ->get(),
        ]);
    }

    /**
     * Store a newly created RegSPI record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'month_year' => ['required', 'string', 'max:20'],
            'ics_no' => ['nullable', 'string', 'max:50'],
            'rrsp_no' => ['nullable', 'string', 'max:50', 'exists:rrsp_monitoring,rrsp_no'],
            'fund_cluster_id' => ['nullable', 'string', 'max:20', 'exists:fund_clusters,fund_cluster_id'],
            'semi_expendable_property_no' => ['required', 'string', 'max:100'],
            'item_description' => ['nullable', 'string', 'max:255'],
            'estimated_useful_life' => ['nullable', 'integer', 'min:0'],
            'issued_qty' => ['nullable', 'integer', 'min:0'],
            'issued_office_officer' => ['nullable', 'string', 'max:255'],
            'returned_qty' => ['nullable', 'integer', 'min:0'],
            'returned_office_officer' => ['nullable', 'string', 'max:255'],
            'reissued_qty' => ['nullable', 'integer', 'min:0'],
            'reissued_office_officer' => ['nullable', 'string', 'max:255'],
            'disposed_qty' => ['nullable', 'integer', 'min:0'],
            'balance_qty' => ['nullable', 'integer', 'min:0'],
            'amount' => ['required', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:255'],
            
        ]);



        $validated['issued_qty'] = (int) ($validated['issued_qty'] ?? 0);
        $validated['returned_qty'] = (int) ($validated['returned_qty'] ?? 0);
        $validated['reissued_qty'] = (int) ($validated['reissued_qty'] ?? 0);
        $validated['disposed_qty'] = (int) ($validated['disposed_qty'] ?? 0);
        $validated['balance_qty'] = ($validated['issued_qty'] - $validated['returned_qty'] + $validated['reissued_qty'] - $validated['disposed_qty']);

        RegspiMonitoring::create($validated);

        return redirect()->back()->with('success', 'RegSPI record added successfully.');
    }

    /**
     * Update the specified RegSPI record.
     */
    public function update(Request $request, RegspiMonitoring $regspi): RedirectResponse
    {
        $validated = $request->validate([
            'month_year' => ['required', 'string', 'max:20'],
            'ics_no' => ['nullable', 'string', 'max:50'],
            'rrsp_no' => ['nullable', 'string', 'max:50', 'exists:rrsp_monitoring,rrsp_no'],
            'fund_cluster_id' => ['nullable', 'string', 'max:20', 'exists:fund_clusters,fund_cluster_id'],
            'semi_expendable_property_no' => ['required', 'string', 'max:100'],
            'item_description' => ['nullable', 'string', 'max:255'],
            'estimated_useful_life' => ['nullable', 'integer', 'min:0'],
            'issued_qty' => ['nullable', 'integer', 'min:0'],
            'issued_office_officer' => ['nullable', 'string', 'max:255'],
            'returned_qty' => ['nullable', 'integer', 'min:0'],
            'returned_office_officer' => ['nullable', 'string', 'max:255'],
            'reissued_qty' => ['nullable', 'integer', 'min:0'],
            'reissued_office_officer' => ['nullable', 'string', 'max:255'],
            'disposed_qty' => ['nullable', 'integer', 'min:0'],
            'balance_qty' => ['nullable', 'integer', 'min:0'],
            'amount' => ['required', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);



        $validated['issued_qty'] = (int) ($validated['issued_qty'] ?? 0);
        $validated['returned_qty'] = (int) ($validated['returned_qty'] ?? 0);
        $validated['reissued_qty'] = (int) ($validated['reissued_qty'] ?? 0);
        $validated['disposed_qty'] = (int) ($validated['disposed_qty'] ?? 0);
        $validated['balance_qty'] = ($validated['issued_qty'] - $validated['returned_qty'] + $validated['reissued_qty'] - $validated['disposed_qty']);

        $regspi->update($validated);

        return redirect()->back()->with('success', 'RegSPI record updated successfully.');
    }

    /**
     * Remove the specified RegSPI record.
     */
    public function destroy(RegspiMonitoring $regspi): RedirectResponse
    {
        $regspi->delete();

        return redirect()->back()->with('success', 'RegSPI record archived successfully.');
    }
}
