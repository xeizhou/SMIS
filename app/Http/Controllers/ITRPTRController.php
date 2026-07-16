<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class ITRPTRController extends Controller
{
    /**
     * Display the ITR-PTR page.
     */
    public function index()
    {
        return Inertia::render('itr-ptr-monitoring/index');
    }
}
