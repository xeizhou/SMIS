<?php

namespace App\Http\Controllers;

use App\Models\EmployeeFileLocator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeFileLocatorController extends Controller
{
    /**
     * Display the Employee File Locator page.
     */
public function index(Request $request): Response
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->string('search')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;

        // 1. Get sort parameters (default to sorting by last_name ascending)
        $sortField = $request->input('sort_field', 'last_name');
        $sortDirection = $request->input('sort_direction', 'asc');

        // 2. Security validation
        $allowedSorts = ['last_name', 'area', 'status'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'last_name';
        }
        $sortDirection = strtolower($sortDirection) === 'desc' ? 'desc' : 'asc';

        $query = EmployeeFileLocator::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('last_name', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('area', 'like', "%{$search}%");
                });
            })
            ->when($status, fn ($query, $status) => $query->where('status', $status));

        // 3. Apply the dynamic sort
        $records = (clone $query)
            ->orderBy($sortField, $sortDirection)
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        $statuses = (clone $query)
            ->select('status')
            ->whereNotNull('status')
            ->where('status', '!=', '')
            ->distinct()
            ->orderBy('status')
            ->pluck('status')
            ->values()
            ->all();

        $statuses = array_values(array_unique(array_merge(['Active', 'Inactive'], $statuses)));

        return Inertia::render('employeefilelocator/index', [
            'records' => $records,
            'filters' => [
                'search' => $search,
                'status' => $status,
                // 4. Pass the sorting state back to React
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
                'per_page' => $perPage,
            ],
            'statuses' => $statuses,
        ]);
    }

    /**
     * Store a newly created employee file record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'last_name' => ['required', 'string', 'max:100'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'area' => ['required', 'string', 'max:100'],
            'status' => ['required', 'string', 'max:50'],
        ]);

        EmployeeFileLocator::create($validated);

        return redirect()->back()->with('success', 'Employee file record added successfully.');
    }

    /**
     * Update the specified employee file record.
     */
    public function update(Request $request, EmployeeFileLocator $employeefilelocator): RedirectResponse
    {
        $validated = $request->validate([
            'last_name' => ['required', 'string', 'max:100'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'area' => ['required', 'string', 'max:100'],
            'status' => ['required', 'string', 'max:50'],
        ]);

        $employeefilelocator->update($validated);

        return redirect()->back()->with('success', 'Employee file record updated successfully.');
    }

    /**
     * Remove the specified employee file record.
     */
    public function destroy(EmployeeFileLocator $employeefilelocator): RedirectResponse
    {
        $employeefilelocator->delete();

        return redirect()->back()->with('success', 'Employee file record archived successfully.');
    }
}
