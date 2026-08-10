<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query();

        // Search
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('supplier_name', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%")
                    ->orWhere('email_address', 'like', "%{$search}%");
            });
        }

        // Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return Inertia::render('supplier/index', [
            'suppliers' => $query
                ->orderBy('supplier_id', 'asc')
                ->paginateWithHighlight(10)
                ->withQueryString(),

            'filters' => [
                'search' => $request->search,
                'status' => $request->status ?? 'all',
            ],
        ]);
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
            'contact_number' => [
                'nullable',
                'string',
                'max:20',
            ],
            'contact_person' => [
                'nullable',
                'string',
                'max:255',
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

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return back()->with('success', 'Supplier deleted successfully.');
    }

    public function export(Request $request): StreamedResponse
    {
        $query = Supplier::query();

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('supplier_name', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%")
                    ->orWhere('email_address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $suppliers = $query->orderBy('supplier_id', 'asc')->get();

        $filename = 'suppliers_'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($suppliers) {
            $handle = fopen('php://output', 'w');

            // BOM so Excel opens UTF-8 correctly
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['Supplier Name', 'Contact Person', 'Contact Number', 'Email Address', 'Status']);

            foreach ($suppliers as $supplier) {
                fputcsv($handle, [
                    $supplier->supplier_name,
                    $supplier->contact_person,
                    $supplier->contact_number,
                    $supplier->email_address,
                    $supplier->status,
                ]);
}

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $handle = fopen($request->file('file')->getRealPath(), 'r');

        // Skip any leading blank rows until we hit the real header row
        $header = null;
        $rowNum = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;

            $clean = array_map(fn ($c) => trim((string) $c), $row);

            if (isset($clean[0])) {
                $clean[0] = preg_replace('/^\xEF\xBB\xBF/', '', $clean[0]);
            }

            if (strtoupper($clean[0] ?? '') === 'SUPPLIER NAME') {
                $header = $clean;
                break;
            }

            // bail out if we scan too far without finding a header
            if ($rowNum > 5) {
                break;
            }
        }

        if (!$header) {
            fclose($handle);

            return back()->with('error', 'Could not find a "Supplier Name" header column in the file.');
        }

        // Map column name (uppercased) -> index, so column order doesn't matter
        $map = [];
        foreach ($header as $i => $col) {
            $map[strtoupper(trim($col))] = $i;
        }

        $idxName = $map['SUPPLIER NAME'] ?? null;
        $idxContactPerson = $map['CONTACT PERSON'] ?? null;
        $idxContactNumber = $map['CONTACT NO.'] ?? $map['CONTACT NUMBER'] ?? null;
        $idxEmail = $map['EMAIL'] ?? $map['EMAIL ADDRESS'] ?? null;
        $idxStatus = $map['STATUS'] ?? null;
        // ADDRESS and POSITION columns are intentionally ignored

        if ($idxName === null) {
            fclose($handle);

            return back()->with('error', 'Missing required column: Supplier Name.');
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];
        $row = $rowNum;

        DB::beginTransaction();

        try {
            while (($data = fgetcsv($handle)) !== false) {
                $row++;

                if (count(array_filter($data)) === 0) {
                    continue;
                }

                $name = trim((string) ($data[$idxName] ?? ''));

                if ($name === '') {
                    $skipped++;
                    $errors[] = "Row {$row}: missing supplier name.";
                    continue;
                }

                $status = $idxStatus !== null
                    ? strtolower(trim((string) ($data[$idxStatus] ?? '')))
                    : '';

                if (!in_array($status, ['active', 'inactive'], true)) {
                    $status = 'active';
                }

                if (Supplier::where('supplier_name', $name)->exists()) {
                    $skipped++;
                    $errors[] = "Row {$row}: '{$name}' already exists.";
                    continue;
                }

                Supplier::create([
                    'supplier_name' => $name,
                    'contact_person' => $idxContactPerson !== null
                        ? (trim((string) ($data[$idxContactPerson] ?? '')) ?: null)
                        : null,
                    'contact_number' => $idxContactNumber !== null
                        ? (trim((string) ($data[$idxContactNumber] ?? '')) ?: null)
                        : null,
                    'email_address' => $idxEmail !== null
                        ? (trim((string) ($data[$idxEmail] ?? '')) ?: null)
                        : null,
                    'status' => $status,
                ]);

                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            fclose($handle);

            return back()->with('error', 'Import failed: '.$e->getMessage());
        }

        fclose($handle);

        $message = "Imported {$imported} supplier(s).";
        if ($skipped > 0) {
            $message .= " Skipped {$skipped}.";
        }

        return back()->with('success', $message)->with('importErrors', $errors);
    }
}