<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class DeliveriesController extends Controller
{
    /**
     * Display the Deliveries page.
     */
    public function index()
    {
        return Inertia::render('deliveries/index');
    }
}