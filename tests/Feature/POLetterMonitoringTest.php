<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('renders the po letter monitoring page with paginated data and filters', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('po-letter-monitoring.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('po-letter-monitoring/index')
            ->where('filters.search', null)
            ->where('filters.status', null)
            ->where('filters.type', null)
            ->where('poLetters.data', [])
        );
});
