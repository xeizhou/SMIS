<?php

use App\Models\ServePo;
use App\Models\User;

it('supports multiple end-user release notices without overwriting previous notices', function () {
    $user = User::factory()->create();

    $po = ServePo::create([
        'po_number' => '2026-11-0001',
        'pr_number' => '2026-11-0001',
        'pr_date' => '2026-11-01',
        'po_date' => '2026-11-05',
        'ors_burs_date' => '2026-11-05',
        'total_amount_po' => 45000,
    ]);

    // 1st Notice: Emailed on 2026-11-20
    $resp1 = $this->actingAs($user)->postJson('/purchase-orders/'.$po->po_number.'/notify-release', [
        'email' => 'enduser@smu.edu.ph',
        'method' => 'Email',
        'date' => '2026-11-20',
    ]);

    $resp1->assertOk();
    $resp1->assertJsonFragment([
        'success' => true,
    ]);

    $po->refresh();
    expect($po->release_notices)->toHaveCount(1);
    expect($po->release_notices[0]['date'])->toBe('2026-11-20');
    expect($po->release_notices[0]['method'])->toBe('Email');
    expect($po->release_notices[0]['contact'])->toBe('enduser@smu.edu.ph');
    expect($po->receipt_claimed_notified_date->toDateString())->toBe('2026-11-20');

    // 2nd Notice: Follow-up phoned on 2026-11-24
    $resp2 = $this->actingAs($user)->postJson('/purchase-orders/'.$po->po_number.'/notify-release', [
        'contact' => '0917-123-4567',
        'method' => 'Phone Number',
        'date' => '2026-11-24',
    ]);

    $resp2->assertOk();

    $po->refresh();
    expect($po->release_notices)->toHaveCount(2);
    // 1st notice is retained!
    expect($po->release_notices[0]['date'])->toBe('2026-11-20');
    expect($po->release_notices[0]['method'])->toBe('Email');
    expect($po->release_notices[0]['contact'])->toBe('enduser@smu.edu.ph');
    // 2nd notice is logged!
    expect($po->release_notices[1]['date'])->toBe('2026-11-24');
    expect($po->release_notices[1]['method'])->toBe('Phone Number');
    expect($po->release_notices[1]['contact'])->toBe('0917-123-4567');
    // Latest date is updated
    expect($po->receipt_claimed_notified_date->toDateString())->toBe('2026-11-24');
});

it('preserves existing release notices when workflow step is updated', function () {
    $user = User::factory()->create();

    $po = ServePo::create([
        'po_number' => '2026-11-0002',
        'pr_number' => '2026-11-0002',
        'pr_date' => '2026-11-01',
        'po_date' => '2026-11-05',
        'ors_burs_date' => '2026-11-05',
        'total_amount_po' => 250000,
        'locked_steps' => [
            'release_notices' => [
                [
                    'date' => '2026-11-22',
                    'method' => 'Email',
                    'contact' => 'officer@smu.edu.ph',
                    'created_at' => '2026-11-22 09:00:00',
                ],
            ],
            'For Release' => '2026-11-22T09:00:00Z',
        ],
    ]);

    // Updating PO step to Payment Processing with locked_steps array
    $response = $this->actingAs($user)->put('/purchase-orders/'.$po->po_number, [
        'po_number' => $po->po_number,
        'po_step' => 'Payment Processing',
        'locked_steps' => [
            'PO From VPAD' => '2026-11-22T08:00:00Z',
            'For Release' => '2026-11-22T09:00:00Z',
        ],
        'receipt_receiving_date' => '2026-11-22',
        'receipt_claimed_by' => 'John Doe',
        'par_ics_number' => '2026-0001',
    ]);

    $response->assertSessionHasNoErrors();
    $po->refresh();

    expect($po->release_notices)->toHaveCount(1);
    expect($po->release_notices[0]['contact'])->toBe('officer@smu.edu.ph');
    expect($po->par_ics_number)->toBe('2026-0001');
    expect($po->receipt_receiving_date->toDateString())->toBe('2026-11-22');
});

it('saves inspection entries and property slip details for release', function () {
    $user = User::factory()->create();

    $po = ServePo::create([
        'po_number' => '2026-11-0003',
        'pr_number' => '2026-11-0003',
        'pr_date' => '2026-11-01',
        'po_date' => '2026-11-05',
        'ors_burs_date' => '2026-11-05',
        'total_amount_po' => 38000,
    ]);

    $response = $this->actingAs($user)->put('/purchase-orders/'.$po->po_number, [
        'po_number' => $po->po_number,
        'po_step' => 'For Release',
        'receipt_receiving_date' => '2026-11-25',
        'receipt_claimed_by' => 'Jane Smith',
        'par_ics_number' => '2026-0042',
        'ris_number' => '2026-0015',
        'inspection_entries' => [
            [
                'iar_number' => '2026110001',
                'inspected_by' => 'Inspector Gomez',
                'inspection_date' => '2026-11-25',
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $po->refresh();

    expect($po->receipt_receiving_date->toDateString())->toBe('2026-11-25');
    expect($po->receipt_claimed_by)->toBe('Jane Smith');
    expect($po->par_ics_number)->toBe('2026-0042');
    expect($po->ris_number)->toBe('2026-0015');

    $po->load('inspectionEntries');
    expect($po->inspectionEntries)->toHaveCount(1);
    expect($po->inspectionEntries->first()->iar_number)->toBe('2026110001');
    expect($po->inspectionEntries->first()->inspected_by)->toBe('Inspector Gomez');
});
