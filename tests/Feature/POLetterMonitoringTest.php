<?php

use App\Models\ServePo;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

it('renders the po letter monitoring page with paginated data and filters', function () {
    $user = User::factory()->create();
    ServePo::create([
        'po_number' => 'PO-2026-001',
        'po_date' => '2026-11-10',
    ]);

    $response = $this->actingAs($user)->get(route('po-letter-monitoring.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('po-letter-monitoring/index')
            ->where('filters.search', null)
            ->where('filters.status', null)
            ->where('filters.type', null)
            ->where('poNumbers.0.po_number', 'PO-2026-001')
            ->where('poNumbers.0.po_date', '2026-11-10')
            ->where('poLetters.data', [])
        );
});

it('creates a letter from only its PO number and letter type and enforces workflow order', function () {
    $user = User::factory()->create();
    ServePo::create([
        'po_number' => 'PO-2026-002',
        'po_date' => '2026-11-10',
    ]);

    $this->actingAs($user)
        ->post(route('po-letter-monitoring.store'), [
            'po_number' => 'PO-2026-002',
            'type_of_letter' => 'WAIVER',
        ])
        ->assertRedirect();

    $letterId = DB::table('po_letter_monitoring')
        ->where('po_number', 'PO-2026-002')
        ->value('id');

    $this->assertDatabaseHas('po_letter_monitoring', [
        'id' => $letterId,
        'po_number' => 'PO-2026-002',
        'supplier_id' => null,
        'office_end_user' => null,
        'status_of_the_letter' => 'PENDING',
    ]);
    expect(substr((string) DB::table('po_letter_monitoring')->where('id', $letterId)->value('po_date'), 0, 10))
        ->toBe('2026-11-10');

    $workflowUrl = route('po-letter-monitoring.workflow.update', $letterId);

    $this->put($workflowUrl, [
        'step' => 'date_forwarded_to_ovpad',
        'value' => '2026-11-12',
    ])->assertSessionHasErrors('step');

    $this->put($workflowUrl, [
        'step' => 'date_received_by_smu',
        'value' => '2026-11-11',
    ])->assertRedirect();

    $this->put($workflowUrl, [
        'step' => 'date_forwarded_to_ovpad',
        'value' => '2026-11-12',
    ])->assertRedirect();

    $this->put($workflowUrl, [
        'step' => 'final_section',
        'value' => [
            'date_forwarded_to_end_user' => '2026-11-13',
            'status_of_the_letter' => 'APPROVED',
            'remarks' => 'Forwarded for action.',
        ],
    ])->assertRedirect();

    $letter = DB::table('po_letter_monitoring')->where('id', $letterId)->first();
    expect(substr((string) $letter->date_received_by_smu, 0, 10))->toBe('2026-11-11')
        ->and(substr((string) $letter->date_forwarded_to_ovpad, 0, 10))->toBe('2026-11-12')
        ->and($letter->status_of_the_letter)->toBe('APPROVED')
        ->and(substr((string) $letter->date_forwarded_to_end_user, 0, 10))->toBe('2026-11-13')
        ->and($letter->remarks)->toBe('Forwarded for action.');
});
