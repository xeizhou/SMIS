<?php

namespace App\Http\Controllers;

use App\Models\Area;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RrppeAreaController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        
        $areas = Area::when($search, function ($query, $search) {
            $query->where('name', 'like', "%{$search}%");
        })
        ->orderBy('name')
        ->paginate(10)
        ->withQueryString();

        return Inertia::render('rrppe-monitoring/areas', [
            'areas' => $areas,
            'filters' => ['search' => $search]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:areas,name'
        ]);

        Area::create($validated);

        return back()->with('success', 'Area added successfully.');
    }

    public function update(Request $request, Area $area)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:areas,name,' . $area->id
        ]);

        $area->update($validated);

        return back()->with('success', 'Area updated successfully.');
    }

    public function destroy(Area $area)
    {
        $area->delete();

        return back()->with('success', 'Area deleted successfully.');
    }
}
