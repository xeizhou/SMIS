<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class RRSPController extends Controller
{
    /**
     * Display the RRSP page.
     */
    public function index()
    {
        return Inertia::render('rrsp-monitoring/index');
    }
}