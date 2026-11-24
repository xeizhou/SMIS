<?php

use App\Models\Delivery;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\User;

it('stores and updates a delivery record linked to a purchase order', function () {
    $user = User::factory()->create();

    $supplier = Supplier::create([
        'supplier_name' => 'Test Supplier',
        'contact_number' => '1234',
        'email_address' => 'supplier@example.com',
        'status' => 'active',
    ]);

    ServePo::create([
        'po_number' => 'PO-1001',
        'po_date' => '2026-01-15',
        'po_received_date' => '2026-01-16',
        'due_date' => '2026-01-30',
        'total_amount_po' => 5000.00,
        'supplier_id' => $supplier->supplier_id,
    ]);

    $response = $this->actingAs($user)->post(route('deliveries.store'), [
        'po_number' => 'PO-1001',
        'supplier_id' => $supplier->supplier_id,
        'delivery_date' => '2026-01-20',
        'po_date_received' => '2026-01-16',
        'delivery_term' => 14,
        'due_date' => '2026-01-30',
        'no_of_days_ld' => 0,
        'received_by_1' => 'Alvin',
        'received_by_2' => 'Bacalso',
        'end_user' => 'Office A',
        'place_of_delivery' => 'GHQ',
        'status' => 'PARTIAL',
        'remarks' => 'Partial delivery',
        'total_amount_delivered' => 2500.00,
        'po_total_amount' => 5000.00,
        'folder_link' => 'https://example.com/folder',
    ]);

    $response->assertRedirect();

    $delivery = Delivery::latest('delivery_id')->first();

    expect($delivery)->not->toBeNull();
    expect($delivery->po_number)->toBe('PO-1001');
    expect($delivery->supplier_id)->toBe($supplier->supplier_id);

    $updateResponse = $this->actingAs($user)->put(route('deliveries.update', $delivery), [
        'po_number' => 'PO-1001',
        'supplier_id' => $supplier->supplier_id,
        'delivery_date' => '2026-01-22',
        'po_date_received' => '2026-01-16',
        'delivery_term' => 14,
        'due_date' => '2026-01-30',
        'no_of_days_ld' => 0,
        'received_by_1' => 'Alvin',
        'received_by_2' => 'Bacalso',
        'end_user' => 'Office A',
        'place_of_delivery' => 'GHQ',
        'status' => 'COMPLETED',
        'remarks' => 'Completed delivery',
        'total_amount_delivered' => 5000.00,
        'po_total_amount' => 5000.00,
        'folder_link' => 'https://example.com/folder',
    ]);

    $updateResponse->assertRedirect();

    $delivery->refresh();
    expect($delivery->status)->toBe('COMPLETE');
    expect($delivery->remarks)->toBe('Completed delivery');
});

it('marks a delivery complete when cumulative delivered amounts reach the PO total', function () {
    $user = User::factory()->create();
    $po = ServePo::create([
        'po_number' => 'PO-2002',
        'total_amount_po' => 1000,
    ]);

    $firstResponse = $this->actingAs($user)->post(route('deliveries.store'), [
        'po_number' => $po->po_number,
        'delivery_dates' => ['2026-03-01'],
        'total_amount_delivered' => 600,
    ]);
    $firstResponse->assertRedirect();

    $firstDelivery = Delivery::where('po_number', $po->po_number)->firstOrFail();
    expect($firstDelivery->status)->toBe('PARTIAL');
    expect($po->fresh()->date_completed)->toBeNull();

    $secondResponse = $this->actingAs($user)->post(route('deliveries.store'), [
        'po_number' => $po->po_number,
        'delivery_dates' => ['2026-03-02'],
        'total_amount_delivered' => 400,
    ]);
    $secondResponse->assertRedirect();

    $secondDelivery = Delivery::where('po_number', $po->po_number)
        ->where('delivery_id', '<>', $firstDelivery->delivery_id)
        ->firstOrFail();

    expect($secondDelivery->status)->toBe('COMPLETE')
        ->and($po->fresh()->date_completed?->format('Y-m-d'))->toBe(today()->toDateString());
});

it('locks the PO invoice until deliveries are complete and requires it for multiple deliveries', function () {
    $user = User::factory()->create();
    $po = ServePo::create([
        'po_number' => '2026-2003',
        'total_amount_po' => 1000,
    ]);

    $this->actingAs($user)->post(route('deliveries.store'), [
        'po_number' => $po->po_number,
        'delivery_dates' => ['2026-03-01'],
        'total_amount_delivered' => 600,
    ])->assertRedirect();

    $this->actingAs($user)->put(route('purchase-orders.update', $po), [
        'po_number' => $po->po_number,
        'workflow_step' => 'Payment Processing',
        'invoice_number' => 'INV-001',
    ])->assertSessionHasErrors('invoice_number');

    $this->actingAs($user)->post(route('deliveries.store'), [
        'po_number' => $po->po_number,
        'delivery_dates' => ['2026-03-02'],
        'total_amount_delivered' => 400,
    ])->assertRedirect();

    $this->actingAs($user)->put(route('purchase-orders.update', $po), [
        'po_number' => $po->po_number,
        'workflow_step' => 'Payment Processing',
        'invoice_number' => '',
    ])->assertSessionHasErrors('invoice_number');

    $this->actingAs($user)->put(route('purchase-orders.update', $po), [
        'po_number' => $po->po_number,
        'workflow_step' => 'Payment Processing',
        'invoice_number' => 'INV-001',
    ])->assertRedirect()->assertSessionHasNoErrors();
});

it('generates the PO delivery receipt reference from the PO number', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('purchase-orders.store'), [
        'po_number' => '2026-3001',
    ])->assertRedirect();

    expect(ServePo::findOrFail('2026-3001')->delivery_receipt)->toBe('DR-2026-3001-001');
});
