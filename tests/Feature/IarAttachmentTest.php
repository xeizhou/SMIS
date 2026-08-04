<?php

use App\Models\PirMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('stores a PIR attachment and exposes a public URL', function () {
    Storage::fake('public');

    $supplier = Supplier::create([
        'supplier_name' => 'Test Supplier',
        'status' => 'active',
    ]);

    ServePo::create([
        'po_number' => 'PO-TEST-001',
        'supplier_id' => $supplier->supplier_id,
        'total_amount_abc' => 1000,
        'total_amount_po' => 1000,
        'total_amount_diff' => 0,
    ]);

    $pir = PirMonitoring::create([
        'supplier_id' => $supplier->supplier_id,
        'po_number' => 'PO-TEST-001',
        'unit_office' => 'Office A',
        'status' => 'COMPLETED',
    ]);

    $file = UploadedFile::fake()->create('report.pdf', 120, 'application/pdf');

    $response = $this->actingAs(User::factory()->create())->post("/iar/{$pir->pir_id}/attachments", [
        'files' => [$file],
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('attachments', [
        'attachable_type' => PirMonitoring::class,
        'attachable_id' => $pir->pir_id,
        'original_name' => 'report.pdf',
    ]);

    $attachment = $pir->fresh()->attachments()->latest()->first();
    expect($attachment)->not->toBeNull();
    expect($attachment->file_path)->not->toBeEmpty();
    expect($attachment->url)->toContain('/storage/');
    Storage::disk('public')->assertExists($attachment->file_path);
});

it('stores the new PIR notification fields', function () {
    $supplier = Supplier::create([
        'supplier_name' => 'Notification Supplier',
        'status' => 'active',
    ]);

    ServePo::create([
        'po_number' => 'PO-TEST-002',
        'supplier_id' => $supplier->supplier_id,
        'total_amount_abc' => 2000,
        'total_amount_po' => 2000,
        'total_amount_diff' => 0,
    ]);

    $pir = PirMonitoring::create([
        'supplier_id' => $supplier->supplier_id,
        'po_number' => 'PO-TEST-002',
        'unit_office' => 'Office B',
        'status' => 'COMPLETED',
        'po_vpad_notified_date' => '2024-05-01',
        'po_vpad_notified_via' => '09171234567',
        'coa_stamp_notified_date' => '2024-05-02',
        'coa_stamp_notified_via' => 'sample@smis.test',
        'receipt_claimed_notified_date' => '2024-05-03',
        'receipt_claimed_notified_via' => '09179876543',
    ]);

    $pir->refresh();

    expect($pir->po_vpad_notified_date->toDateString())->toBe('2024-05-01');
    expect($pir->po_vpad_notified_via)->toBe('09171234567');
    expect($pir->coa_stamp_notified_date->toDateString())->toBe('2024-05-02');
    expect($pir->coa_stamp_notified_via)->toBe('sample@smis.test');
    expect($pir->receipt_claimed_notified_date->toDateString())->toBe('2024-05-03');
    expect($pir->receipt_claimed_notified_via)->toBe('09179876543');
});

it('uploads attachments to a newly created PIR using its created id', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $supplier = Supplier::create([
        'supplier_name' => 'Attachment Supplier',
        'status' => 'active',
    ]);

    ServePo::create([
        'po_number' => 'PO-TEST-003',
        'supplier_id' => $supplier->supplier_id,
        'total_amount_abc' => 3000,
        'total_amount_po' => 3000,
        'total_amount_diff' => 0,
    ]);

    $response = $this->actingAs($user)->post(route('iar.store'), [
        'supplier_id' => $supplier->supplier_id,
        'po_number' => 'PO-TEST-003',
        'unit_office' => 'Office C',
        'status' => 'COMPLETED',
    ]);

    $response->assertRedirect();

    $createdPirId = session('createdPirId');
    expect($createdPirId)->not->toBeNull();

    $file = UploadedFile::fake()->create('pir-attachment.pdf', 120, 'application/pdf');

    $uploadResponse = $this->actingAs($user)->post("/iar/{$createdPirId}/attachments", [
        'files' => [$file],
    ]);

    $uploadResponse->assertRedirect();

    $pir = PirMonitoring::findOrFail($createdPirId);
    expect($pir->attachments()->count())->toBe(1);
    expect($pir->attachments()->first()->original_name)->toBe('pir-attachment.pdf');
});

it('stores multiple inspection rows for one PIR', function () {
    $supplier = Supplier::create([
        'supplier_name' => 'Inspection Supplier',
        'status' => 'active',
    ]);

    ServePo::create([
        'po_number' => 'PO-TEST-004',
        'supplier_id' => $supplier->supplier_id,
        'total_amount_abc' => 4000,
        'total_amount_po' => 4000,
        'total_amount_diff' => 0,
    ]);

    $response = $this->actingAs(User::factory()->create())->post(route('iar.store'), [
        'supplier_id' => $supplier->supplier_id,
        'po_number' => 'PO-TEST-004',
        'unit_office' => 'Office D',
        'status' => 'COMPLETED',
        'inspection_entries' => [
            [
                'iar_number' => 'IAR-1001',
                'inspected_by' => 'Inspector A',
                'inspection_date' => '2024-05-01',
            ],
            [
                'iar_number' => 'IAR-1002',
                'inspected_by' => 'Inspector B',
                'inspection_date' => '2024-05-02',
            ],
        ],
    ]);

    $response->assertRedirect();

    $createdPirId = session('createdPirId');
    $pir = PirMonitoring::findOrFail($createdPirId);

    expect($pir->inspectionEntries()->count())->toBe(2);
    expect($pir->inspectionEntries()->where('iar_number', 'IAR-1001')->exists())->toBeTrue();
    expect($pir->inspectionEntries()->where('inspected_by', 'Inspector B')->exists())->toBeTrue();
});
