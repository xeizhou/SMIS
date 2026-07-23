<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class UsersController extends Controller
{
    /**
     * Display the Userspage.
     */
    public function index()
    {
        return Inertia::render('users/index');
    }
}
