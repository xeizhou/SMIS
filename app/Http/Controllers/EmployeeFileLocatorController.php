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
    public function destroy(Request $request, EmployeeFileLocator $employeefilelocator): RedirectResponse
    {
        $fullName = trim(
            $employeefilelocator->last_name . ', ' . $employeefilelocator->first_name
            . ($employeefilelocator->middle_name ? ' ' . $employeefilelocator->middle_name : '')
        );

        $employeefilelocator->archiveMetadata()->create([
            'identity_document' => $employeefilelocator->last_name . ', ' . $employeefilelocator->first_name,
            'archived_from' => 'HR > Employee File Locator',
            'archived_by' => $request->user()?->id,
        ]);

        $employeefilelocator->delete(); // soft delete via SoftDeletes trait

        return back()->with('success', 'Employee file record archived successfully.');
    }

    public function employeeFiles(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:20480',
            'file_format' => 'required|in:xlsx,csv',
        ]);
    
        try {
            $rows = $request->input('file_format') === 'csv'
                ? $this->parseEmployeeFileCsv($request->file('file'))
                : $this->parseEmployeeFileXlsx($request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => 'Could not read file: ' . $e->getMessage()]);
        }
    
        if (empty($rows)) {
            return back()->withErrors(['file' => 'No rows found in the uploaded file.']);
        }
    
        $created = 0;
        $skipped = [];
    
        EmployeeFileLocator::withoutActivityLogging(function () use ($rows, &$created, &$skipped) {
            foreach ($rows as $i => $row) {
                $validator = Validator::make($row, [
                    'last_name' => 'required|string|max:100',
                    'first_name' => 'required|string|max:100',
                    'middle_name' => 'nullable|string|max:100',
                    'area' => 'required|string|max:100',
                    'status' => 'required|string|max:50',
                ]);
    
                if ($validator->fails()) {
                    // Label refers to the Nth *parsed* record (a physical row
                    // can produce up to two records), not the sheet line.
                    $skipped[] = "Row {$this->rowLabel($i)}: " . $validator->errors()->first();
                    continue;
                }
    
                EmployeeFileLocator::create($row);
                $created++;
            }
        });
    
        $this->logAudit(sprintf(
            'Imported employee file locator: %d created, %d skipped.',
            $created,
            count($skipped)
        ));
    
        $message = "Import complete: {$created} created";
        if (! empty($skipped)) {
            $message .= ', ' . count($skipped) . ' row(s) skipped.';
            $preview = array_slice($skipped, 0, 10);
            $message .= '|||' . implode('|||', $preview);
        }
    
        return back()->with('success', $message);
    }
    
    /**
     * GET /import/template/employee-files
     * Register BEFORE /import/template/{type} in web.php (same reason as
     * the rrsp/rrppe/wmr/bona-vida templates — it doesn't go through the
     * generic SCHEMAS-based template()).
     */
    public function employeeFileTemplate(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'wb');
    
            fputcsv($handle, ['EMPLOYEE FILE LOCATOR']);
            fputcsv($handle, ['ACTIVE FILES', '', '', '', '', '', '', 'DEAD FILES']);
            fputcsv($handle, []);
            fputcsv($handle, [
                'NO.', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME', 'AREA', 'STATUS', '',
                'NO.', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME', 'AREA', 'STATUS',
            ]);
            fputcsv($handle, []);
            fputcsv($handle, [
                1, 'DELA CRUZ', 'JUAN', 'S.', '1-L1', 'Active', '',
                1, 'SANTOS', 'MARIA', 'P.', 'DEAD FILES', 'Dead',
            ]);
    
            fclose($handle);
        }, 'employee_file_locator_import_template.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
    
    /**
     * CSV path. Scans forward for the "NO." / "LAST NAME" header row rather
     * than assuming a fixed line number, same approach as the Bona-Vida job.
     */
    private function parseEmployeeFileCsv($file): array
    {
        $handle = fopen($file->getRealPath(), 'rb');
    
        if ($handle === false) {
            throw new \RuntimeException('Could not open CSV file.');
        }
    
        $foundHeader = false;
    
        while (($line = fgetcsv($handle)) !== false) {
            $first = strtoupper(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) ($line[0] ?? ''))));
            $second = strtoupper(trim((string) ($line[1] ?? '')));
    
            if ($first === 'NO.' && $second === 'LAST NAME') {
                $foundHeader = true;
                break;
            }
        }
    
        if (! $foundHeader) {
            fclose($handle);
            throw new \RuntimeException('Could not find the NO. / LAST NAME header row.');
        }
    
        $rows = [];
    
        while (($line = fgetcsv($handle)) !== false) {
            $isBlank = count(array_filter($line, fn ($v) => trim((string) $v) !== '')) === 0;
    
            if ($isBlank) {
                continue;
            }
    
            array_push($rows, ...$this->splitEmployeeFileRow($line));
        }
    
        fclose($handle);
    
        return $rows;
    }
    
    /**
     * xlsx path — same header-scan approach, via PhpSpreadsheet's array
     * output instead of fgetcsv.
     */
    private function parseEmployeeFileXlsx($file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $raw = $sheet->toArray(null, true, true, false);
    
        $headerIndex = null;
    
        foreach ($raw as $i => $line) {
            $first = strtoupper(trim((string) ($line[0] ?? '')));
            $second = strtoupper(trim((string) ($line[1] ?? '')));
    
            if ($first === 'NO.' && $second === 'LAST NAME') {
                $headerIndex = $i;
                break;
            }
        }
    
        if ($headerIndex === null) {
            throw new \RuntimeException('Could not find the NO. / LAST NAME header row.');
        }
    
        $rows = [];
    
        foreach (array_slice($raw, $headerIndex + 1) as $line) {
            $isBlank = count(array_filter($line, fn ($v) => $v !== null && trim((string) $v) !== '')) === 0;
    
            if ($isBlank) {
                continue;
            }
    
            array_push($rows, ...$this->splitEmployeeFileRow($line));
        }
    
        return $rows;
    }
    
    /**
     * One physical row can yield up to two records: left block (Active) and
     * right block (Dead). A side only produces a record if it has a LAST
     * NAME — this is what lets us ignore the right block's dragged-down
     * "NO." column on rows with no real dead-file data.
     */
    private function splitEmployeeFileRow(array $line): array
    {
        $rows = [];
    
        $left = $this->employeeFileSide($line, lastIdx: 1, firstIdx: 2, middleIdx: 3, areaIdx: 4, statusIdx: 5, defaultStatus: 'Active');
        if ($left !== null) {
            $rows[] = $left;
        }
    
        $right = $this->employeeFileSide($line, lastIdx: 8, firstIdx: 9, middleIdx: 10, areaIdx: 11, statusIdx: 12, defaultStatus: 'Inactive');
        if ($right !== null) {
            $rows[] = $right;
        }
    
        return $rows;
    }
    
    private function employeeFileSide(
        array $line,
        int $lastIdx,
        int $firstIdx,
        int $middleIdx,
        int $areaIdx,
        int $statusIdx,
        string $defaultStatus
    ): ?array {
        $lastName = trim((string) ($line[$lastIdx] ?? ''));
    
        if ($lastName === '') {
            return null;
        }
    
        $status = trim((string) ($line[$statusIdx] ?? ''));
    
        // The source sheet literally writes "Dead" in the right block's STATUS
        // column. The app's status filter only knows about Active/Inactive, so
        // "Dead" (however it's cased) is normalized to "Inactive" on the way
        // in — this covers both the literal value and the empty-cell fallback.
        if ($status !== '' && strtolower($status) === 'dead') {
            $status = 'Inactive';
        }
    
        return [
            'last_name' => $lastName,
            'first_name' => trim((string) ($line[$firstIdx] ?? '')),
            'middle_name' => $this->nullableTrim($line[$middleIdx] ?? null),
            // Note: on the source sheet, the right (Dead) block's AREA column
            // literally reads "DEAD FILES" rather than a real area code — that
            // value is imported as-is here. Say the word if you'd rather it
            // fall back to blank/null instead.
            'area' => trim((string) ($line[$areaIdx] ?? '')),
            // A handful of trailing dead-file rows in the source have every
            // column filled except STATUS (e.g. "DAPITON, VITA JULE" has no
            // STATUS cell) — those still default to 'Inactive' via
            // $defaultStatus, matching the "Dead" -> "Inactive" mapping above.
            'status' => $status !== '' ? $status : $defaultStatus,
        ];
    }
    
    private function nullableTrim($value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : $value;
    }
}
