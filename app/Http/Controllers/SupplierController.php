<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

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
                ->orderBy('supplier_name')
                ->paginate(10)
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
                'unique:supplier_list,supplier_name,' . $supplier->supplier_id . ',supplier_id',
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
}