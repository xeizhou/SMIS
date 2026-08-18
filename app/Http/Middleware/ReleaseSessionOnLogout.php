<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ReleaseSessionOnLogout
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->routeIs('logout')) {
            return $next($request);
        }

        // Capture BEFORE Fortify's logout logic runs, so we're not relying
        // on exactly when/whether Auth::logout() or session()->invalidate()
        // internally touches the session ID.
        $user = Auth::user();
        $sessionId = $request->session()->getId();

        $response = $next($request);

        if ($user) {
            // Conditional on current_session_id still matching — if a
            // different session somehow already claimed ownership since
            // this request started, we won't clobber it.
            $user->releaseSession($sessionId);
        }

        return $response;
    }
}