<?php

namespace App\Http\Controllers;

use App\Models\ClearanceOffice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class ClearanceOfficeController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString() ?: null;

        // 1. Get Sort Parameters (Default to alphabetical)
        $sortField = $request->input('sort_field', 'clearance_office_name');
        $sortDirection = $request->input('sort_direction', 'asc');

        // 2. Validate Allowed Sort Fields
        $allowedSorts = ['clearance_office_name'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'clearance_office_name';
        }
        $sortDirection = strtolower($sortDirection) === 'desc' ? 'desc' : 'asc';

        $perPage = $request->integer('per_page', 10);

        $offices = ClearanceOffice::query()
            ->when($search, fn ($q, $s) => $q->where('clearance_office_name', 'like', "%{$s}%"))
            ->orderByRaw("LOWER(clearance_office_name) {$sortDirection}")
            ->orderBy('id')
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        return Inertia::render('clearance/offices', [
            'offices' => $offices,
            'filters' => [
                'search' => $search,
                // 4. Return Sort State
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
                'per_page' => $perPage,
            ],
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

    public function quickAdd(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'clearance_office_name' => [
                'required', 'string', 'max:100',
                Rule::unique('clearance_offices', 'clearance_office_name')->whereNull('deleted_at'),
            ],
        ]);

        $office = ClearanceOffice::create($validated);

        return response()->json([
            'id' => $office->id,
            'clearance_office_name' => $office->clearance_office_name,
        ]);
    }

    public function destroy(Request $request, ClearanceOffice $clearanceOffice): RedirectResponse
    {
        $clearanceCount = $clearanceOffice->clearances()->count();

        if ($clearanceCount > 0) {
            return redirect()->back()->with('error',
                "Cannot archive this office because it has linked records. Please remove them first:\n{$clearanceCount} Linked Clearance" . ($clearanceCount > 1 ? 's' : '')
            );
        }

        $clearanceOffice->archiveMetadata()->create([
            'identity_document' => $clearanceOffice->clearance_office_name,
            'archived_from' => 'Personnel Files > Clearance Office Settings',
            'archived_by' => $request->user()?->id,
        ]);

        $clearanceOffice->delete();

        return redirect()->back()->with('success', 'Office archived successfully.');
    }
}