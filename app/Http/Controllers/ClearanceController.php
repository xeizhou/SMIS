<?php

namespace App\Http\Controllers;

use App\Models\Clearance;
use App\Models\Office;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            ->orderByDesc('claim_date')
            ->paginate(10)
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

        Clearance::create($validated);

        return redirect()->back();
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
        ]);

        if ($validated['cleared'] && $validated['pending']) {
            throw ValidationException::withMessages([
                'pending' => ['Cleared and pending cannot both be true.'],
            ]);
        }

        $clearance->update($validated);

        return redirect()->back();
    }

    /**
     * Remove the specified clearance record.
     */
    public function destroy(Clearance $clearance): RedirectResponse
    {
        $clearance->delete();

        return redirect()->back();
    }
}
