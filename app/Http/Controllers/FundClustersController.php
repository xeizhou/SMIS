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
        $search = $request->input('search');

        $fundClusters = FundCluster::when($search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('fund_cluster_id', 'like', "%{$search}%")
                    ->orWhere('fund_description', 'like', "%{$search}%");
            });
        })
            // Fund clusters have timestamps; show newest first
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('fundclusters/index', [
            'fundClusters' => $fundClusters,
            'filters' => [
                'search' => $search,
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

        return redirect()->back();
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

        return redirect()->back();
    }

    /**
     * Remove the specified fund cluster.
     */
    public function destroy(FundCluster $fundCluster)
    {
        $fundCluster->delete();

        return redirect()->back();
    }
}
