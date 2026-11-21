<?php

use App\Models\Clearance;
use App\Models\ClearanceOffice;
use App\Models\Task;
use App\Models\User;

it('stores, updates, and deletes a clearance record with task assignment and on leave status', function () {
    $user = User::factory()->create();

    $office = ClearanceOffice::create([
        'clearance_office_name' => 'Human Resources',
    ]);

    $response = $this->actingAs($user)->post(route('clearance.store'), [
        'name' => 'John Smith',
        'offices' => [$office->id],
        'received_by' => 'Maria Cruz',
        'remarks' => 'Ready',
        'form_attribute' => 'on leave',
    ]);

    $response->assertRedirect();

    $record = Clearance::latest('clearance_id')->first();

    expect($record)->not->toBeNull();
    expect($record->name)->toBe('John Smith');
    expect($record->form_attribute)->toBe('on leave');
    expect($record->offices)->toHaveCount(1);

    // Test task assignment linked to this clearance record
    $taskResponse = $this->actingAs($user)->postJson(route('tasks.store'), [
        'title' => 'Sign leave clearance form',
        'assigned_to' => $user->id,
        'priority' => 'high',
        'due_date' => now()->addDays(2)->toDateString(),
        'clearance_id' => $record->clearance_id,
        'notes' => 'Urgent clearance signoff',
    ]);

    $taskResponse->assertOk();

    $assignedTask = Task::where('clearance_id', $record->clearance_id)->first();
    expect($assignedTask)->not->toBeNull();
    expect($assignedTask->clearance->clearance_id)->toBe($record->clearance_id);
    expect($record->tasks)->toHaveCount(1);

    $updateResponse = $this->actingAs($user)->put(route('clearance.update', $record), [
        'name' => 'John Smith',
        'offices' => [$office->id],
        'received_by' => 'Maria Cruz',
        'remarks' => 'Completed',
        'form_attribute' => 'on leave',
    ]);

    $updateResponse->assertRedirect();

    $record->refresh();
    expect($record->remarks)->toBe('Completed');
    expect($record->form_attribute)->toBe('on leave');

    $deleteResponse = $this->actingAs($user)->delete(route('clearance.destroy', $record));

    $deleteResponse->assertRedirect();
    expect(Clearance::find($record->clearance_id))->toBeNull();
});
