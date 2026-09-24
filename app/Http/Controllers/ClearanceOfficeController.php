<?php

namespace App\Http\Controllers;

use App\Models\ClearanceOffice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClearanceOfficeController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString() ?: null;

        $offices = ClearanceOffice::query()
            ->when($search, fn ($q, $s) => $q->where('clearance_office_name', 'like', "%{$s}%"))
            ->orderBy('clearance_office_name')
            ->paginateWithHighlight($request->integer('per_page', 10))
            ->withQueryString();

        return Inertia::render('clearance/offices', [
            'offices' => $offices,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'clearance_office_name' => ['required', 'string', 'max:100', 'unique:clearance_offices,clearance_office_name'],
        ]);

        ClearanceOffice::create($validated);

        return redirect()->back()->with('success', 'Office added successfully.');
    }

    public function update(Request $request, ClearanceOffice $clearanceOffice): RedirectResponse
    {
        $validated = $request->validate([
            'clearance_office_name' => [
                'required', 'string', 'max:100',
                Rule::unique('clearance_offices', 'clearance_office_name')->ignore($clearanceOffice->id),
            ],
        ]);

        $clearanceOffice->update($validated);

        return redirect()->back()->with('success', 'Office updated successfully.');
    }

    public function destroy(ClearanceOffice $clearanceOffice): RedirectResponse
    {
        if ($clearanceOffice->clearances()->exists()) {
            return redirect()->back()->with('error', 'This office is used by existing clearance records.');
        }

        $clearanceOffice->delete();

        return redirect()->back()->with('success', 'Office deleted successfully.');
    }
}