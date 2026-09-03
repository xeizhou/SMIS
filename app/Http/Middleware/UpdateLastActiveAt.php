<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UpdateLastActiveAt
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->user()) {
            $user = $request->user();
            
            // Only update if it's been more than 1 hour since the last update
            // to prevent excessive database writes on every request.
            if (!$user->last_active_at || $user->last_active_at->diffInMinutes(now()) >= 60) {
                // Use withoutEvents to avoid triggering model observers/updated_at
                \App\Models\User::withoutEvents(function () use ($user) {
                    $user->forceFill(['last_active_at' => now()])->save();
                });
            }
        }

        return $response;
    }
}
