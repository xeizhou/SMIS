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
        $search = $request->input('search');

        $units = Unit::when($search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('unit_name', 'like', "%{$search}%")
                    ->orWhere('unit_short_name', 'like', "%{$search}%");
            });
        })
            ->orderBy('unit_name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('units/index', [
            'units' => $units,
            'filters' => [
                'search' => $search,
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

        return redirect()->back();
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

        return redirect()->back();
    }

    /**
     * Remove the specified unit.
     */
    public function destroy(Unit $unit)
    {
        $unit->delete();

        return redirect()->back();
    }
}
