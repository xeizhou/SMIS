<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class StockItemsController extends Controller
{
    /**
     * Display the Stock Items page.
     */
    public function index()
    {
        return Inertia::render('stock-items/index');
    }
}