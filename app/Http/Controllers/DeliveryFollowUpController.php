<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\DeliveryFollowUp;
use Inertia\Inertia;

class DeliveryFollowUpController extends Controller
{
    public function index(Request $request)
    {
        $query = DeliveryFollowUp::with(['delivery.supplier', 'delivery.servePo', 'user']);

        $search = $request->input('search') ?? $request->input('highlight_search');

        if ($search) {
            $query->whereHas('delivery', function ($q) use ($search) {
                $q->where('po_number', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($sq) use ($search) {
                      $sq->where('supplier_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('notice_type')) {
            $query->where('notice_type', $request->input('notice_type'));
        }

        $followUps = $query->latest('follow_up_date')
            ->get()
            ->map(function ($followUp) {
                return [
                    'id' => $followUp->id,
                    'delivery_id' => $followUp->delivery_id,
                    'po_number' => $followUp->delivery->po_number ?? 'N/A',
                    'supplier_name' => $followUp->delivery->supplier->supplier_name ?? 'N/A',
                    'notice_type' => $followUp->notice_type,
                    'remarks' => $followUp->remarks,
                    'user_name' => $followUp->user ? $followUp->user->name : 'System',
                    'follow_up_date' => $followUp->follow_up_date->format('Y-m-d H:i:s'),
                    'created_at' => $followUp->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('delivery-follow-ups/index', [
            'followUps' => $followUps,
            'filters' => [
                'search' => $search,
                'notice_type' => $request->input('notice_type'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'delivery_id' => 'required|string|exists:delivery,delivery_id',
            'notice_type' => 'required|string|max:255',
            'follow_up_date' => 'required|date',
            'remarks' => 'nullable|string',
        ]);

        $validated['user_id'] = \Illuminate\Support\Facades\Auth::id();

        DeliveryFollowUp::create($validated);

        return back()->with('success', 'Follow-up logged successfully.');
    }

    public function destroy($id)
    {
        $followUp = DeliveryFollowUp::findOrFail($id);
        $followUp->delete();

        return back()->with('success', 'Follow-up deleted successfully.');
    }
}
