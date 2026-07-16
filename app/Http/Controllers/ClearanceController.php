<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class ClearanceController extends Controller
{
    /**
     * Display the Clearance page.
     */
    public function index()
    {
        return Inertia::render('clearance/index');
    }
}