<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class IARController extends Controller
{
    /**
     * Display the IAR page.
     */
    public function index()
    {
        return Inertia::render('iar/index');
    }
}
