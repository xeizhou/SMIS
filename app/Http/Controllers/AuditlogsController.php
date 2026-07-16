<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class AuditLogsController extends Controller
{
    /**
     * Display the Audit Logs page.
     */
    public function index()
    {
        return Inertia::render('audit-logs/index');
    }
}