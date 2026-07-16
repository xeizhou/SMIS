<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class RRPPEController extends Controller
{
    /**
     * Display the RRPPE page.
     */
    public function index()
    {
        return Inertia::render('rrppe-monitoring/index');
    }
}