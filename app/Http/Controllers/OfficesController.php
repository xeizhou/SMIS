<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class OfficesController extends Controller
{
    /**
     * Display the Offices page.
     */
    public function index()
    {
        return Inertia::render('offices/index');
    }
}