<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class BonaVidaController extends Controller
{
    /**
     * Display the Bona Vida page.
     */
    public function index()
    {
        return Inertia::render('bona-vida-monitoring/index');
    }
}
