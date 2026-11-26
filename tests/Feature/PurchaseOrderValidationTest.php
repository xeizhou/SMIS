<?php

use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\User;

it('allows storing a purchase order when PR date is on or before PO and ORS date', function () {
    $user = User::factory()->create();

    $supplier = Supplier::create([
        'supplier_name' => 'Validation Test Supplier',
        'contact_number' => '1234567890',
        'email_address' => 'valsupplier@example.com',
        'status' => 'active',
    ]);

    // Valid: PR Date = Oct 1, PO Date = Oct 5, ORS Date = Oct 5
    $response = $this->actingAs($user)->post('/purchase-orders', [
        'po_number' => '2026-10-0001',
        'pr_number' => '2026-10-0001',
        'pr_date' => '2026-10-01',
        'po_date' => '2026-10-05',
        'ors_burs_date' => '2026-10-05',
        'supplier_id' => $supplier->supplier_id,
    ]);

    $response->assertSessionHasNoErrors();
    expect(ServePo::where('po_number', '2026-10-0001')->exists())->toBeTrue();
});

it('blocks storing a purchase order when PR date is later than PO date', function () {
    $user = User::factory()->create();

    // Invalid: PR Date = Oct 10, PO Date = Oct 5
    $response = $this->actingAs($user)->from('/purchase-orders')->post('/purchase-orders', [
        'po_number' => '2026-10-0002',
        'pr_number' => '2026-10-0002',
        'pr_date' => '2026-10-10',
        'po_date' => '2026-10-05',
        'ors_burs_date' => '2026-10-12',
    ]);

    $response->assertSessionHasErrors(['pr_date']);
    expect(ServePo::where('po_number', '2026-10-0002')->exists())->toBeFalse();
});

it('blocks storing a purchase order when PR date is later than ORS date', function () {
    $user = User::factory()->create();

    // Invalid: PR Date = Oct 10, ORS Date = Oct 5
    $response = $this->actingAs($user)->from('/purchase-orders')->post('/purchase-orders', [
        'po_number' => '2026-10-0003',
        'pr_number' => '2026-10-0003',
        'pr_date' => '2026-10-10',
        'po_date' => '2026-10-15',
        'ors_burs_date' => '2026-10-05',
    ]);

    $response->assertSessionHasErrors(['pr_date']);
    expect(ServePo::where('po_number', '2026-10-0003')->exists())->toBeFalse();
});

it('blocks updating a purchase order when PR date is set later than PO date', function () {
    $user = User::factory()->create();

    $po = ServePo::create([
        'po_number' => '2026-10-0004',
        'pr_number' => '2026-10-0004',
        'pr_date' => '2026-10-01',
        'po_date' => '2026-10-05',
        'ors_burs_date' => '2026-10-05',
    ]);

    $response = $this->actingAs($user)->put('/purchase-orders/' . $po->po_number, [
        'po_number' => '2026-10-0004',
        'pr_date' => '2026-10-10',
        'po_date' => '2026-10-05',
    ]);

    $response->assertSessionHasErrors(['pr_date']);
});
