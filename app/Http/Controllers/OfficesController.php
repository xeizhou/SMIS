<?php

namespace App\Http\Controllers;

use App\Models\Office;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Mail\EmailFunction;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;

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
                    ->orWhere('office_head', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return Inertia::render('offices/index', [
            'offices' => $query
                // Offices table has no timestamps; show newest by office_code desc
                ->orderByDesc('office_code')
                ->paginateWithHighlight(10)
                ->withQueryString(),

            'filters' => [
                'search' => $request->search,
            ],
        ]);
    }

    public function sendTestEmail(Request $request, Office $office)
    {
        if (!$office->email) {
            return back()->with('error', "No email address on file for {$office->office_name}.");
        }

        $validated = $request->validate([
            'type' => 'required|in:' . implode(',', EmailFunction::TYPES),
            'po_number' => 'nullable|string',
            'supplier_name' => 'nullable|string',
        ]);

        Mail::to($office->email)->send(
            new EmailFunction(
                $office,
                $validated['type'],
                $validated['po_number'] ?? null,
                $validated['supplier_name'] ?? null
            )
        );

        return back()->with('success', "Email sent to {$office->office_name} ({$office->email}).");
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
            'email' => [
                'nullable',
                'email',
                'max:255',
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
            'email' => [
                'nullable',
                'email',
                'max:255',
            ],
        ]);

        $office->update($validated);

        return back()->with('success', 'Office updated successfully.');
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
{
    $query = Office::query();

    if ($request->filled('search')) {
        $search = $request->search;

        $query->where(function ($q) use ($search) {
            $q->where('office_code', 'like', "%{$search}%")
                ->orWhere('office_name', 'like', "%{$search}%")
                ->orWhere('entity_name', 'like', "%{$search}%")
                ->orWhere('office_head', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%");
        });
    }

    $offices = $query->orderBy('office_code', 'asc')->get();

    $filename = 'offices_'.now()->format('Y-m-d_His').'.csv';

    return response()->streamDownload(function () use ($offices) {
        $handle = fopen('php://output', 'w');

        // BOM so Excel opens UTF-8 correctly
        fwrite($handle, "\xEF\xBB\xBF");

        fputcsv($handle, ['Office Code', 'Office Name', 'Entity Name', 'Office Head', 'Email']);

        foreach ($offices as $office) {
            fputcsv($handle, [
                $office->office_code,
                $office->office_name,
                $office->entity_name,
                $office->office_head,
                $office->email,
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

        // Skip any leading blank/title rows (e.g. "EMAIL DIRECTORY") until we hit the real header
        $header = null;
        $rowNum = 0;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;

            $clean = array_map(fn ($c) => trim((string) $c), $row);

            if (isset($clean[0])) {
                $clean[0] = preg_replace('/^\xEF\xBB\xBF/', '', $clean[0]);
            }

            if (strtoupper($clean[0] ?? '') === 'OFFICE CODE') {
                $header = $clean;
                break;
            }

            if ($rowNum > 5) {
                break;
            }
        }

        if (!$header) {
            fclose($handle);

            return back()->with('error', 'Could not find an "Office Code" header column in the file.');
        }

        $map = [];
        foreach ($header as $i => $col) {
            $map[strtoupper(trim($col))] = $i;
        }

        $idxCode = $map['OFFICE CODE'] ?? null;
        $idxName = $map['OFFICE NAME'] ?? null;
        $idxEntity = $map['ENTITY NAME'] ?? null;
        $idxHead = $map['OFFICE HEAD'] ?? null;
        $idxEmail = $map['EMAIL'] ?? null;

        if ($idxCode === null) {
            fclose($handle);

            return back()->with('error', 'Missing required column: Office Code.');
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

                $code = trim((string) ($data[$idxCode] ?? ''));

                if ($code === '') {
                    $skipped++;
                    $errors[] = "Row {$row}: missing office code.";
                    continue;
                }

                if (Office::where('office_code', $code)->exists()) {
                    $skipped++;
                    $errors[] = "Row {$row}: '{$code}' already exists.";
                    continue;
                }

                $name = $idxName !== null ? trim((string) ($data[$idxName] ?? '')) : '';

                Office::create([
                    'office_code' => $code,
                    'office_name' => $name !== '' ? $name : $code,
                    'entity_name' => $idxEntity !== null
                        ? (trim((string) ($data[$idxEntity] ?? '')) ?: null)
                        : null,
                    'office_head' => $idxHead !== null
                        ? (trim((string) ($data[$idxHead] ?? '')) ?: null)
                        : null,
                    'email' => $idxEmail !== null
                        ? (trim((string) ($data[$idxEmail] ?? '')) ?: null)
                        : null,
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

        $message = "Imported {$imported} office(s).";
        if ($skipped > 0) {
            $message .= " Skipped {$skipped}.";
        }

        return back()->with('success', $message)->with('importErrors', $errors);
    }

    public function destroy(Office $office)
    {
        $office->delete();

        return back()->with('success', 'Office deleted successfully.');
    }
}
