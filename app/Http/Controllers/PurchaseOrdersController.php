<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class PurchaseOrdersController extends Controller
{
    /**
     * Display the Purchase Orders page.
     */
    public function index()
    {
        return Inertia::render('purchase-orders/index');
    }
}