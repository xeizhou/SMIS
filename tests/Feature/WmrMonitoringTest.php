<?php

use App\Models\User;
use App\Models\WmrMonitoring;
use Illuminate\Support\Facades\DB;

it('stores multiple WMR complaint items with automatically numbered control numbers', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('wmr-monitoring.store'), [
        'wmr_no' => '2026110001',
        'wmr_date' => '2026-11-10',
        'inspection_date' => '2026-11-09',
        'items' => [
            ['quantity' => '1', 'unit' => 'PC', 'description' => 'FRONT AXLE BEARING'],
            ['quantity' => '2', 'unit' => 'PC', 'description' => 'WIPER BLADE'],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    expect(
        WmrMonitoring::query()
            ->where('wmr_no', '2026110001')
            ->firstOrFail()
            ->inspection_date
            ->format('Y-m-d'),
    )->toBe('2026-11-09');
    $this->assertDatabaseCount('wmr_items', 2);
    $this->assertDatabaseHas('wmr_items', [
        'item_number' => 1,
        'description' => 'FRONT AXLE BEARING',
        'item_control_no' => '2026110001-01',
    ]);
    $this->assertDatabaseHas('wmr_items', [
        'item_number' => 2,
        'description' => 'WIPER BLADE',
        'item_control_no' => '2026110001-02',
    ]);
});

it('renumbers WMR items when an existing record is edited', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('wmr-monitoring.store'), [
        'wmr_no' => '2026110002',
        'wmr_date' => '2026-11-10',
        'items' => [
            ['quantity' => '1', 'unit' => 'PC', 'description' => 'OLD ITEM'],
        ],
    ])->assertSessionHasNoErrors();

    $wmr = DB::table('wmr_monitoring')->where('wmr_no', '2026110002')->first();

    $response = $this->put(route('wmr-monitoring.update', $wmr->id), [
        'wmr_no' => '2026110003',
        'wmr_date' => '2026-11-10',
        'items' => [
            ['quantity' => '1', 'unit' => 'PC', 'description' => 'NEW ITEM'],
            ['quantity' => '1', 'unit' => 'PC', 'description' => 'SECOND ITEM'],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseCount('wmr_items', 2);
    $this->assertDatabaseHas('wmr_items', [
        'description' => 'NEW ITEM',
        'item_control_no' => '2026110003-01',
    ]);
    $this->assertDatabaseHas('wmr_items', [
        'description' => 'SECOND ITEM',
        'item_control_no' => '2026110003-02',
    ]);
    $this->assertDatabaseMissing('wmr_items', ['description' => 'OLD ITEM']);
});

it('provides browser-print and PDF versions of a WMR report', function () {
    $user = User::factory()->create(['name' => 'WMR Printer Account']);

    $this->actingAs($user)->post(route('wmr-monitoring.store'), [
        'wmr_no' => '2026110004',
        'wmr_date' => '2026-11-10',
        'supplier_id' => null,
        'brand_name' => 'MITSUBISHI',
        'items' => [
            ['quantity' => '1', 'unit' => 'PC', 'description' => 'FRONT AXLE BEARING'],
        ],
    ])->assertSessionHasNoErrors();

    $wmr = WmrMonitoring::query()->where('wmr_no', '2026110004')->firstOrFail();

    $this->get(route('wmr-monitoring.print-html', $wmr))
        ->assertOk()
        ->assertSee('UNIVERSITY OF SOUTHEASTERN PHILIPPINES')
        ->assertSee('FRONT AXLE BEARING')
        ->assertSee('2026110004-01')
        ->assertSee('usep-logo.png')
        ->assertSee('WMR Printer Account')
        ->assertSee('Staff, Supply Management Unit')
        ->assertSee('@page { size: A4 portrait;');

    $pdfResponse = $this->get(route('wmr-monitoring.print', $wmr));

    $pdfResponse
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    expect(str_starts_with($pdfResponse->getContent(), '%PDF-'))->toBeTrue();
});
