<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class POLetterMonitoringController extends Controller
{
    /**
     * Display the PO Letter Monitoring page.
     */
    public function index()
    {
        return Inertia::render('po-letter-monitoring/index');
    }
}
