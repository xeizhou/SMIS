<?php

use App\Models\PoInspectionEntry;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('pending inspection KPI counts purchase orders using integrated and legacy IAR data', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $supplier = Supplier::factory()->create();
    $createPo = fn (string $number, ?string $step = 'PO From VPAD') => ServePo::create([
        'po_number' => $number,
        'supplier_id' => $supplier->supplier_id,
        'po_step' => $step,
    ]);
    $addLegacyPir = function (ServePo $po, string $status, ?string $inspectionDate) use ($supplier) {
        DB::table('pir_monitoring')->insert([
            'supplier_id' => $supplier->supplier_id,
            'po_number' => $po->po_number,
            'unit_office' => 'Test Office',
            'status' => $status,
            'inspection_date' => $inspectionDate,
            'iar_number' => '12345',
            'invoice_number' => 'INV-12345',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    };

    $newPendingPo = $createPo('PO-NEW-PENDING');

    $newInspectedPo = $createPo('PO-NEW-INSPECTED');
    PoInspectionEntry::create([
        'po_number' => $newInspectedPo->po_number,
        'iar_number' => '22345',
        'inspection_date' => now()->toDateString(),
    ]);

    $legacyPendingPo = $createPo('PO-LEGACY-PENDING', null);
    $addLegacyPir($legacyPendingPo, 'ONGOING', null);

    $legacyInspectedPo = $createPo('PO-LEGACY-INSPECTED', null);
    $addLegacyPir($legacyInspectedPo, 'COMPLETED', now()->toDateString());

    $legacyCancelledPo = $createPo('PO-LEGACY-CANCELLED', null);
    $addLegacyPir($legacyCancelledPo, 'CANCELLED', null);

    $createPo('PO-CANCELLED', 'CANCELLED');

    $pendingNumbers = [$newPendingPo->po_number, $legacyPendingPo->po_number];

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('pendingInspections', count($pendingNumbers))
            ->where('allPendingInspections', function ($inspections) use ($pendingNumbers) {
                $actualNumbers = collect($inspections)
                    ->pluck('po_number')
                    ->sort()
                    ->values()
                    ->all();

                sort($pendingNumbers);

                return $actualNumbers === $pendingNumbers;
            }));
});
