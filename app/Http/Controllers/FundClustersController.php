<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class FundClustersController extends Controller
{
    /**
     * Display the Fund Clusters page.
     */
    public function index()
    {
        return Inertia::render('fundclusters/index');
    }
}