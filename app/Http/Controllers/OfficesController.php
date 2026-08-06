<?php

namespace App\Http\Controllers;

use App\Models\Office;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Mail\EmailFunction;
use Illuminate\Support\Facades\Mail;

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
                ->paginate(10)
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

    public function destroy(Office $office)
    {
        $office->delete();

        return back()->with('success', 'Office deleted successfully.');
    }
}
