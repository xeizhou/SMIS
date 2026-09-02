<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnitsController extends Controller
{
    /**
     * Display the Units page.
     */
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->input('search');

        // 1. Get the sorting parameters (defaulting to unitID descending)
        $sortField = $request->input('sort_field', 'unitID');
        $sortDirection = $request->input('sort_direction', 'desc');

        // 2. Validate the sort field to prevent SQL injection
        $allowedSorts = ['unitID', 'unit_name', 'unit_short_name'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'unitID';
        }

        // Validate the sort direction
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $units = Unit::when($search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('unit_name', 'like', "%{$search}%")
                    ->orWhere('unit_short_name', 'like', "%{$search}%");
            });
        })
            // 3. Apply the dynamic sorting
            ->orderBy($sortField, $sortDirection)
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        return Inertia::render('units/index', [
            'units' => $units,
            'filters' => [
                'search' => $search,
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Store a newly created unit.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'unit_name' => 'required|string|max:255',
            'unit_short_name' => 'required|string|max:255',
        ]);

        Unit::create($validated);

        return redirect()->back()->with('success', 'Unit added successfully.');
    }

    /**
     * Update the specified unit.
     */
    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'unit_name' => 'required|string|max:255',
            'unit_short_name' => 'required|string|max:255',
        ]);

        $unit->update($validated);

        return redirect()->back()->with('success', 'Unit updated successfully.');
    }

    /**
     * Remove the specified unit.
     */
    public function destroy(Unit $unit)
    {
        try {
            $unit->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000') {
                return back()->with('error', 'Cannot delete this unit — it is still used by existing stock items.');
            }
            throw $e;
        }

        return back()->with('success', 'Unit archived successfully.');
    }
}