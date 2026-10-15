<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;
use Illuminate\Database\QueryException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Auth\Access\AuthorizationException;

beforeEach(function () {
    Route::middleware(['web'])->group(function () {
        Route::get('/test-flash-sharing', function () {
            session()->flash('warning', 'Be cautious!');
            session()->flash('info', 'Helpful details.');
            session()->flash('deleteError', 'Cannot delete item.');
            return inertia('Dashboard');
        });

        Route::post('/test-query-exception', function () {
            throw new QueryException('mysql', 'DELETE FROM parent WHERE id = 1', [], new \Exception('Cannot delete or update a parent row: a foreign key constraint fails'));
        });

        Route::post('/test-unique-exception', function () {
            throw new QueryException('mysql', 'INSERT INTO items (code) VALUES (?)', ['ITEM-1'], new \Exception('Duplicate entry ITEM-1 for key items_code_unique'));
        });

        Route::get('/test-not-found-exception', function () {
            throw new ModelNotFoundException('Item not found');
        });

        Route::get('/test-forbidden-exception', function () {
            throw new AuthorizationException('Forbidden');
        });
    });
});

test('inertia middleware shares warning, info, and deleteError in flash props', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get('/test-flash-sharing');
    $response->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->where('flash.warning', 'Be cautious!')
        ->where('flash.info', 'Helpful details.')
        ->where('flash.deleteError', 'Cannot delete item.')
    );
});

test('foreign key query exception is intercepted and converted to a safe user error message', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->from('/dashboard')->post('/test-query-exception');
    $response->assertRedirect('/dashboard');
    $response->assertSessionHas('error', function ($value) {
        return str_contains($value, 'This record cannot be modified or deleted because it is linked to other records')
            && !str_contains($value, 'SQLSTATE')
            && !str_contains($value, 'DELETE FROM parent');
    });
});

test('unique constraint query exception is intercepted and converted to a safe duplicate error message', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->from('/dashboard')->post('/test-unique-exception');
    $response->assertRedirect('/dashboard');
    $response->assertSessionHas('error', function ($value) {
        return str_contains($value, 'A record with this information already exists')
            && !str_contains($value, 'SQLSTATE')
            && !str_contains($value, 'INSERT INTO');
    });
});

test('model not found exception is intercepted and converted to a safe user message', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->from('/dashboard')->get('/test-not-found-exception');
    $response->assertRedirect('/dashboard');
    $response->assertSessionHas('error', 'The requested record was not found or has been removed.');
});

test('authorization exception is intercepted and converted to a safe permission error', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->from('/dashboard')->get('/test-forbidden-exception');
    $response->assertRedirect('/dashboard');
    $response->assertSessionHas('error', 'You do not have permission to perform this action.');
});

test('json api request returns safe json on database exception without exposing sql details', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->postJson('/test-query-exception');
    $response->assertStatus(422);
    $response->assertJson([
        'message' => 'This record cannot be modified or deleted because it is linked to other records in the system.',
    ]);
    expect($response->getContent())->not->toContain('SQLSTATE');
    expect($response->getContent())->not->toContain('DELETE FROM parent');
});

test('json api request returns safe json on forbidden exception', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->getJson('/test-forbidden-exception');
    $response->assertStatus(403);
    $response->assertJson([
        'message' => 'You do not have permission to perform this action.',
    ]);
});

test('inertia post mutation handles unexpected exceptions safely', function () {
    Route::middleware(['web'])->post('/test-unexpected-mutation', function () {
        throw new \RuntimeException('Unexpected internal server bug');
    });

    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->from('/dashboard')
        ->withHeaders(['X-Inertia' => 'true'])
        ->post('/test-unexpected-mutation');

    $response->assertRedirect('/dashboard');
    $response->assertSessionHas('error', 'An unexpected error occurred while processing your request. Please try again.');
});

