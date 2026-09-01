<?php

namespace App\Http\Controllers;

use App\Models\FundCluster;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FundClustersController extends Controller
{
    /**
     * Display the Fund Clusters page.
     */
public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        $search = $request->input('search');

        // 1. Get the sorting parameters
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        // 2. Validate sort fields to prevent SQL injection
        $allowedSorts = ['fund_cluster_id', 'fund_description', 'created_at'];
        if (!in_array($sortField, $allowedSorts)) {
            $sortField = 'created_at';
        }
        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        $fundClusters = FundCluster::when($search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('fund_cluster_id', 'like', "%{$search}%")
                    ->orWhere('fund_description', 'like', "%{$search}%");
            });
        })
            // 3. Apply dynamic sorting
            ->orderBy($sortField, $sortDirection)
            ->paginateWithHighlight($perPage)
            ->withQueryString();

        return Inertia::render('fundclusters/index', [
            'fundClusters' => $fundClusters,
            'filters' => [
                'search' => $search,
                // 4. Send sort state to frontend
                'sort_field' => $sortField,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    /**
     * Store a newly created fund cluster.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'fund_cluster_id' => 'required|string|max:255|unique:fund_clusters,fund_cluster_id',
            'fund_description' => 'required|string|max:255',
        ]);

        FundCluster::create($validated);

        return redirect()->back()->with('success', 'Fund cluster added successfully.');
    }

    /**
     * Update the specified fund cluster.
     */
    public function update(Request $request, FundCluster $fundCluster)
    {
        $validated = $request->validate([
            'fund_description' => 'required|string|max:255',
        ]);

        $fundCluster->update($validated);

        return redirect()->back()->with('success', 'Fund cluster updated successfully.');
    }

    /**
     * Remove the specified fund cluster.
     */
    public function destroy(FundCluster $fundCluster)
        {
            try {
                $fundCluster->delete();
            } catch (\Illuminate\Database\QueryException $e) {
                if ($e->getCode() === '23000') {
                    return back()->withErrors(['delete' => 'Cannot delete this fund cluster — it is still referenced by related records.']);
                }
                throw $e;
            }

            return redirect()->back()->with('success', 'Fund cluster archived successfully.');
        }
}
