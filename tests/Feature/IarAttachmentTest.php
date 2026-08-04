<?php

use App\Models\PirMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
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

    $response = $this->post("/iar/{$pir->po_number}/attachments", [
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
