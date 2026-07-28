<?php

use App\Models\Clearance;
use App\Models\Office;
use App\Models\User;

it('stores, updates, and deletes a clearance record', function () {
    $user = User::factory()->create();

    $office = Office::create([
        'office_code' => 'HR01',
        'office_name' => 'Human Resources',
        'entity_name' => 'SMU',
        'office_head' => 'Jane Doe',
    ]);

    $response = $this->actingAs($user)->post(route('clearance.store'), [
        'name' => 'John Smith',
        'office' => $office->office_code,
        'claim_date' => '2026-07-20',
        'received_by' => 'Maria Cruz',
        'status' => 'Active',
        'cleared' => true,
        'pending' => false,
        'remarks' => 'Ready',
    ]);

    $response->assertRedirect();

    $record = Clearance::latest('clearance_id')->first();

    expect($record)->not->toBeNull();
    expect($record->name)->toBe('John Smith');
    expect($record->office)->toBe($office->office_code);

    $updateResponse = $this->actingAs($user)->put(route('clearance.update', $record), [
        'name' => 'John Smith',
        'office' => $office->office_code,
        'claim_date' => '2026-07-21',
        'received_by' => 'Maria Cruz',
        'status' => 'Retired',
        'cleared' => true,
        'pending' => false,
        'remarks' => 'Completed',
    ]);

    $updateResponse->assertRedirect();

    $record->refresh();
    expect($record->status)->toBe('Retired');
    expect($record->cleared)->toBeTrue();
    expect($record->pending)->toBeFalse();
    expect($record->remarks)->toBe('Completed');

    $deleteResponse = $this->actingAs($user)->delete(route('clearance.destroy', $record));

    $deleteResponse->assertRedirect();
    expect(Clearance::find($record->clearance_id))->toBeNull();
});
