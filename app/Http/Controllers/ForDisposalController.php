<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class ForDisposalController extends Controller
{
    /**
     * Display the for-disposal page.
     */
    public function index()
    {
        return Inertia::render('for-disposal-monitoring/index');
    }
}
