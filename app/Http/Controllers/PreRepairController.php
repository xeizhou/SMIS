<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class PreRepairController extends Controller
{
    /**
     * Display the Pre-Repair  page.
     */
    public function index()
    {
        return Inertia::render('pre-repair-monitoring/index');
    }
}
