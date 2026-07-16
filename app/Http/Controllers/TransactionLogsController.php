<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class TransactionLogsController extends Controller
{
    /**
     * Display the Transaction Logs page.
     */
    public function index()
    {
        return Inertia::render('transaction-logs/index');
    }
}