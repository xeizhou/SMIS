<?php

use App\Models\RrspMonitoring;
use App\Models\User;

it('deletes an rrsp record by rrsp number', function () {
    $user = User::factory()->create();

    $rrsp = RrspMonitoring::create([
        'rrsp_no' => 'RRSP-TEST-001',
        'date_received' => '2026-01-15',
        'item_description' => 'Test item',
        'quantity' => 2,
        'property_no' => 'PROP-001',
        'end_user_name' => 'Office A',
        'cost' => 100.50,
        'kind_of_semi_expendable' => 'Equipment',
        'status' => 'ACTIVE',
        'area' => 'Warehouse',
    ]);

    $response = $this->actingAs($user)->delete(route('rrsp-monitoring.destroy', ['rrsp' => $rrsp->rrsp_no]));

    $response->assertRedirect();
    $this->assertDatabaseMissing('rrsp_monitoring', ['id' => $rrsp->id]);
});
