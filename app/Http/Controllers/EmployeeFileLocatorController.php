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
        $search = $request->string('search')->toString() ?: null;
        $status = $request->string('status')->toString() ?: null;

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

        $records = (clone $query)
            ->orderBy('last_name')
            ->paginateWithHighlight(10)
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

        return redirect()->back();
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

        return redirect()->back();
    }

    /**
     * Remove the specified employee file record.
     */
    public function destroy(EmployeeFileLocator $employeefilelocator): RedirectResponse
    {
        $employeefilelocator->delete();

        return redirect()->back();
    }
}
