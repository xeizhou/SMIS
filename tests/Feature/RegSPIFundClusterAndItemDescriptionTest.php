<?php

use App\Models\FundCluster;
use App\Models\RegspiMonitoring;
use App\Models\RrspMonitoring;
use App\Models\User;

it('stores a regspi record with the selected fund cluster and rrsp item description', function () {
    $user = User::factory()->create();

    FundCluster::create([
        'fund_cluster_id' => 'CL-001',
        'fund_description' => 'General Fund',
    ]);

    $rrsp = RrspMonitoring::create([
        'rrsp_no' => 'RRSP-1001',
        'date_received' => '2026-01-15',
        'item_description' => 'Laptop',
        'quantity' => 1,
        'property_no' => 'PROP-001',
        'end_user_name' => 'Office A',
        'cost' => 500.00,
        'kind_of_semi_expendable' => 'Equipment',
        'status' => 'ACTIVE',
        'area' => 'Warehouse',
    ]);

    $response = $this->actingAs($user)->post(route('regspi-monitoring.store'), [
        'month_year' => '2026-01',
        'ics_no' => 'ICS-001',
        'rrsp_no' => $rrsp->rrsp_no,
        'fund_cluster_id' => 'CL-001',
        'semi_expendable_property_no' => 'PROP-001',
        'item_description' => 'User entered text',
        'estimated_useful_life' => 3,
        'issued_qty' => 1,
        'returned_qty' => 0,
        'reissued_qty' => 0,
        'disposed_qty' => 0,
        'amount' => 500.00,
        'remarks' => 'Test',
    ]);

    $response->assertRedirect();

    $regspi = RegspiMonitoring::latest('regspi_id')->first();

    expect($regspi)->not->toBeNull();
    expect($regspi->fund_cluster_id)->toBe('CL-001');
    expect($regspi->item_description)->toBe($rrsp->item_description);
});
