<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureSingleSession
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return $next($request);
        }

        $user = $request->user();
        $sessionId = $request->session()->getId();

        // Fresh login: the Login event flagged this session as needing to
        // claim ownership, because at Login-event time the session ID
        // wasn't final yet (Fortify/2FA hadn't regenerated it). Now that
        // we're on the first request with the final ID, claim it.
        if ($request->session()->pull('auth.pending_claim')) {
            if (! $user->claimSession($sessionId)) {
                // Reload from DB — a concurrent request for this SAME session
                // may have already won the claim between our pull() and now.
                $user->refresh();

                if ($user->current_session_id !== $sessionId) {
                    return $this->forceLogout(
                        $request,
                        'This account was signed in from another device just now. Please try logging in again.'
                    );
                }
                // else: sibling request already claimed it for us — fall through
            }

            return $next($request);
        }

        // Normal authenticated request: this session must still be the one
        // on record as the account's active session. No "still alive"
        // fallback here — that's what caused the earlier bug, where a
        // superseded-but-still-open tab kept working for up to 50 minutes
        // after a second device took over. If current_session_id has moved
        // on to another device, this session is superseded — log it out.
        if ($user->current_session_id !== $sessionId) {
            return $this->forceLogout(
                $request,
                'You have been logged out because your account was signed in from another device.'
            );
        }

        return $next($request);
    }

    protected function forceLogout(Request $request, string $message): Response
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        $request->session()->flash('error', $message);

        if ($request->header('X-Inertia')) {
            return Inertia::location(route('login'));
        }

        return redirect()->route('login');
    }
}