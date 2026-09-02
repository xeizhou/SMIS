<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class UsersController extends Controller
{
    protected const PROTECTED_USER_ID = 1;

    public function index()
    {
        return Inertia::render('users/index', [
            'users' => User::select('id', 'name', 'email', 'role', 'avatar_path', 'created_at')
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    ...$user->toArray(),
                    'is_locked' => $user->id === self::PROTECTED_USER_ID,
                ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_STAFF])],
        ]);

        $validated['password'] = bcrypt($validated['password']);

        User::create($validated);

        return back()->with('success', 'User created.');
    }

    public function update(Request $request, User $user)
    {
        if ($user->id === self::PROTECTED_USER_ID) {
            return back()->with('error', 'This account is locked and cannot be edited.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::in([User::ROLE_ADMIN, User::ROLE_STAFF])],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = bcrypt($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return back()->with('success', 'User updated.');
    }

    public function updateAvatar(Request $request, User $user)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        // delete old avatar if exists
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['avatar_path' => $path]);

        return back()->with('success', 'Profile picture updated.');
    }

    public function removeAvatar(User $user)
    {
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return back()->with('success', 'Profile picture removed.');
    }

    public function destroy(User $user)
        {
            if ($user->id === self::PROTECTED_USER_ID) {
                return back()->with('error', 'This account is locked and cannot be deleted.');
            }

            if ($user->id === auth()->id()) {
                return back()->with('error', "You can't delete your own account.");
            }

            try {
                $user->delete();
            } catch (\Illuminate\Database\QueryException $e) {
                if ($e->getCode() === '23000') {
                    return back()->with('error', 'Cannot delete this user — they are still referenced by existing records.');
                }
                throw $e;
            }

            return back()->with('success', 'User deleted.');
        }
}