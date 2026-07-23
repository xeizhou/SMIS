<?php

namespace App\Http\Controllers;

use App\Models\Office;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OfficesController extends Controller
{
    public function index(Request $request)
    {
        $query = Office::query();

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('office_code', 'like', "%{$search}%")
                    ->orWhere('office_name', 'like', "%{$search}%")
                    ->orWhere('entity_name', 'like', "%{$search}%")
                    ->orWhere('office_head', 'like', "%{$search}%");
            });
        }

        return Inertia::render('offices/index', [
            'offices' => $query
                ->orderBy('office_name')
                ->paginate(10)
                ->withQueryString(),

            'filters' => [
                'search' => $request->search,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'office_code' => [
                'required',
                'string',
                'max:20',
                'unique:offices,office_code',
            ],
            'office_name' => [
                'required',
                'string',
                'max:255',
            ],
            'entity_name' => [
                'nullable',
                'string',
                'max:255',
            ],
            'office_head' => [
                'nullable',
                'string',
                'max:150',
            ],
        ]);

        Office::create($validated);

        return back()->with('success', 'Office added successfully.');
    }

    public function update(Request $request, Office $office)
    {
        $validated = $request->validate([
            'office_name' => [
                'required',
                'string',
                'max:255',
            ],
            'entity_name' => [
                'nullable',
                'string',
                'max:255',
            ],
            'office_head' => [
                'nullable',
                'string',
                'max:150',
            ],
        ]);

        $office->update($validated);

        return back()->with('success', 'Office updated successfully.');
    }

    public function destroy(Office $office)
    {
        $office->delete();

        return back()->with('success', 'Office deleted successfully.');
    }
}
