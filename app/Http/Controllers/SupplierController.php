<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierController extends Controller
{
public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $query = Supplier::query();

        // Search Filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('supplier_name', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%")
                    ->orWhere('email_address', 'like', "%{$search}%");
            });
        }

        // Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // 1. Get Sort Parameters (Default to supplier_id desc)
        $sortField = $request->input('sort_field', 'supplier_id');
        $sortDirection = $request->input('sort_direction', 'desc');

        // 2. Validate Allowed Sort Fields
        $allowedSorts = ['supplier_id', 'supplier_name', 'contact_person', 'contact_number', 'email_address', 'status'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'supplier_id';
        }
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        return Inertia::render('supplier/index', [
            'suppliers' => $query
                // 3. Apply Dynamic Sort
                ->orderBy($sortField, $sortDirection)
                ->paginateWithHighlight($perPage)
                ->withQueryString(),

            'filters' => [
                'search' => $request->search,
                'status' => $request->status ?? 'all',
                // 4. Return Sort State
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
                'per_page' => $perPage,
            ],
        ]);
    }
    
    public function quickAdd(Request $request)
    {
        $validated = $request->validate([
            'supplier_name'   => 'required|string|max:255|unique:supplier_list,supplier_name',
            'contact_person'  => 'nullable|string|max:255',
            'contact_number'  => 'nullable|string|max:20',
            'email_address'   => 'nullable|email|max:255',
        ]);

        $validated['status'] = 'active';

        $supplier = Supplier::create($validated);

        return response()->json([
            'supplier_id' => $supplier->supplier_id,
            'supplier_name' => $supplier->supplier_name,
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $expectedHeader = [
            'SUPPLIER NAME',
            'ADDRESS',
            'EMAIL',
            'CONTACT NO.',
            'CONTACT PERSON',
            'POSITION',
        ];

        $handle = fopen($request->file('file')->getRealPath(), 'r');

        if ($handle === false) {
            return back()->withErrors(['file' => 'Could not read the uploaded file.']);
        }

        $headerFound = false;
        $rowsChecked = 0;

        // The standard export sometimes has a blank row before the real header,
        // so scan the first few lines for it instead of assuming line 1.
        while (($row = fgetcsv($handle)) !== false && $rowsChecked < 5) {
            $rowsChecked++;
            $normalized = array_map(fn ($cell) => strtoupper(trim((string) $cell)), $row);
            $normalized = array_slice($normalized, 0, count($expectedHeader));

            if ($normalized === $expectedHeader) {
                $headerFound = true;
                break;
            }
        }

        if (!$headerFound) {
            fclose($handle);

            return back()->withErrors([
                'file' => 'This CSV doesn\'t match the required supplier directory format. '
                    . 'Expected columns: ' . implode(', ', $expectedHeader) . '.',
            ]);
        }

        $imported = 0;
        $skippedDuplicate = 0;
        $skippedBlank = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (count(array_filter($row, fn ($cell) => trim((string) $cell) !== '')) === 0) {
                continue;
            }

            $supplierName = trim((string) ($row[0] ?? ''));
            $email = trim((string) ($row[2] ?? ''));
            $contactNumber = trim((string) ($row[3] ?? ''));
            $contactPerson = trim((string) ($row[4] ?? ''));

            if ($supplierName === '') {
                $skippedBlank++;
                continue;
            }

            if (Supplier::where('supplier_name', $supplierName)->exists()) {
                $skippedDuplicate++;
                continue;
            }

            Supplier::create([
                'supplier_name' => $supplierName,
                'contact_person' => $contactPerson !== '' ? $contactPerson : null,
                'contact_number' => $contactNumber !== '' ? $contactNumber : null,
                'email_address' => filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null,
                'status' => 'active',
            ]);

            $imported++;
        }

        fclose($handle);

        $message = "Imported {$imported} supplier(s).";
        if ($skippedDuplicate) {
            $message .= " Skipped {$skippedDuplicate} duplicate(s).";
        }
        if ($skippedBlank) {
            $message .= " Skipped {$skippedBlank} blank row(s).";
        }

        return back()->with('success', $message);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_name' => [
                'required',
                'string',
                'max:255',
                'unique:supplier_list,supplier_name',
            ],
            'contact_person' => [
                'nullable',
                'string',
                'max:255',
            ],
            'contact_number' => [
                'nullable',
                'string',
                'max:20',
            ],
            'email_address' => [
                'nullable',
                'email',
                'max:255',
            ],
            'status' => [
                'required',
                'in:active,inactive',
            ],
        ]);

        Supplier::create($validated);

        return back()->with('success', 'Supplier added successfully.');
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'supplier_name' => [
                'required',
                'string',
                'max:255',
                'unique:supplier_list,supplier_name,'.$supplier->supplier_id.',supplier_id',
            ],
            'contact_person' => [
                'nullable',
                'string',
                'max:255',
            ],
            'contact_number' => [
                'nullable',
                'string',
                'max:20',
            ],
            'email_address' => [
                'nullable',
                'email',
                'max:255',
            ],
            'status' => [
                'required',
                'in:active,inactive',
            ],
        ]);

        $supplier->update($validated);

        return back()->with('success', 'Supplier updated successfully.');
    }

    public function destroy(Request $request, Supplier $supplier)
    {
        $supplier->archiveMetadata()->create([
            'identity_document' => $supplier->supplier_name,
            'archived_from' => 'Procurement > Supplier List',
            'archived_by' => $request->user()?->id,
        ]);

        $supplier->delete();

        return back()->with('success', 'Supplier archived successfully.');
    }
}