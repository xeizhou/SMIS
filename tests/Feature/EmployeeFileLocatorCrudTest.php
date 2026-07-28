<?php

use App\Models\EmployeeFileLocator;
use App\Models\User;

it('stores, updates, and deletes an employee file locator record', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('employee-file-locator.store'), [
        'last_name' => 'Doe',
        'first_name' => 'Jane',
        'middle_name' => 'A',
        'area' => 'HR Office',
        'status' => 'Active',
    ]);

    $response->assertRedirect();

    $record = EmployeeFileLocator::latest('efr_id')->first();

    expect($record)->not->toBeNull();
    expect($record->last_name)->toBe('Doe');
    expect($record->area)->toBe('HR Office');

    $updateResponse = $this->actingAs($user)->put(route('employee-file-locator.update', $record), [
        'last_name' => 'Doe',
        'first_name' => 'Jane',
        'middle_name' => 'A',
        'area' => 'Personnel Office',
        'status' => 'Inactive',
    ]);

    $updateResponse->assertRedirect();

    $record->refresh();
    expect($record->area)->toBe('Personnel Office');
    expect($record->status)->toBe('Inactive');

    $deleteResponse = $this->actingAs($user)->delete(route('employee-file-locator.destroy', $record));

    $deleteResponse->assertRedirect();
    expect(EmployeeFileLocator::find($record->efr_id))->toBeNull();
});
