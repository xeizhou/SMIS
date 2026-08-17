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

        $typeNames = [
            'pir_created' => 'VPAD',
            'pir_for_release' => 'For Release',
            'pir_coa_received' => 'COA Stamp',
            'pir_completed' => 'Claiming',
        ];
        $typeName = $typeNames[$validated['type']] ?? 'Notification';
        $message = "You have successfully sent an email to {$office->office_name} ({$office->email}) for {$typeName}.";
        
        $targetUrl = null;
        if (!empty($validated['po_number'])) {
            $targetUrl = '/iar?highlight_search=' . urlencode($validated['po_number']);
        }

        if (\Illuminate\Support\Facades\Auth::check()) {
            \Illuminate\Support\Facades\Auth::user()->notify(new \App\Notifications\OfficeNotified($message, $targetUrl));
        }

        return back()->with('success', "Email sent successfully to {$office->office_name}.");
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

    public function destroy(Office $office)
        {
            try {
                $office->delete();
            } catch (\Illuminate\Database\QueryException $e) {
                if ($e->getCode() === '23000') {
                    return back()->with('error', 'Cannot delete this office — it is still referenced by related records.');
                }
                throw $e;
            }

            return redirect()->route('offices.index')->with('success', 'Office deleted.');
        }
}
