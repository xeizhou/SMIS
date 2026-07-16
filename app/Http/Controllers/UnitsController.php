<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class UnitsController extends Controller
{
    /**
     * Display the Units page.
     */
    public function index()
    {
        return Inertia::render('units/index');
    }
}