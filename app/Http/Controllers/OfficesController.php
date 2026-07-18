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
                  ->orWhere('entity_name', 'like', "%{$search}%");
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
        ]);

        Office::create($validated);

        return back()->with('success', 'Office added successfully.');
    }
}