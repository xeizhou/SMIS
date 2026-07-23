<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class EmployeeFileLocatorController extends Controller
{
    /**
     * Display the Employee File Locator page.
     */
    public function index()
    {
        return Inertia::render('employeefilelocator/index');
    }
}
