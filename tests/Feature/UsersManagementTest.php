<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\User;

it('creates self-registered accounts with a full name and username', function () {
    $user = app(CreateNewUser::class)->create([
        'name' => 'janedoe',
        'full_name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    expect($user->name)->toBe('janedoe')
        ->and($user->full_name)->toBe('Jane Doe');
});

it('creates and updates users with a separate full name and username', function () {
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
    $this->actingAs($admin);

    $this->post(route('users.store'), [
        'name' => 'jdoe',
        'full_name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'role' => User::ROLE_STAFF,
    ])->assertRedirect();

    $user = User::where('name', 'jdoe')->firstOrFail();
    expect($user->full_name)->toBe('John Doe');

    $this->put(route('users.update', $user), [
        'name' => 'jdoe',
        'full_name' => 'John A. Doe',
        'email' => 'john@example.com',
        'role' => User::ROLE_STAFF,
        'password' => '',
    ])->assertRedirect();

    expect($user->refresh()->full_name)->toBe('John A. Doe');
});
