<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class RegSPIController extends Controller
{
    /**
     * Display the RegSPI page.
     */
    public function index()
    {
        return Inertia::render('regspi-monitoring/index');
    }
}